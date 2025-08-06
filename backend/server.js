const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const http = require('http');

const Logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const transactionRoutes = require('./routes/transactions');
const budgetRoutes = require('./routes/budgets');
const adminRoutes = require('./routes/admin');
const fileRoutes = require('./routes/files');

const app = express();
const server = http.createServer(app);

// Initialize database on startup
require('./database/init');

// VULNERABILITY: Permissive CORS configuration
app.use(cors({
  origin: true, // Allow any origin
  credentials: true, // Allow credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['*'] // Allow any headers
}));

app.use(express.json({ limit: '10mb' })); // Large limit for potential DoS
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// VULNERABILITY: Serve static files without authentication
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Log all requests with sensitive data (vulnerability)
app.use((req, res, next) => {
  Logger.info(`${req.method} ${req.path}`, {
    headers: req.headers, // VULNERABILITY: Log all headers including Authorization
    body: req.body,       // VULNERABILITY: Log request bodies
    query: req.query,     // VULNERABILITY: Log query parameters
    ip: req.ip
  });
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/files', fileRoutes);

// VULNERABILITY: Local File Inclusion endpoint
app.get('/api/view-log', (req, res) => {
  const { file } = req.query;
  
  if (!file) {
    return res.status(400).json({ error: 'File parameter required' });
  }
  
  // VULNERABILITY: No path sanitization - allows directory traversal
  const filePath = path.join(__dirname, 'logs', file);
  
  try {
    // VULNERABILITY: Direct file read without validation
    const content = fs.readFileSync(filePath, 'utf8');
    res.type('text/plain').send(content);
    
    Logger.info('File accessed via LFI', { file, filePath, success: true });
  } catch (error) {
    Logger.error('LFI attempt failed', { file, filePath, error: error.message });
    res.status(500).json({ error: `Could not read file: ${error.message}` });
  }
});

// VULNERABILITY: Remote File Inclusion endpoint
app.get('/api/import-statement', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter required' });
  }
  
  try {
    // VULNERABILITY: Fetch arbitrary URLs without validation
    const axios = require('axios');
    const response = await axios.get(url, {
      timeout: 5000,
      maxContentLength: 10 * 1024 * 1024 // 10MB limit
    });
    
    Logger.info('RFI request processed', { url, success: true });
    res.type('text/plain').send(response.data);
  } catch (error) {
    Logger.error('RFI attempt failed', { url, error: error.message });
    res.status(500).json({ error: `Could not fetch URL: ${error.message}` });
  }
});

// VULNERABILITY: Reflected XSS in search endpoint
app.get('/api/search-transactions', (req, res) => {
  const { query } = req.query;
  
  if (!query) {
    // VULNERABILITY: Reflect user input without sanitization
    return res.send(`
      <html>
        <body>
          <h1>Transaction Search</h1>
          <p>No search query provided. Please provide a query parameter.</p>
          <p>Example: /api/search-transactions?query=payment</p>
        </body>
      </html>
    `);
  }
  
  // VULNERABILITY: Reflect search query in HTML response without encoding
  res.send(`
    <html>
      <body>
        <h1>Transaction Search Results</h1>
        <p>Search query: ${query}</p>
        <p>Results would be displayed here...</p>
        <script>
          // VULNERABILITY: User input directly in script context
          var searchQuery = "${query}";
          console.log("Searching for: " + searchQuery);
        </script>
      </body>
    </html>
  `);
  
  Logger.info('Search performed with potential XSS', { query });
});

// VULNERABILITY: Database reset endpoint with weak authentication
app.post('/api/reset-database', (req, res) => {
  const { secret } = req.body;
  
  // VULNERABILITY: Weak secret for database reset
  if (secret !== 'reset123') {
    return res.status(403).json({ error: 'Invalid secret' });
  }
  
  try {
    // Re-initialize and seed database
    require('./database/init');
    setTimeout(() => {
      require('./database/seed');
      Logger.info('Database reset performed', { ip: req.ip });
      res.json({ message: 'Database reset successfully' });
    }, 1000);
  } catch (error) {
    Logger.error('Database reset failed', { error: error.message });
    res.status(500).json({ error: 'Reset failed' });
  }
});

// WebSocket server for real-time messaging with XSS vulnerabilities
const wss = new WebSocket.Server({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  Logger.info('WebSocket connection established', { ip: req.socket.remoteAddress });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      // VULNERABILITY: No authentication check for WebSocket
      // VULNERABILITY: Store message without sanitization
      const sqlite3 = require('sqlite3').verbose();
      const db = new sqlite3.Database('./buggybank.db');
      
      db.run(
        'INSERT INTO messages (fromUserId, content, type) VALUES (?, ?, ?)',
        [message.userId || null, message.content, message.type || 'user'],
        function(err) {
          if (err) {
            Logger.error('WebSocket message storage failed', { error: err.message });
          } else {
            // Broadcast to all connected clients (vulnerability: no filtering)
            const broadcastData = JSON.stringify({
              id: this.lastID,
              fromUserId: message.userId,
              content: message.content, // VULNERABILITY: Broadcasting unsanitized content
              type: message.type || 'user',
              timestamp: new Date().toISOString()
            });
            
            wss.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(broadcastData);
              }
            });
            
            Logger.info('WebSocket message broadcasted', { messageId: this.lastID });
          }
        }
      );
      
      db.close();
    } catch (error) {
      Logger.error('WebSocket message processing failed', { error: error.message });
    }
  });
  
  ws.on('close', () => {
    Logger.info('WebSocket connection closed');
  });
});

// Error handling middleware that exposes sensitive information
app.use((error, req, res, next) => {
  Logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body
    }
  });
  
  // VULNERABILITY: Expose detailed error information
  res.status(500).json({
    error: error.message,
    stack: error.stack, // VULNERABILITY: Expose stack trace
    request: {
      method: req.method,
      url: req.url,
      body: req.body
    }
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`BuggyBank server running on port ${PORT}`);
  console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);
  Logger.info('BuggyBank server started', { port: PORT });
});

// Graceful shutdown
process.on('SIGINT', () => {
  Logger.info('Server shutting down');
  server.close(() => {
    process.exit(0);
  });
}); 