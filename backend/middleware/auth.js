const jwt = require('jsonwebtoken');
const Logger = require('../utils/logger');

const JWT_SECRET = 'buggybank-secret-key'; // VULNERABILITY: Same weak secret

const authMiddleware = {
  authenticate: (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.authToken;
    
    if (!token) {
      Logger.warn('Authentication failed - no token provided', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        path: req.path
      });
      
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // VULNERABILITY: No session validation against database
      // VULNERABILITY: No token blacklist checking
      req.user = decoded;
      
      Logger.info('Authentication successful', {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role,
        sessionId: decoded.sessionId,
        path: req.path
      });
      
      next();
    } catch (error) {
      Logger.warn('Authentication failed - invalid token', {
        token: token.substring(0, 20) + '...', // VULNERABILITY: Log partial token
        error: error.message,
        ip: req.ip,
        path: req.path
      });
      
      // VULNERABILITY: Expose JWT validation details
      res.status(401).json({ 
        error: 'Invalid token',
        details: error.message,
        tokenPrefix: token.substring(0, 20) // VULNERABILITY: Expose token prefix
      });
    }
  },

  // VULNERABILITY: Broken role authorization - always allows access
  requireRole: (role) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // VULNERABILITY: Log role check but don't enforce it
      Logger.info('Role check performed', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRole: role,
        path: req.path,
        allowed: true // Always log as allowed
      });
      
      // VULNERABILITY: Always allow access regardless of role
      next();
    };
  }
};

module.exports = authMiddleware; 