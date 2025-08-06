const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Logger utility that deliberately logs sensitive information
 * This creates vulnerabilities for log injection and information disclosure
 */
class Logger {
  static log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    let logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    // Deliberately log sensitive data (vulnerability)
    if (data) {
      logEntry += ` | Data: ${JSON.stringify(data)}`;
    }
    
    logEntry += '\n';
    
    // Write to file (synchronous for simplicity in this vulnerable app)
    fs.appendFileSync(LOG_FILE, logEntry);
    
    // Also log to console
    console.log(logEntry.trim());
  }

  static info(message, data = null) {
    this.log('INFO', message, data);
  }

  static warn(message, data = null) {
    this.log('WARN', message, data);
  }

  static error(message, data = null) {
    this.log('ERROR', message, data);
  }

  // Deliberately log authentication attempts with passwords (vulnerability)
  static logAuthAttempt(username, password, success, headers = {}) {
    const authData = {
      username,
      password, // VULNERABILITY: Logging plaintext passwords
      success,
      headers: {
        authorization: headers.authorization, // VULNERABILITY: Logging auth headers
        'user-agent': headers['user-agent'],
        'x-forwarded-for': headers['x-forwarded-for']
      },
      timestamp: new Date().toISOString()
    };
    
    this.log('AUTH', `Login attempt for user: ${username}`, authData);
  }
}

module.exports = Logger; 