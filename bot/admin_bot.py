#!/usr/bin/env python3
"""
Admin Bot for BuggyBank
Simulates an admin reviewing support messages
Vulnerable to stored XSS attacks
"""

import sqlite3
import time
import random
from datetime import datetime

class AdminBot:
    def __init__(self):
        self.db_path = 'database/buggybank.db'
    
    def get_connection(self):
        return sqlite3.connect(self.db_path)
    
    def review_messages(self):
        """Simulates admin reviewing support messages"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Get all support messages
        cursor.execute("SELECT * FROM support_messages ORDER BY created_at DESC")
        messages = cursor.fetchall()
        
        print(f"[{datetime.now()}] Admin bot reviewing {len(messages)} messages...")
        
        for message in messages:
            msg_id, user_id, content, created_at = message
            print(f"[{datetime.now()}] Reviewing message {msg_id} from user {user_id}")
            print(f"Content: {content}")
            
            # Vulnerable: Admin bot processes message content without sanitization
            # This allows XSS attacks to execute in the admin context
            if '<script>' in content.lower():
                print(f"[{datetime.now()}] WARNING: Potential XSS detected in message {msg_id}")
            
            # Simulate admin processing time
            time.sleep(random.uniform(1, 3))
        
        conn.close()
        print(f"[{datetime.now()}] Admin bot finished reviewing messages")
    
    def run(self, interval=30):
        """Run the admin bot continuously"""
        print(f"[{datetime.now()}] Admin bot started - checking messages every {interval} seconds")
        
        while True:
            try:
                self.review_messages()
                time.sleep(interval)
            except KeyboardInterrupt:
                print(f"[{datetime.now()}] Admin bot stopped")
                break
            except Exception as e:
                print(f"[{datetime.now()}] Error in admin bot: {e}")
                time.sleep(interval)

if __name__ == "__main__":
    bot = AdminBot()
    bot.run() 