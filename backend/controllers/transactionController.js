const sqlite3 = require('sqlite3').verbose();
const Logger = require('../utils/logger');

const DB_PATH = './buggybank.db';

const transactionController = {
  getTransactions: (req, res) => {
    const userId = req.user.userId;
    const { filter } = req.query;
    
    const db = new sqlite3.Database(DB_PATH);
    
    let query = `
      SELECT t.*, 
             u1.username as fromUsername, u1.displayName as fromDisplayName,
             u2.username as toUsername, u2.displayName as toDisplayName
      FROM transactions t
      LEFT JOIN users u1 ON t.fromUserId = u1.id
      LEFT JOIN users u2 ON t.toUserId = u2.id
      WHERE t.fromUserId = ? OR t.toUserId = ?
    `;
    
    const params = [userId, userId];
    
    // VULNERABILITY: Time-based SQL injection via filter
    if (filter) {
      query += ` AND (t.description LIKE '%${filter}%')`;
      Logger.info('Transaction filter applied', { userId, filter, query });
    }
    
    query += ' ORDER BY t.created_at DESC';
    
    db.all(query, params, (err, transactions) => {
      if (err) {
        Logger.error('Transaction query failed', { userId, filter, error: err.message });
        
        return res.status(500).json({ 
          error: 'Database error',
          sqlError: err.message, // VULNERABILITY: Expose SQL errors
          query: query
        });
      }
      
      res.json({ transactions });
      db.close();
    });
  },

  // VULNERABILITY: IDOR - Access any transaction by ID without authorization
  getTransaction: (req, res) => {
    const { id } = req.params;
    
    const db = new sqlite3.Database(DB_PATH);
    
    const query = `
      SELECT t.*, 
             u1.username as fromUsername, u1.displayName as fromDisplayName,
             u2.username as toUsername, u2.displayName as toDisplayName
      FROM transactions t
      LEFT JOIN users u1 ON t.fromUserId = u1.id
      LEFT JOIN users u2 ON t.toUserId = u2.id
      WHERE t.id = ?
    `;
    
    Logger.info('Transaction access attempt', { transactionId: id });
    
    db.get(query, [id], (err, transaction) => {
      if (err) {
        Logger.error('Transaction query failed', { id, error: err.message });
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      
      Logger.info('Transaction accessed via IDOR', { 
        transactionId: id, 
        fromUserId: transaction.fromUserId,
        toUserId: transaction.toUserId 
      });
      
      res.json({ transaction });
      db.close();
    });
  },

  // VULNERABILITY: No CSRF protection on money transfer
  transfer: (req, res) => {
    const { toUsername, amount, description } = req.body;
    const fromUserId = req.user.userId;
    
    if (!toUsername || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid recipient and amount required' });
    }
    
    const db = new sqlite3.Database(DB_PATH);
    
    // Get recipient user
    db.get('SELECT id, username FROM users WHERE username = ?', [toUsername], (err, toUser) => {
      if (err) {
        Logger.error('Recipient lookup failed', { toUsername, error: err.message });
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!toUser) {
        return res.status(404).json({ error: 'Recipient not found' });
      }
      
      if (toUser.id === fromUserId) {
        return res.status(400).json({ error: 'Cannot transfer to yourself' });
      }
      
      // Get sender's current balance
      db.get('SELECT balance FROM users WHERE id = ?', [fromUserId], (balanceErr, sender) => {
        if (balanceErr || !sender) {
          Logger.error('Sender lookup failed', { fromUserId, error: balanceErr?.message });
          return res.status(500).json({ error: 'Sender not found' });
        }
        
        if (sender.balance < amount) {
          return res.status(400).json({ 
            error: 'Insufficient funds',
            currentBalance: sender.balance,
            requestedAmount: amount
          });
        }
        
        // VULNERABILITY: Race condition - no transaction locking
        // Update balances
        db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, fromUserId], function(updateErr1) {
          if (updateErr1) {
            Logger.error('Sender balance update failed', { fromUserId, amount, error: updateErr1.message });
            return res.status(500).json({ error: 'Transfer failed' });
          }
          
          db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, toUser.id], function(updateErr2) {
            if (updateErr2) {
              Logger.error('Recipient balance update failed', { toUserId: toUser.id, amount, error: updateErr2.message });
              
              // VULNERABILITY: Partial rollback - sender already debited
              return res.status(500).json({ 
                error: 'Transfer partially failed - contact support',
                details: updateErr2.message
              });
            }
            
            // Record transaction
            db.run(
              'INSERT INTO transactions (fromUserId, toUserId, amount, description, type) VALUES (?, ?, ?, ?, ?)',
              [fromUserId, toUser.id, amount, description || 'Transfer', 'transfer'],
              function(transactionErr) {
                if (transactionErr) {
                  Logger.error('Transaction record failed', { 
                    fromUserId, 
                    toUserId: toUser.id, 
                    amount, 
                    error: transactionErr.message 
                  });
                }
                
                Logger.info('Transfer completed', {
                  transactionId: this.lastID,
                  fromUserId,
                  toUserId: toUser.id,
                  amount,
                  description
                });
                
                res.json({
                  message: 'Transfer successful',
                  transaction: {
                    id: this.lastID,
                    fromUserId,
                    toUserId: toUser.id,
                    toUsername: toUser.username,
                    amount,
                    description: description || 'Transfer',
                    timestamp: new Date().toISOString()
                  }
                });
                
                db.close();
              }
            );
          });
        });
      });
    });
  },

  searchTransactions: (req, res) => {
    const { query, dateFrom, dateTo } = req.query;
    const userId = req.user.userId;
    
    const db = new sqlite3.Database(DB_PATH);
    
    // VULNERABILITY: Time-based SQL injection in search
    let searchQuery = `
      SELECT t.*, 
             u1.username as fromUsername, u1.displayName as fromDisplayName,
             u2.username as toUsername, u2.displayName as toDisplayName
      FROM transactions t
      LEFT JOIN users u1 ON t.fromUserId = u1.id
      LEFT JOIN users u2 ON t.toUserId = u2.id
      WHERE (t.fromUserId = ? OR t.toUserId = ?)
    `;
    
    const params = [userId, userId];
    
    if (query) {
      // VULNERABILITY: Direct string concatenation allowing time-based SQLi
      searchQuery += ` AND t.description LIKE '%${query}%'`;
    }
    
    if (dateFrom) {
      searchQuery += ` AND t.created_at >= '${dateFrom}'`;
    }
    
    if (dateTo) {
      searchQuery += ` AND t.created_at <= '${dateTo}'`;
    }
    
    searchQuery += ' ORDER BY t.created_at DESC';
    
    Logger.info('Transaction search performed', { userId, query, dateFrom, dateTo, searchQuery });
    
    db.all(searchQuery, params, (err, transactions) => {
      if (err) {
        Logger.error('Transaction search failed', { 
          userId, 
          query, 
          error: err.message,
          searchQuery 
        });
        
        return res.status(500).json({ 
          error: 'Search failed',
          sqlError: err.message, // VULNERABILITY: Expose SQL errors
          query: searchQuery
        });
      }
      
      res.json({ transactions });
      db.close();
    });
  }
};

module.exports = transactionController; 