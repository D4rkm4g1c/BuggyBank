# BuggyBank - Deliberately Vulnerable Web Application

A deliberately vulnerable web application designed for educational purposes in web application penetration testing. **DO NOT deploy in production environments.**

## ⚠️ WARNING

This application contains **intentional security vulnerabilities** for educational purposes only. It is designed to be exploited in controlled lab environments for learning web application security testing techniques.

## 🏗️ Architecture

- **Backend**: Python Flask
- **Database**: SQLite
- **Frontend**: HTML/CSS with Jinja2 templates
- **Container**: Docker
- **Bot**: Python admin bot for simulating support staff

## 🚀 Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd BuggyBank

# Build and run with Docker Compose
docker-compose up --build

# Access the application
open http://localhost:5000
```

### Using Docker

```bash
# Build the Docker image
docker build -t buggybank .

# Run the container
docker run -p 5000:5000 -v $(pwd)/database:/app/database -v $(pwd)/uploads:/app/uploads buggybank

# Access the application
open http://localhost:5000
```

### Manual Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Run the application
python run.py

# Access the application
open http://localhost:5000
```

## 📊 Sample Accounts

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Administrator |
| john | password123 | Regular User |
| alice | password123 | Regular User |
| bob | password123 | Regular User |

## 🔐 Vulnerability Documentation

### 1. SQL Injection (Blind/Time-based)
- **Route**: `/login`
- **Vulnerability**: Direct string concatenation in SQL queries
- **Exploit**: `' OR 1=1--` in username field
- **Impact**: Authentication bypass, data extraction

### 2. Stored XSS
- **Route**: `/transfer`
- **Vulnerability**: Message field stored and displayed without sanitization
- **Exploit**: `<script>alert('XSS')</script>` in transfer message
- **Impact**: Session hijacking, cookie theft

### 3. Second-Order SQL Injection
- **Route**: `/profile/update-bio` → `/admin/reports`
- **Vulnerability**: Bio field stored and later executed as SQL
- **Exploit**: Store SQL in bio, trigger via admin reports
- **Impact**: Database manipulation, data extraction

### 4. IDOR (Insecure Direct Object Reference)
- **Route**: `/transaction-history`
- **Vulnerability**: No authorization check on user_id parameter
- **Exploit**: `?user_id=1`, `?user_id=2`, etc.
- **Impact**: Unauthorized access to other users' data

### 5. File Upload Vulnerabilities
- **Route**: `/upload-document`
- **Vulnerability**: No file type validation
- **Exploit**: Upload `.php`, `.jsp`, `.asp` files
- **Impact**: Remote code execution

### 6. Local File Inclusion (LFI)
- **Route**: `/help`
- **Vulnerability**: Direct file inclusion without validation
- **Exploit**: `?topic=../etc/passwd`
- **Impact**: File system access, sensitive data exposure

### 7. Forced Browsing
- **Routes**: `/admin/reports`, `/admin/user-audit`, `/old-login`
- **Vulnerability**: Hidden pages accessible without authentication
- **Exploit**: Direct URL access
- **Impact**: Information disclosure, unauthorized access

### 8. DOM XSS
- **Route**: `/search`
- **Vulnerability**: User input reflected in innerHTML
- **Exploit**: `<script>alert('XSS')</script>` in search query
- **Impact**: Client-side code execution

### 9. Session Management Issues
- **Route**: `/account/settings`
- **Vulnerability**: No session rotation, insecure cookies
- **Exploit**: Session fixation, cookie manipulation
- **Impact**: Session hijacking

### 10. Missing Rate Limiting
- **Routes**: `/api/transactions`, `/funds/transfer`
- **Vulnerability**: No request throttling
- **Exploit**: Brute force attacks, DoS
- **Impact**: Resource exhaustion, account compromise

### 11. CSRF Vulnerabilities
- **Routes**: All POST endpoints
- **Vulnerability**: No CSRF tokens
- **Exploit**: Cross-site request forgery
- **Impact**: Unauthorized actions on behalf of user

### 12. Legacy API Exposure
- **Routes**: `/api/v1/transactions/export`, `/api/v1/users/list`
- **Vulnerability**: No authentication required
- **Exploit**: Direct API access
- **Impact**: Data leakage, information disclosure

## 🤖 Admin Bot

The application includes an admin bot that simulates support staff reviewing messages:

```bash
# Run the admin bot
python bot/admin_bot.py
```

The bot:
- Reviews support messages every 30 seconds
- Processes message content without sanitization
- Vulnerable to stored XSS attacks
- Can be targeted for cookie theft

## 📁 Project Structure

```
buggybank/
├── app/
│   ├── __init__.py          # Flask app factory
│   ├── routes.py            # All vulnerable routes
│   ├── models.py            # Database models
│   └── templates/           # HTML templates
├── bot/
│   └── admin_bot.py        # Admin bot simulation
├── database/
│   └── buggybank.db        # SQLite database
├── help/                   # Help files for LFI
├── uploads/                # File upload directory
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── run.py
└── README.md
```

## 🧪 Testing Vulnerabilities

### SQL Injection
```bash
# Login bypass
curl -X POST http://localhost:5000/login \
  -d "username=' OR 1=1--&password=anything"
```

### XSS
```bash
# Stored XSS in transfer message
curl -X POST http://localhost:5000/transfer \
  -d "to_username=admin&amount=1&message=<script>alert('XSS')</script>"
```

### LFI
```bash
# Path traversal
curl "http://localhost:5000/help?topic=../etc/passwd"
```

### IDOR
```bash
# View other user's transactions
curl "http://localhost:5000/transaction-history?user_id=1"
```

## 🔧 Development

### Adding New Vulnerabilities

1. Add route in `app/routes.py`
2. Create template in `app/templates/`
3. Update database schema if needed
4. Document vulnerability in README

### Database Schema

```sql
-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    balance REAL DEFAULT 1000.0,
    bio TEXT,
    session_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user_id INTEGER,
    to_user_id INTEGER,
    amount REAL NOT NULL,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Support messages table
CREATE TABLE support_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin audit logs table
CREATE TABLE admin_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    user_id INTEGER,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 📚 Educational Resources

This application is designed to teach:

- **OWASP Top 10** vulnerabilities
- **Web application penetration testing** techniques
- **Security testing** methodologies
- **Vulnerability exploitation** in controlled environments

## ⚖️ Legal Notice

This application is for **educational purposes only**. Users are responsible for:

- Using this application only in controlled, authorized environments
- Not deploying in production systems
- Complying with applicable laws and regulations
- Obtaining proper authorization before testing

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add new vulnerabilities or improve existing ones
4. Update documentation
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Remember**: This is a deliberately vulnerable application for educational purposes. Never deploy in production environments! 