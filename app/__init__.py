from flask import Flask
import os
import sqlite3
from datetime import datetime

def create_app():
    app = Flask(__name__)
    
    # Intentionally weak secret key - vulnerable to session hijacking
    app.config['SECRET_KEY'] = 'buggybank_secret_key_123'
    
    # Disable CSRF protection intentionally
    app.config['WTF_CSRF_ENABLED'] = False
    
    # Create database if it doesn't exist
    init_database()
    
    # Register routes
    from app import routes
    routes.register_routes(app)
    
    return app

def init_database():
    """Initialize the SQLite database with vulnerable schema"""
    conn = sqlite3.connect('database/buggybank.db')
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT,
            balance REAL DEFAULT 1000.0,
            bio TEXT,
            session_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create transactions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_user_id INTEGER,
            to_user_id INTEGER,
            amount REAL NOT NULL,
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (from_user_id) REFERENCES users (id),
            FOREIGN KEY (to_user_id) REFERENCES users (id)
        )
    ''')
    
    # Create support messages table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS support_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Create admin audit logs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admin_audit (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            user_id INTEGER,
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Insert default admin user
    cursor.execute('''
        INSERT OR IGNORE INTO users (username, password, email, balance, bio)
        VALUES (?, ?, ?, ?, ?)
    ''', ('admin', 'admin123', 'admin@buggybank.com', 10000.0, 'System Administrator'))
    
    # Insert some sample users
    sample_users = [
        ('john', 'password123', 'john@example.com', 1500.0, 'Regular user'),
        ('alice', 'password123', 'alice@example.com', 2000.0, 'Another user'),
        ('bob', 'password123', 'bob@example.com', 800.0, 'Test user')
    ]
    
    for user in sample_users:
        cursor.execute('''
            INSERT OR IGNORE INTO users (username, password, email, balance, bio)
            VALUES (?, ?, ?, ?, ?)
        ''', user)
    
    conn.commit()
    conn.close() 