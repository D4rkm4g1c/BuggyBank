const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// VULNERABILITY: Some routes lack proper authentication
router.get('/profile/:id', userController.getProfile); // No auth required - IDOR vulnerability
router.put('/profile', authMiddleware.authenticate, userController.updateProfile);
router.get('/search', userController.searchUsers); // No auth required
router.get('/balance/:userId', userController.getBalance); // IDOR vulnerability

module.exports = router; 