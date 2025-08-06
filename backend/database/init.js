const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../buggybank.db');

const db = new sqlite3.Database(DB_PATH);

// Create tables with deliberate vulnerabilities
db.serialize(() => {
  // Users table - stores plaintext passwords (vulnerability)
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,  -- Plaintext passwords (vulnerability)
      displayName TEXT,
      email TEXT,
      balance REAL DEFAULT 1000.0,
      role TEXT DEFAULT 'user',  -- Roles: user, staff, admin
      profilePicture TEXT,
      sessionId TEXT,  -- For session management vulnerabilities
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Transactions table
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fromUserId INTEGER,
      toUserId INTEGER,
      amount REAL NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'transfer',  -- transfer, deposit, withdrawal
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (fromUserId) REFERENCES users(id),
      FOREIGN KEY (toUserId) REFERENCES users(id)
    )
  `);

  // Budget items table
  db.run(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      category TEXT NOT NULL,
      label TEXT,  -- User input, vulnerable to XSS/SQLi
      allocatedAmount REAL NOT NULL,
      spentAmount REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // Comments/Feedback table for XSS vulnerabilities
  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      content TEXT NOT NULL,  -- Vulnerable to stored XSS
      isReviewed BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // File uploads table
  db.run(`
    CREATE TABLE IF NOT EXISTS uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      filename TEXT NOT NULL,
      originalName TEXT,
      mimetype TEXT,
      size INTEGER,
      path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // WebSocket messages for stored XSS via WebSocket
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fromUserId INTEGER,
      content TEXT NOT NULL,  -- Vulnerable to stored XSS
      type TEXT DEFAULT 'user',  -- user, system, admin
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (fromUserId) REFERENCES users(id)
    )
  `);

  console.log('Database tables created successfully');
});

db.close(); 