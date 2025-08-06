const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const os = require('os');
const Logger = require('../utils/logger');

const DB_PATH = './buggybank.db';

const userController = {
  // VULNERABILITY: IDOR - Get any user's profile without authorization
  getProfile: (req, res) => {
    const { id } = req.params;
    
    const db = new sqlite3.Database(DB_PATH);
    
    Logger.info('Profile access attempt', { 
      requestedUserId: id,
      noAuthRequired: true 
    });
    
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
      if (err) {
        Logger.error('Profile query failed', { id, error: err.message });
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // VULNERABILITY: Return sensitive user data including password
      res.json({ 
        user: {
          id: user.id,
          username: user.username,
          password: user.password, // VULNERABILITY: Expose password
          displayName: user.displayName,
          email: user.email,
          balance: user.balance,
          role: user.role,
          sessionId: user.sessionId // VULNERABILITY: Expose session ID
        }
      });
      
      db.close();
    });
  },

  updateProfile: (req, res) => {
    const { displayName, email } = req.body;
    const userId = req.user.userId;
    
    if (!displayName && !email) {
      return res.status(400).json({ error: 'At least one field must be provided' });
    }
    
    const db = new sqlite3.Database(DB_PATH);
    
    // VULNERABILITY: Second-order SQL injection via displayName
    let updateQuery = 'UPDATE users SET ';
    const updates = [];
    const params = [];
    
    if (displayName !== undefined) {
      // VULNERABILITY: Direct string concatenation for second-order SQLi
      updates.push(`displayName = '${displayName}'`);
    }
    
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }
    
    updateQuery += updates.join(', ') + ' WHERE id = ?';
    params.push(userId);
    
    Logger.info('Profile update attempt', { userId, updateQuery, displayName });
    
    db.run(updateQuery, params, function(err) {
      if (err) {
        Logger.error('Profile update failed', { userId, error: err.message });
        
        return res.status(500).json({ 
          error: 'Update failed',
          sqlError: err.message, // VULNERABILITY: Expose SQL errors
          query: updateQuery
        });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      Logger.info('Profile updated successfully', { userId });
      res.json({ message: 'Profile updated successfully' });
      
      db.close();
    });
  },

  // VULNERABILITY: No authentication required for user search
  searchUsers: (req, res) => {
    const { query } = req.query;
    
    const db = new sqlite3.Database(DB_PATH);
    
    let searchQuery = 'SELECT id, username, displayName, email, role FROM users';
    let params = [];
    
    if (query) {
      // VULNERABILITY: SQL injection in search
      searchQuery += ` WHERE username LIKE '%${query}%' OR displayName LIKE '%${query}%'`;
    }
    
    searchQuery += ' LIMIT 50';
    
    Logger.info('User search performed', { query, searchQuery });
    
    db.all(searchQuery, params, (err, users) => {
      if (err) {
        Logger.error('User search failed', { query, error: err.message });
        
        return res.status(500).json({ 
          error: 'Search failed',
          sqlError: err.message, // VULNERABILITY: Expose SQL errors
          query: searchQuery
        });
      }
      
      res.json({ users });
      db.close();
    });
  },

  // VULNERABILITY: IDOR - Get any user's balance without authorization
  getBalance: (req, res) => {
    const { userId } = req.params;
    
    const db = new sqlite3.Database(DB_PATH);
    
    Logger.info('Balance access attempt', { 
      requestedUserId: userId,
      noAuthRequired: true 
    });
    
    db.get('SELECT username, displayName, balance FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) {
        Logger.error('Balance query failed', { userId, error: err.message });
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ 
        userId: parseInt(userId),
        username: user.username,
        displayName: user.displayName,
        balance: user.balance
      });
      
      db.close();
    });
  }
};

// Keep the admin methods as well (since they were in userController.js)
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
  }
};

module.exports = userController;   