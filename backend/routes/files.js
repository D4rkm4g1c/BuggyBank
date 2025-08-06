const express = require('express');
const router = express.Router();
const multer = require('multer');
const fileController = require('../controllers/fileController');
const authMiddleware = require('../middleware/auth');

// VULNERABILITY: Insecure file upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/'); // VULNERABILITY: Predictable upload directory
  },
  filename: (req, file, cb) => {
    // VULNERABILITY: Predictable filename pattern
    const timestamp = Date.now();
    const originalName = file.originalname;
    cb(null, `${timestamp}_${originalName}`);
  }
});

// VULNERABILITY: Minimal file filtering - only by extension
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.txt'];
  const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
  
  // VULNERABILITY: Only check file extension, not MIME type or content
  if (allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

router.post('/upload', authMiddleware.authenticate, upload.single('file'), fileController.uploadFile);
router.get('/download/:id', fileController.downloadFile); // VULNERABILITY: No authentication
router.get('/list', authMiddleware.authenticate, fileController.listFiles);
router.delete('/:id', authMiddleware.authenticate, fileController.deleteFile);

module.exports = router; 