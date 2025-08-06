# BuggyBank - Banking Application

A fully functional web application simulating an online banking platform for testing and development purposes.

## ⚠️ WARNING

This application is for testing and development purposes only. **DO NOT** use this application in production or with real financial data.

## Features

- Complete banking interface with modern UI
- User authentication and session management
- Transaction history and fund transfers
- Support messaging system
- File upload functionality
- Help documentation system
- Admin audit and reporting pages

## Application Features

### 1. User Authentication
- Login system with username and password
- Session management
- User roles (user, admin)

### 2. Banking Operations
- Account balance display
- Fund transfers between accounts
- Transaction history
- Transaction details

### 3. User Management
- Profile management
- Bio updates with live preview
- Support messaging system

### 4. File Management
- Document upload functionality
- File storage and retrieval
- Document access via web interface

### 5. Help System
- Dynamic help content loading
- Support for local and remote content
- Topic-based help navigation

### 6. Administrative Features
- User activity audit logs
- Financial reports
- API endpoints for data export

### 7. Security Features
- Session-based authentication
- Transaction logging
- Audit trails for all activities

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

## Usage Guide

### Getting Started
1. Login with one of the test accounts
2. Explore the dashboard to view your account balance
3. Use the transfer functionality to send funds
4. Check your transaction history
5. Update your profile information
6. Send support messages if needed

### Available Features
- **Dashboard**: View account balance and recent transactions
- **Transfers**: Send money to other accounts
- **Transactions**: View complete transaction history
- **Profile**: Update personal information and bio
- **Support**: Send messages to support team
- **Upload**: Upload and manage documents
- **Help**: Access help documentation

### Test Accounts
- Username: `alice`, Password: `password123`
- Username: `bob`, Password: `password123`
- Username: `admin`, Password: `admin123`
- Username: `testuser`, Password: `test123`

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

## Development Scenarios

### Scenario 1: User Management
1. Test user registration and login
2. Explore profile management features
3. Test session handling

### Scenario 2: Banking Operations
1. Test fund transfer functionality
2. Verify transaction history
3. Test account balance calculations

### Scenario 3: File Management
1. Test document upload functionality
2. Verify file storage and retrieval
3. Test file access controls

### Scenario 4: Administrative Features
1. Test admin reporting features
2. Verify audit logging
3. Test API endpoints

## Contributing

This is a development application. If you want to add new features or improvements, please submit a pull request.

## License

This project is for development and testing purposes only. Use responsibly and only in controlled environments.

## Disclaimer

This application is designed for development and testing purposes only. Always follow security best practices in production applications. 