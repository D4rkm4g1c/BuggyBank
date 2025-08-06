const express = require('express');
const session = require('express-session');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: null,
  database: 'buggybank'
});

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// VULNERABILITY: Session configuration without security flags
app.use(session({
  secret: 'buggybank-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    // VULNERABILITY: No HttpOnly, Secure, or SameSite flags
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // VULNERABILITY: No file type validation, accepts any file
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// Helper function to render HTML templates
function renderTemplate(template, data = {}) {
  const html = fs.readFileSync(`views/${template}.html`, 'utf8');
  return html.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || '');
}

// Authentication middleware (vulnerable)
function requireAuth(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Routes

// GET /login - Login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// POST /login - VULNERABILITY: SQL Injection
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // VULNERABILITY: SQL Injection - direct string concatenation
  const query = `SELECT * FROM users WHERE username = '${username}' AND password_hash = '${password}'`;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.redirect('/login?error=database');
    }
    
    if (results.length > 0) {
      // VULNERABILITY: Session fixation - no session regeneration
      req.session.userId = results[0].id;
      req.session.username = results[0].username;
      req.session.role = results[0].role;
      res.redirect('/dashboard');
    } else {
      res.redirect('/login?error=invalid');
    }
  });
});

// GET /logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// GET /dashboard
app.get('/dashboard', requireAuth, (req, res) => {
  const userId = req.session.userId;
  
  // Get user info and balance
  const userQuery = `SELECT * FROM users WHERE id = ${userId}`;
  const transactionQuery = `SELECT * FROM transactions WHERE user_id = ${userId} ORDER BY timestamp DESC LIMIT 5`;
  
  db.query(userQuery, (err, userResults) => {
    if (err || userResults.length === 0) {
      return res.redirect('/login');
    }
    
    db.query(transactionQuery, (err, transactionResults) => {
      const user = userResults[0];
      const balance = transactionResults.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const dashboardHtml = renderTemplate('dashboard', {
        username: user.username,
        fullname: user.fullname,
        balance: balance.toFixed(2),
        transactions: transactionResults.map(t => `
          <tr>
            <td><a href="/transactions/${t.id}">${t.id}</a></td>
            <td>${t.to_account}</td>
            <td>$${t.amount}</td>
            <td>${new Date(t.timestamp).toLocaleDateString()}</td>
          </tr>
        `).join('')
      });
      
      res.send(dashboardHtml);
    });
  });
});

// GET /profile - VULNERABILITY: DOM XSS
app.get('/profile', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const query = `SELECT * FROM users WHERE id = ${userId}`;
  
  db.query(query, (err, results) => {
    if (err || results.length === 0) {
      return res.redirect('/dashboard');
    }
    
    const user = results[0];
    const profileHtml = renderTemplate('profile', {
      username: user.username,
      fullname: user.fullname,
      email: user.email,
      bio: user.bio || ''
    });
    
    res.send(profileHtml);
  });
});

// POST /profile/update - VULNERABILITY: Stored XSS
app.post('/profile/update', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { fullname, bio } = req.body;
  
  // VULNERABILITY: No input sanitization
  const query = `UPDATE users SET fullname = '${fullname}', bio = '${bio}' WHERE id = ${userId}`;
  
  db.query(query, (err) => {
    if (err) {
      console.error('Update error:', err);
    }
    res.redirect('/profile');
  });
});

// GET /transactions
app.get('/transactions', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const query = `SELECT * FROM transactions WHERE user_id = ${userId} ORDER BY timestamp DESC`;
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    
    const transactionsHtml = renderTemplate('transactions', {
      transactions: results.map(t => `
        <tr>
          <td><a href="/transactions/${t.id}">${t.id}</a></td>
          <td>${t.to_account}</td>
          <td>$${t.amount}</td>
          <td>${new Date(t.timestamp).toLocaleDateString()}</td>
          <td>${t.note || ''}</td>
        </tr>
      `).join('')
    });
    
    res.send(transactionsHtml);
  });
});

// GET /transactions/:id - VULNERABILITY: IDOR
app.get('/transactions/:id', requireAuth, (req, res) => {
  const transactionId = req.params.id;
  
  // VULNERABILITY: IDOR - No check if transaction belongs to current user
  const query = `SELECT * FROM transactions WHERE id = ${transactionId}`;
  
  db.query(query, (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).send('Transaction not found');
    }
    
    const transaction = results[0];
    const transactionHtml = renderTemplate('transaction-detail', {
      id: transaction.id,
      to_account: transaction.to_account,
      amount: transaction.amount,
      timestamp: new Date(transaction.timestamp).toLocaleString(),
      note: transaction.note || ''
    });
    
    res.send(transactionHtml);
  });
});

// GET /transfer
app.get('/transfer', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'transfer.html'));
});

// POST /transfer - VULNERABILITY: Stored XSS, No CSRF protection
app.post('/transfer', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { to_account, amount, note } = req.body;
  
  // VULNERABILITY: No input validation or sanitization
  const query = `INSERT INTO transactions (user_id, to_account, amount, note, timestamp) 
                 VALUES (${userId}, '${to_account}', ${amount}, '${note}', NOW())`;
  
  db.query(query, (err) => {
    if (err) {
      console.error('Transfer error:', err);
      return res.redirect('/transfer?error=transfer');
    }
    
    // Log audit
    const auditQuery = `INSERT INTO audit_logs (user_id, action, timestamp) 
                       VALUES (${userId}, 'transfer', NOW())`;
    db.query(auditQuery);
    
    res.redirect('/transactions');
  });
});

