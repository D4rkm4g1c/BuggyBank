const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');

const DB_PATH = './buggybank.db';
const UPLOAD_DIR = './uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const fileController = {
  uploadFile: (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { originalname, filename, mimetype, size, path: filePath } = req.file;
    const userId = req.user.userId;
    
    const db = new sqlite3.Database(DB_PATH);
    
    // Store file metadata
    db.run(
      'INSERT INTO uploads (userId, filename, originalName, mimetype, size, path) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, filename, originalname, mimetype, size, filePath],
      function(err) {
        if (err) {
          Logger.error('File upload metadata storage failed', { 
            userId, 
            filename, 
            error: err.message 
          });
          
          // Clean up file
          try {
            fs.unlinkSync(filePath);
          } catch (cleanupErr) {
            Logger.error('File cleanup failed', { filePath, error: cleanupErr.message });
          }
          
          return res.status(500).json({ error: 'Upload failed' });
        }
        
        Logger.info('File uploaded successfully', {
          fileId: this.lastID,
          userId,
          filename,
          originalname,
          mimetype,
          size
        });
        
        res.status(201).json({
          message: 'File uploaded successfully',
          file: {
            id: this.lastID,
            filename,
            originalName: originalname,
            mimetype,
            size,
            uploadDate: new Date().toISOString(),
            // VULNERABILITY: Expose direct file path
            downloadUrl: `/api/files/download/${this.lastID}`,
            directPath: `/uploads/${filename}` // VULNERABILITY: Direct access path
          }
        });
        
        db.close();
      }
    );
  },

  // VULNERABILITY: No authentication required for file download (IDOR)
  downloadFile: (req, res) => {
    const { id } = req.params;
    
    const db = new sqlite3.Database(DB_PATH);
    
    db.get('SELECT * FROM uploads WHERE id = ?', [id], (err, file) => {
      if (err) {
        Logger.error('File download query failed', { fileId: id, error: err.message });
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      Logger.info('File downloaded without authentication', {
        fileId: id,
        filename: file.filename,
        originalName: file.originalName,
        uploaderUserId: file.userId
      });
      
      const filePath = file.path;
      
      // Check if file exists on disk
      if (!fs.existsSync(filePath)) {
        Logger.error('File not found on disk', { fileId: id, filePath });
        return res.status(404).json({ error: 'File not found on disk' });
      }
      
      // VULNERABILITY: No access control - anyone can download any file
      res.download(filePath, file.originalName);
      
      db.close();
    });
  },

  listFiles: (req, res) => {
    const userId = req.user.userId;
    
    const db = new sqlite3.Database(DB_PATH);
    
    db.all('SELECT * FROM uploads WHERE userId = ? ORDER BY created_at DESC', [userId], (err, files) => {
      if (err) {
        Logger.error('File list query failed', { userId, error: err.message });
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Add download URLs to each file
      const filesWithUrls = files.map(file => ({
        ...file,
        downloadUrl: `/api/files/download/${file.id}`,
        directPath: `/uploads/${file.filename}` // VULNERABILITY: Expose direct paths
      }));
      
      res.json({ files: filesWithUrls });
      db.close();
    });
  },

  deleteFile: (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const db = new sqlite3.Database(DB_PATH);
    
    // VULNERABILITY: IDOR vulnerability in file deletion
    db.get('SELECT * FROM uploads WHERE id = ?', [id], (err, file) => {
      if (err) {
        Logger.error('File deletion query failed', { fileId: id, error: err.message });
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      // VULNERABILITY: Weak ownership check - only logs but doesn't enforce
      if (file.userId !== userId) {
        Logger.warn('File deletion attempted by non-owner', {
          fileId: id,
          fileOwner: file.userId,
          requestedBy: userId
        });
        // Continue with deletion anyway (vulnerability)
      }
      
      // Delete from database
      db.run('DELETE FROM uploads WHERE id = ?', [id], function(deleteErr) {
        if (deleteErr) {
          Logger.error('File database deletion failed', { fileId: id, error: deleteErr.message });
          return res.status(500).json({ error: 'Deletion failed' });
        }
        
        // Delete physical file
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
            Logger.info('File deleted successfully', { fileId: id, filePath: file.path });
          }
        } catch (fsErr) {
          Logger.error('Physical file deletion failed', { 
            fileId: id, 
            filePath: file.path, 
            error: fsErr.message 
          });
        }
        
        res.json({ message: 'File deleted successfully' });
        db.close();
      });
    });
  }
};

module.exports = fileController; 