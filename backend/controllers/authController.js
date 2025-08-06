const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Logger = require('../utils/logger');

const JWT_SECRET = 'buggybank-secret-key'; // VULNERABILITY: Weak, hardcoded secret
const DB_PATH = './buggybank.db';

/**
 * Authentication Controller with multiple vulnerabilities:
 * - SQL Injection in login
 * - Plaintext password storage
 * - Weak JWT secret
 * - Session fixation
 * - Information disclosure through error messages
 */

const authController = {
  register: (req, res) => {
    const { username, password, displayName, email } = req.body;
    
    // VULNERABILITY: No input validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    const db = new sqlite3.Database(DB_PATH);
    
    // VULNERABILITY: Store password in plaintext
    const query = `INSERT INTO users (username, password, displayName, email) VALUES (?, ?, ?, ?)`;
    
    db.run(query, [username, password, displayName || username, email], function(err) {
      if (err) {
        Logger.error('Registration failed', { username, error: err.message });
        
        // VULNERABILITY: Expose detailed database errors
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ 
            error: 'Username already exists',
            details: err.message // VULNERABILITY: Expose SQL error details
          });
        }
        
        return res.status(500).json({ 
          error: 'Registration failed',
          details: err.message // VULNERABILITY: Expose SQL error details
        });
      }
      
      const userId = this.lastID;
      
      // VULNERABILITY: Predictable session ID
      const sessionId = `session_${userId}_${Date.now()}`;
      
      // Update user with session ID
      db.run('UPDATE users SET sessionId = ? WHERE id = ?', [sessionId, userId], (updateErr) => {
        if (updateErr) {
          Logger.error('Session creation failed', { userId, error: updateErr.message });
        }
        
        // Create JWT token with user data
        const token = jwt.sign(
          { 
            userId, 
            username, 
            role: 'user',
            sessionId 
          }, 
          JWT_SECRET,
          { expiresIn: '24h' } // VULNERABILITY: Long expiration
        );
        
        // VULNERABILITY: Set cookie without HttpOnly or Secure flags
        res.cookie('authToken', token, {
          httpOnly: false, // VULNERABILITY: Accessible via JavaScript
          secure: false,   // VULNERABILITY: Not HTTPS only
          sameSite: 'none' // VULNERABILITY: Allow cross-site requests
        });
        
        Logger.info('User registered successfully', { userId, username, sessionId });
        
        res.status(201).json({
          message: 'Registration successful',
          user: {
            id: userId,
            username,
            displayName: displayName || username,
            email,
            role: 'user',
            balance: 1000.0
          },
          token,
          sessionId
        });
        
        db.close();
      });
    });
  },

  // VULNERABILITY: SQL Injection in login
  login: (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    // VULNERABILITY: Log plaintext passwords
    Logger.logAuthAttempt(username, password, false, req.headers);
    
    const db = new sqlite3.Database(DB_PATH);
    
    // VULNERABILITY: Direct string interpolation - SQL injection
    const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
    
    Logger.info('Login attempt with vulnerable query', { username, query });
    
    db.get(query, (err, user) => {
      if (err) {
        Logger.error('Login query failed', { username, error: err.message, query });
        
        // VULNERABILITY: Expose SQL errors to user (error-based SQLi)
        return res.status(500).json({ 
          error: 'Database error during login',
          sqlError: err.message,
          query: query
        });
      }
      
      if (!user) {
        Logger.logAuthAttempt(username, password, false, req.headers);
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Generate new session ID
      const sessionId = `session_${user.id}_${Date.now()}`;
      
      // Update session ID in database
      db.run('UPDATE users SET sessionId = ? WHERE id = ?', [sessionId, user.id], (updateErr) => {
        if (updateErr) {
          Logger.error('Session update failed', { userId: user.id, error: updateErr.message });
        }
        
        // Create JWT token
        const token = jwt.sign(
          { 
            userId: user.id, 
            username: user.username, 
            role: user.role,
            sessionId 
          }, 
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        
        // VULNERABILITY: Set insecure cookie
        res.cookie('authToken', token, {
          httpOnly: false,
          secure: false,
          sameSite: 'none'
        });
        
        Logger.logAuthAttempt(username, password, true, req.headers);
        
        res.json({
          message: 'Login successful',
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            email: user.email,
            role: user.role,
            balance: user.balance
          },
          token,
          sessionId
        });
        
        db.close();
      });
    });
  },

  logout: (req, res) => {
    // VULNERABILITY: Don't invalidate session on server side
    res.clearCookie('authToken');
    
    Logger.info('User logged out (session not invalidated)', { 
      userId: req.user?.userId,
      sessionId: req.user?.sessionId 
    });
    
    res.json({ message: 'Logged out successfully' });
  },

  verify: (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.authToken;
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      const db = new sqlite3.Database(DB_PATH);
      
      // Get current user data
      db.get('SELECT * FROM users WHERE id = ?', [decoded.userId], (err, user) => {
        if (err || !user) {
          return res.status(401).json({ error: 'User not found' });
        }
        
        res.json({
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            email: user.email,
            role: user.role,
            balance: user.balance
          }
        });
        
        db.close();
      });
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  }
};

module.exports = authController; 