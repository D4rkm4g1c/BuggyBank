const mysql = require('mysql2');

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: null,
  multipleStatements: true
});

// SQL script to create database and tables
const createDatabaseSQL = `
CREATE DATABASE IF NOT EXISTS buggybank;
USE buggybank;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  fullname VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  bio TEXT,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  user_id INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  to_account VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  note TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Support messages table
CREATE TABLE IF NOT EXISTS support_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Uploaded files table
CREATE TABLE IF NOT EXISTS uploaded_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  filepath VARCHAR(500) NOT NULL,
  upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`;

// Test data
const insertTestDataSQL = `
USE buggybank;

-- Insert test users
INSERT INTO users (username, password_hash, fullname, email, bio, role) VALUES
('alice', 'password123', 'Alice Johnson', 'alice@example.com', 'Hello, I am Alice!', 'user'),
('bob', 'password123', 'Bob Smith', 'bob@example.com', 'Bob here, nice to meet you!', 'user'),
('admin', 'admin123', 'Admin User', 'admin@buggybank.com', 'System Administrator', 'admin'),
('testuser', 'test123', 'Test User', 'test@example.com', 'This is a test user account', 'user');

-- Insert test transactions
INSERT INTO transactions (user_id, to_account, amount, note, timestamp) VALUES
(1, 'ACCOUNT001', 1000.00, 'Initial deposit', NOW() - INTERVAL 5 DAY),
(1, 'ACCOUNT002', -250.00, 'Payment for services', NOW() - INTERVAL 3 DAY),
(1, 'ACCOUNT003', 500.00, 'Refund', NOW() - INTERVAL 1 DAY),
(2, 'ACCOUNT004', 2000.00, 'Salary deposit', NOW() - INTERVAL 4 DAY),
(2, 'ACCOUNT005', -150.00, 'Utility bill payment', NOW() - INTERVAL 2 DAY),
(3, 'ACCOUNT006', 5000.00, 'Admin account setup', NOW() - INTERVAL 6 DAY);

-- Insert test support messages
INSERT INTO support_messages (user_id, message, created_at) VALUES
(1, 'Hello, I need help with my account.', NOW() - INTERVAL 2 DAY),
(1, 'Can you help me reset my password?', NOW() - INTERVAL 1 DAY),
(2, 'I have a question about my recent transaction.', NOW() - INTERVAL 3 DAY),
(3, 'Admin support message for testing.', NOW() - INTERVAL 4 DAY);

-- Insert test audit logs
INSERT INTO audit_logs (user_id, action, timestamp) VALUES
(1, 'login', NOW() - INTERVAL 1 HOUR),
(1, 'transfer', NOW() - INTERVAL 30 MINUTE),
(2, 'login', NOW() - INTERVAL 2 HOUR),
(2, 'transfer', NOW() - INTERVAL 1 HOUR),
(3, 'login', NOW() - INTERVAL 3 HOUR),
(3, 'admin_action', NOW() - INTERVAL 2 HOUR);
`;

async function setupDatabase() {
  try {
    console.log('Creating database and tables...');
    await db.promise().query(createDatabaseSQL);
    console.log('Database and tables created successfully!');
    
    console.log('Inserting test data...');
    await db.promise().query(insertTestDataSQL);
    console.log('Test data inserted successfully!');
    
    console.log('✅ Database setup completed!');
    console.log('\nTest accounts:');
    console.log('- Username: alice, Password: password123');
    console.log('- Username: bob, Password: password123');
    console.log('- Username: admin, Password: admin123');
    console.log('- Username: testuser, Password: test123');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('\nMake sure MySQL is running and the connection details are correct.');
    console.log('You may need to update the connection details in server.js and setup-database.js');
  } finally {
    db.end();
  }
}

setupDatabase(); 