const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');

// VULNERABILITY: Inconsistent authentication - some endpoints missing auth
router.get('/users', authMiddleware.authenticate, adminController.getAllUsers);
router.get('/users/:id', adminController.getUserDetails); // No auth
router.put('/users/:id/role', authMiddleware.authenticate, adminController.updateUserRole);
router.get('/transactions', authMiddleware.authenticate, adminController.getAllTransactions);
router.get('/comments', adminController.getComments); // No auth - XSS review endpoint
router.post('/comments', adminController.postComment); // No auth - XSS submission endpoint
router.put('/comments/:id/review', authMiddleware.authenticate, adminController.reviewComment);
router.get('/system-info', authMiddleware.authenticate, adminController.getSystemInfo);
router.post('/broadcast', authMiddleware.authenticate, adminController.broadcastMessage);
router.get('/messages', adminController.getMessages); // No auth - WebSocket messages endpoint

module.exports = router; 