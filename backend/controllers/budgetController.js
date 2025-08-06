const sqlite3 = require('sqlite3').verbose();
const Logger = require('../utils/logger');

const DB_PATH = './buggybank.db';

const budgetController = {
  getBudgets: (req, res) => {
    const userId = req.user.userId;
    
    const db = new sqlite3.Database(DB_PATH);
    
    // VULNERABILITY: Second-order SQL injection via stored labels
    const query = `
      SELECT * FROM budgets 
      WHERE userId = ? 
      ORDER BY created_at DESC
    `;
    
    db.all(query, [userId], (err, budgets) => {
      if (err) {
        Logger.error('Budget query failed', { userId, error: err.message });
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({ budgets });
      db.close();
    });
  },

  createBudget: (req, res) => {
    const { category, label, allocatedAmount } = req.body;
    const userId = req.user.userId;
    
    if (!category || !allocatedAmount || allocatedAmount <= 0) {
      return res.status(400).json({ error: 'Category and valid amount required' });
    }
    
    const db = new sqlite3.Database(DB_PATH);
    
    // VULNERABILITY: Store user input without sanitization (enables stored XSS and second-order SQLi)
    const query = `
      INSERT INTO budgets (userId, category, label, allocatedAmount) 
      VALUES (?, ?, ?, ?)
    `;
    
    db.run(query, [userId, category, label, allocatedAmount], function(err) {
      if (err) {
        Logger.error('Budget creation failed', { userId, category, label, error: err.message });
        
        return res.status(500).json({ 
          error: 'Budget creation failed',
          sqlError: err.message // VULNERABILITY: Expose SQL errors
        });
      }
      
      Logger.info('Budget created', { 
        budgetId: this.lastID, 
        userId, 
        category, 
        label,
        allocatedAmount 
      });
      
      res.status(201).json({
        message: 'Budget created successfully',
        budget: {
          id: this.lastID,
          userId,
          category,
          label,
          allocatedAmount,
          spentAmount: 0
        }
      });
      
      db.close();
    });
  },

  updateBudget: (req, res) => {
    const { id } = req.params;
    const { category, label, allocatedAmount, spentAmount } = req.body;
    const userId = req.user.userId;
    
    const db = new sqlite3.Database(DB_PATH);
    
    // VULNERABILITY: IDOR - only check ownership after update attempt
    let updateQuery = 'UPDATE budgets SET ';
    const updates = [];
    const params = [];
    
    if (category) {
      updates.push('category = ?');
      params.push(category);
    }
    
    if (label !== undefined) {
      // VULNERABILITY: Direct string concatenation for XSS/SQLi
      updates.push(`label = '${label}'`);
    }
    
    if (allocatedAmount !== undefined) {
      updates.push('allocatedAmount = ?');
      params.push(allocatedAmount);
    }
    
    if (spentAmount !== undefined) {
      updates.push('spentAmount = ?');
      params.push(spentAmount);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'At least one field must be provided' });
    }
    
    updateQuery += updates.join(', ') + ' WHERE id = ? AND userId = ?';
    params.push(id, userId);
    
    Logger.info('Budget update attempt', { budgetId: id, userId, updateQuery });
    
    db.run(updateQuery, params, function(err) {
      if (err) {
        Logger.error('Budget update failed', { budgetId: id, userId, error: err.message });
        
        return res.status(500).json({ 
          error: 'Update failed',
          sqlError: err.message, // VULNERABILITY: Expose SQL errors
          query: updateQuery
        });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Budget not found or access denied' });
      }
      
      Logger.info('Budget updated successfully', { budgetId: id, userId });
      res.json({ message: 'Budget updated successfully' });
      
      db.close();
    });
  },

  // VULNERABILITY: No authentication - anyone can delete any budget
  deleteBudget: (req, res) => {
    const { id } = req.params;
    
    const db = new sqlite3.Database(DB_PATH);
    
    Logger.info('Budget deletion attempt', { budgetId: id });
    
    db.run('DELETE FROM budgets WHERE id = ?', [id], function(err) {
      if (err) {
        Logger.error('Budget deletion failed', { budgetId: id, error: err.message });
        return res.status(500).json({ error: 'Deletion failed' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Budget not found' });
      }
      
      Logger.info('Budget deleted without authentication', { budgetId: id });
      res.json({ message: 'Budget deleted successfully' });
      
      db.close();
    });
  }
};

module.exports = budgetController;