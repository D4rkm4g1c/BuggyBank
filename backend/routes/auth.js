const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// VULNERABILITY: No rate limiting on authentication endpoints
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/verify', authController.verify);

module.exports = router; 