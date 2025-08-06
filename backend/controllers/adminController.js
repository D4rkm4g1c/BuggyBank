const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const os = require('os');
const Logger = require('../utils/logger');

const DB_PATH = './buggybank.db';

const adminController = {
  // VULNERABILITY: No role-based authorization - any authenticated user can access
  getAllUsers: (req, res) => {
    // VULNERABILITY: Missing admin role check
    const db = new sqlite3.Database(DB_PATH);
    
    const query = `
      SELECT u.*, 
             COUNT(t.id) as transactionCount,
             SUM(CASE WHEN t.fromUserId = u.id THEN t.amount ELSE 0 END) as totalSent,
             SUM(CASE WHEN t.toUserId = u.id THEN t.amount ELSE 0 END) as totalReceived
      FROM users u
      LEFT JOIN transactions t ON (t.fromUserId = u.id OR t.toUserId = u.id)
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `;
    
    Logger.info('Admin user list accessed', { 
      requestedBy: req.user.userId, 
      requestedByRole: req.user.role 
    });
    
    db.all(query, (err, users) => {
      if (err) {
        Logger.error('Admin user query failed', { error: err.message });
        return res.status(500).json({ error: 'Database error' });
      }
      
      // VULNERABILITY: Return all user data including passwords and sessions
      res.json({ users });
      db.close();
    });
  },

  // VULNERABILITY: No authentication at all - public endpoint
  getUserDetails: (req, res) => {
    const { id } = req.params;
    
    const db = new sqlite3.Database(DB_PATH);
    
    const query = `
      SELECT u.*,
             GROUP_CONCAT(c.content, '|||') as comments,
             GROUP_CONCAT(up.filename, '|||') as uploadedFiles
      FROM users u
      LEFT JOIN comments c ON c.userId = u.id
      LEFT JOIN uploads up ON up.userId = u.id
      WHERE u.id = ?
      GROUP BY u.id
    `;
    
    Logger.info('Admin user details accessed without auth', { requestedUserId: id });
    
    db.get(query, [id], (err, user) => {
      if (err) {
        Logger.error('Admin user details query failed', { id, error: err.message });
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Parse concatenated data
      user.comments = user.comments ? user.comments.split('|||') : [];
      user.uploadedFiles = user.uploadedFiles ? user.uploadedFiles.split('|||') : [];
      
      res.json({ user });
      db.close();
    });
  },

  updateUserRole: (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    
    // VULNERABILITY: Weak role check - only checks if user is authenticated, not if admin
    if (!['user', 'staff', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    const db = new sqlite3.Database(DB_PATH);
    
    Logger.info('Role update attempt', { 
      targetUserId: id, 
      newRole: role, 
      requestedBy: req.user.userId,
      requestedByRole: req.user.role
    });
    
    db.run('UPDATE users SET role = ? WHERE id = ?', [role, id], function(err) {
      if (err) {
        Logger.error('Role update failed', { id, role, error: err.message });
        return res.status(500).json({ error: 'Update failed' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      Logger.info('User role updated', { userId: id, newRole: role });
      res.json({ message: 'Role updated successfully' });
      
      db.close();
    });
  },

  getAllTransactions: (req, res) => {
    // VULNERABILITY: No admin role verification
    const db = new sqlite3.Database(DB_PATH);
    
    const query = `
      SELECT t.*, 
             u1.username as fromUsername, u1.displayName as fromDisplayName,
             u2.username as toUsername, u2.displayName as toDisplayName
      FROM transactions t
      LEFT JOIN users u1 ON t.fromUserId = u1.id
      LEFT JOIN users u2 ON t.toUserId = u2.id
      ORDER BY t.created_at DESC
      LIMIT 1000
    `;
    
    Logger.info('Admin transaction list accessed', { 
      requestedBy: req.user.userId, 
      requestedByRole: req.user.role 
    });
    
    db.all(query, (err, transactions) => {
      if (err) {
        Logger.error('Admin transaction query failed', { error: err.message });
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({ transactions });
      db.close();
    });
  },

  // VULNERABILITY: No authentication required for sensitive comments (XSS review endpoint)
  getComments: (req, res) => {
    const db = new sqlite3.Database(DB_PATH);
    
    const query = `
      SELECT c.*, u.username, u.displayName, u.role
      FROM comments c
      JOIN users u ON c.userId = u.id
      ORDER BY c.created_at DESC
    `;
    
    Logger.info('Comments accessed for XSS review', { endpoint: 'public' });
    
    db.all(query, (err, comments) => {
      if (err) {
        Logger.error('Comments query failed', { error: err.message });
        return res.status(500).json({ error: 'Database error' });
      }
      
      // VULNERABILITY: Return comments with XSS payloads
      res.json({ comments });
      db.close();
    });
  },

  reviewComment: (req, res) => {
    const { id } = req.params;
    
    const db = new sqlite3.Database(DB_PATH);
    
    db.run('UPDATE comments SET isReviewed = 1 WHERE id = ?', [id], function(err) {
      if (err) {
        Logger.error('Comment review failed', { commentId: id, error: err.message });
        return res.status(500).json({ error: 'Review failed' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Comment not found' });
      }
      
      Logger.info('Comment reviewed', { commentId: id });
      res.json({ message: 'Comment reviewed successfully' });
      
      db.close();
    });
  },

  getSystemInfo: (req, res) => {
    // VULNERABILITY: Expose sensitive system information
    const systemInfo = {
      platform: os.platform(),
      architecture: os.arch(),
      cpus: os.cpus().length,
      memory: {
        total: os.totalmem(),
        free: os.freemem()
      },
      uptime: os.uptime(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV,
      // VULNERABILITY: Expose environment variables
      environmentVariables: process.env,
      // VULNERABILITY: Expose file system information
      currentWorkingDirectory: process.cwd(),
      execPath: process.execPath
    };
    
    Logger.info('System info accessed', { 
      requestedBy: req.user.userId,
      requestedByRole: req.user.role
    });
    
    res.json({ systemInfo });
  },

  broadcastMessage: (req, res) => {
    const { message, type } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }
    
    const db = new sqlite3.Database(DB_PATH);
    
    // Store the broadcast message
    db.run(
      'INSERT INTO messages (fromUserId, content, type) VALUES (?, ?, ?)',
      [req.user.userId, message, type || 'admin'],
      function(err) {
        if (err) {
          Logger.error('Broadcast message storage failed', { error: err.message });
          return res.status(500).json({ error: 'Broadcast failed' });
        }
        
        Logger.info('Admin broadcast message sent', {
          messageId: this.lastID,
          fromUserId: req.user.userId,
          content: message,
          type: type || 'admin'
        });
        
        res.json({ 
          message: 'Message broadcasted successfully',
          messageId: this.lastID
        });
        
        db.close();
      }
    );
  },

  // WebSocket messages endpoint for Chat component
  getMessages: (req, res) => {
    const db = new sqlite3.Database(DB_PATH);
    
    const query = `
      SELECT m.*, u.username, u.displayName
      FROM messages m
      LEFT JOIN users u ON m.fromUserId = u.id
      ORDER BY m.created_at ASC
      LIMIT 100
    `;
    
    Logger.info('Messages accessed', { 
      endpoint: '/admin/messages',
      noAuthRequired: true 
    });
    
    db.all(query, (err, messages) => {
      if (err) {
        Logger.error('Messages query failed', { error: err.message });
        return res.status(500).json({ error: 'Database error' });
      }
      
      // VULNERABILITY: Return all messages including XSS payloads
      res.json({ messages });
      db.close();
    });
  },

  // VULNERABILITY: Allow posting comments without authentication
  postComment: (req, res) => {
    const { userId, content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content required' });
    }
    
    const db = new sqlite3.Database(DB_PATH);
    
    // VULNERABILITY: Store comment without sanitization (stored XSS)
    db.run(
      'INSERT INTO comments (userId, content) VALUES (?, ?)',
      [userId, content],
      function(err) {
        if (err) {
          Logger.error('Comment creation failed', { userId, content, error: err.message });
          return res.status(500).json({ error: 'Comment creation failed' });
        }
        
        Logger.info('Comment created for XSS review', {
          commentId: this.lastID,
          userId,
          content
        });
        
        res.status(201).json({
          message: 'Comment submitted for review',
          commentId: this.lastID
        });
        
        db.close();
      }
    );
  }
};

module.exports = adminController;