// GET /support/messages - VULNERABILITY: Stored XSS
app.get('/support/messages', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const query = `SELECT * FROM support_messages WHERE user_id = ${userId} ORDER BY created_at DESC`;
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    
    const messagesHtml = renderTemplate('support-messages', {
      messages: results.map(m => `
        <div class="message">
          <p><strong>Date:</strong> ${new Date(m.created_at).toLocaleString()}</p>
          <p><strong>Message:</strong></p>
          <div class="message-content">
            ${m.message}
          </div>
        </div>
      `).join('')
    });
    
    res.send(messagesHtml);
  });
});

// POST /support/messages - VULNERABILITY: Stored XSS
app.post('/support/messages', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { message } = req.body;
  
  // VULNERABILITY: No input sanitization
  const query = `INSERT INTO support_messages (user_id, message, created_at) 
                 VALUES (${userId}, '${message}', NOW())`;
  
  db.query(query, (err) => {
    if (err) {
      console.error('Message error:', err);
    }
    res.redirect('/support/messages');
  });
});

// GET /upload-document
app.get('/upload-document', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});

// POST /upload-document - VULNERABILITY: File upload without validation
app.post('/upload-document', requireAuth, upload.single('document'), (req, res) => {
  const userId = req.session.userId;
  const filename = req.file.originalname;
  const filepath = req.file.path;
  
  // VULNERABILITY: No file type validation
  const query = `INSERT INTO uploaded_files (user_id, filename, filepath, upload_time) 
                 VALUES (${userId}, '${filename}', '${filepath}', NOW())`;
  
  db.query(query, (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.redirect('/upload-document?error=upload');
    }
    
    res.redirect('/upload-document?success=true');
  });
});

// GET /documents/:filename - VULNERABILITY: Direct file access
app.get('/documents/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, 'uploads', filename);
  
  // VULNERABILITY: No path traversal protection
  if (fs.existsSync(filepath)) {
    res.sendFile(filepath);
  } else {
    res.status(404).send('File not found');
  }
});

// GET /help - VULNERABILITY: LFI/RFI
app.get('/help', (req, res) => {
  const topic = req.query.topic || 'welcome';
  
  // VULNERABILITY: Local File Inclusion / Remote File Inclusion
  if (topic.startsWith('http://') || topic.startsWith('https://')) {
    // RFI - fetch remote content
    const https = require('https');
    const http = require('http');
    const url = require('url');
    
    const parsedUrl = url.parse(topic);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    client.get(topic, (response) => {
      let data = '';
      response.on('data', (chunk) => data += chunk);
      response.on('end', () => {
        res.send(renderTemplate('help', { content: data }));
      });
    }).on('error', () => {
      res.send(renderTemplate('help', { content: 'Error loading remote content' }));
    });
  } else {
    // LFI - read local file
    const filepath = path.join(__dirname, 'help', topic + '.txt');
    
    // VULNERABILITY: No path traversal protection
    if (fs.existsSync(filepath)) {
      const content = fs.readFileSync(filepath, 'utf8');
      res.send(renderTemplate('help', { content }));
    } else {
      res.send(renderTemplate('help', { content: 'Help topic not found' }));
    }
  }
});

// VULNERABILITY: Hidden admin endpoints - Forced Browsing
// GET /api/v1/transactions/export - No authentication
app.get('/api/v1/transactions/export', (req, res) => {
  const query = 'SELECT * FROM transactions ORDER BY timestamp DESC';
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json(results);
  });
});

// GET /api/v1/users/list - No authentication
app.get('/api/v1/users/list', (req, res) => {
  const query = 'SELECT id, username, fullname, email, role FROM users';
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json(results);
  });
});

// GET /admin/reports - No authentication
app.get('/admin/reports', (req, res) => {
  const query = `
    SELECT 
      u.username,
      COUNT(t.id) as transaction_count,
      SUM(t.amount) as total_amount
    FROM users u
    LEFT JOIN transactions t ON u.id = t.user_id
    GROUP BY u.id, u.username
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    
    const reportsHtml = renderTemplate('admin-reports', {
      reports: results.map(r => `
        <tr>
          <td>${r.username}</td>
          <td>${r.transaction_count}</td>
          <td>$${r.total_amount || 0}</td>
        </tr>
      `).join('')
    });
    
    res.send(reportsHtml);
  });
});

// GET /admin/user-audit - No authentication
app.get('/admin/user-audit', (req, res) => {
  const query = `
    SELECT 
      u.username,
      a.action,
      a.timestamp
    FROM audit_logs a
    JOIN users u ON a.user_id = u.id
    ORDER BY a.timestamp DESC
    LIMIT 50
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    
    const auditHtml = renderTemplate('admin-audit', {
      logs: results.map(r => `
        <tr>
          <td>${r.username}</td>
          <td>${r.action}</td>
          <td>${new Date(r.timestamp).toLocaleString()}</td>
        </tr>
      `).join('')
    });
    
    res.send(auditHtml);
  });
});

// Admin bot simulation - VULNERABILITY: Stored XSS exploitation
setInterval(() => {
  const query = 'SELECT * FROM support_messages ORDER BY created_at DESC LIMIT 5';
  
  db.query(query, (err, results) => {
    if (err || results.length === 0) return;
    
    results.forEach(message => {
      // Simulate admin bot "reading" messages (executing XSS)
      console.log(`[ADMIN BOT] Processing message from user ${message.user_id}: ${message.message.substring(0, 100)}...`);
      
      // In a real scenario, this would execute any JavaScript in the message
      // and potentially send cookies to an attacker's server
    });
  });
}, 60000); // Every minute

// Start server
app.listen(PORT, () => {
  console.log(`BuggyBank server running on http://localhost:${PORT}`);
  console.log('⚠️  WARNING: This application contains intentional security vulnerabilities for training purposes!');
}); 