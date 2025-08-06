#!/usr/bin/env python3
"""
BuggyBank - Deliberately Vulnerable Web Application
For educational purposes only - DO NOT deploy in production
"""

from app import create_app
import os

app = create_app()

if __name__ == '__main__':
    # Intentionally insecure - no HTTPS, debug mode enabled
    app.run(host='0.0.0.0', port=3000, debug=True) 