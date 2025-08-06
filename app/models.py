import sqlite3
import hashlib
import os
from datetime import datetime

class Database:
    def __init__(self):
        self.db_path = 'database/buggybank.db'
    
    def get_connection(self):
        return sqlite3.connect(self.db_path)
    
    def execute_query(self, query, params=None):
        """Vulnerable: Direct SQL execution without proper sanitization"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        if params:
            # Intentionally vulnerable - direct string formatting
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        
        result = cursor.fetchall()
        conn.commit()
        conn.close()
        return result

class User:
    def __init__(self):
        self.db = Database()
    
    def authenticate(self, username, password):
        """Vulnerable: SQL Injection - Blind/Time-based"""
        # Intentionally vulnerable query - direct string concatenation
        query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
        
        try:
            result = self.db.execute_query(query)
            if result:
                return result[0]
            return None
        except:
            return None
    
    def get_user_by_id(self, user_id):
        """Vulnerable: SQL Injection"""
        query = f"SELECT * FROM users WHERE id = {user_id}"
        result = self.db.execute_query(query)
        return result[0] if result else None
    
    def update_bio(self, user_id, bio):
        """Vulnerable: Second-Order SQL Injection"""
        query = f"UPDATE users SET bio = '{bio}' WHERE id = {user_id}"
        self.db.execute_query(query)
    
    def get_user_bio(self, user_id):
        """Vulnerable: Used in admin reports - Second-Order SQLi trigger"""
        query = f"SELECT bio FROM users WHERE id = {user_id}"
        result = self.db.execute_query(query)
        return result[0][0] if result else None

class Transaction:
    def __init__(self):
        self.db = Database()
    
    def create_transfer(self, from_user_id, to_user_id, amount, message):
        """Vulnerable: Stored XSS in message field"""
        query = """
        INSERT INTO transactions (from_user_id, to_user_id, amount, message)
        VALUES (?, ?, ?, ?)
        """
        self.db.execute_query(query, (from_user_id, to_user_id, amount, message))
        
        # Update balances
        self.db.execute_query(f"UPDATE users SET balance = balance - {amount} WHERE id = {from_user_id}")
        self.db.execute_query(f"UPDATE users SET balance = balance + {amount} WHERE id = {to_user_id}")
    
    def get_transactions(self, user_id):
        """Vulnerable: IDOR - No proper authorization check"""
        query = f"SELECT * FROM transactions WHERE from_user_id = {user_id} OR to_user_id = {user_id}"
        return self.db.execute_query(query)
    
    def get_all_transactions(self):
        """Vulnerable: Exposes all transactions"""
        query = "SELECT * FROM transactions ORDER BY created_at DESC"
        return self.db.execute_query(query)

class SupportMessage:
    def __init__(self):
        self.db = Database()
    
    def create_message(self, user_id, message):
        """Vulnerable: Stored XSS"""
        query = "INSERT INTO support_messages (user_id, message) VALUES (?, ?)"
        self.db.execute_query(query, (user_id, message))
    
    def get_messages(self):
        """Vulnerable: No access control"""
        query = "SELECT * FROM support_messages ORDER BY created_at DESC"
        return self.db.execute_query(query)

class AdminAudit:
    def __init__(self):
        self.db = Database()
    
    def log_action(self, action, user_id=None, details=None):
        """Vulnerable: No input validation"""
        query = "INSERT INTO admin_audit (action, user_id, details) VALUES (?, ?, ?)"
        self.db.execute_query(query, (action, user_id, details))
    
    def get_audit_logs(self):
        """Vulnerable: No authentication required"""
        query = "SELECT * FROM admin_audit ORDER BY created_at DESC"
        return self.db.execute_query(query) 