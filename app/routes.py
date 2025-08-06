from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify, send_file
from app.models import User, Transaction, SupportMessage, AdminAudit
import os
import time
from datetime import datetime

# Initialize models
user_model = User()
transaction_model = Transaction()
support_model = SupportMessage()
audit_model = AdminAudit()

def register_routes(app):
    
    @app.route('/')
    def index():
        """Home page"""
        return render_template('index.html')
    
    @app.route('/login', methods=['GET', 'POST'])
    def login():
        """Vulnerable: SQL Injection (Blind, Time-Based)"""
        if request.method == 'POST':
            username = request.form.get('username')
            password = request.form.get('password')
            
            # Intentionally vulnerable authentication
            user = user_model.authenticate(username, password)
            
            if user:
                # Vulnerable: Session fixation - no session rotation
                session['user_id'] = user[0]
                session['username'] = user[1]
                # Intentionally insecure cookies
                session.permanent = True
                return redirect(url_for('dashboard'))
            else:
                flash('Invalid credentials', 'error')
        
        return render_template('login.html')
    
    @app.route('/register', methods=['GET', 'POST'])
    def register():
        """Vulnerable: No input validation"""
        if request.method == 'POST':
            username = request.form.get('username')
            password = request.form.get('password')
            email = request.form.get('email')
            
            # Vulnerable: Direct SQL insertion
            query = f"INSERT INTO users (username, password, email) VALUES ('{username}', '{password}', '{email}')"
            try:
                user_model.db.execute_query(query)
                flash('Registration successful!', 'success')
                return redirect(url_for('login'))
            except:
                flash('Registration failed', 'error')
        
        return render_template('register.html')
    
    @app.route('/dashboard')
    def dashboard():
        """Dashboard - requires authentication"""
        if 'user_id' not in session:
            return redirect(url_for('login'))
        
        user = user_model.get_user_by_id(session['user_id'])
        transactions = transaction_model.get_transactions(session['user_id'])
        
        return render_template('dashboard.html', user=user, transactions=transactions)
    
    @app.route('/transfer', methods=['GET', 'POST'])
    def transfer():
        """Vulnerable: Stored XSS in transfer message"""
        if 'user_id' not in session:
            return redirect(url_for('login'))
        
        if request.method == 'POST':
            to_username = request.form.get('to_username')
            amount = float(request.form.get('amount'))
            message = request.form.get('message', '')
            
            # Vulnerable: No input validation for XSS
            # The message will be displayed to recipient without sanitization
            
            # Get recipient user
            query = f"SELECT * FROM users WHERE username = '{to_username}'"
            recipient = user_model.db.execute_query(query)
            
            if recipient:
                transaction_model.create_transfer(session['user_id'], recipient[0][0], amount, message)
                flash('Transfer successful!', 'success')
            else:
                flash('Recipient not found', 'error')
        
        return render_template('transfer.html')
    
    @app.route('/profile/update-bio', methods=['GET', 'POST'])
    def update_bio():
        """Vulnerable: Second-Order SQL Injection"""
        if 'user_id' not in session:
            return redirect(url_for('login'))
        
        if request.method == 'POST':
            bio = request.form.get('bio', '')
            # Vulnerable: Direct SQL injection in bio field
            user_model.update_bio(session['user_id'], bio)
            flash('Bio updated!', 'success')
            return redirect(url_for('profile'))
        
        return render_template('update_bio.html')
    
    @app.route('/profile')
    def profile():
        """User profile page"""
        if 'user_id' not in session:
            return redirect(url_for('login'))
        
        user = user_model.get_user_by_id(session['user_id'])
        return render_template('profile.html', user=user)
    
    @app.route('/admin/reports')
    def admin_reports():
        """Vulnerable: Forced Browsing + Second-Order SQLi Trigger"""
        # No authentication required - forced browsing vulnerability
        
        # Vulnerable: Second-Order SQL Injection trigger
        # This executes the bio field that was stored earlier
        users = user_model.db.execute_query("SELECT id, username, bio FROM users")
        
        # Process each user's bio (triggers stored SQL injection)
        processed_users = []
        for user in users:
            user_id, username, bio = user
            if bio:
                # Vulnerable: Executes the bio content as SQL
                try:
                    # This will execute whatever SQL was stored in the bio field
                    user_model.db.execute_query(bio)
                except:
                    pass
            processed_users.append((user_id, username, bio))
        
        return render_template('admin_reports.html', users=processed_users)
    
    @app.route('/support/messages', methods=['GET', 'POST'])
    def support_messages():
        """Vulnerable: Stored XSS + Cookie Theft (via Admin Bot)"""
        if 'user_id' not in session:
            return redirect(url_for('login'))
        
        if request.method == 'POST':
            message = request.form.get('message', '')
            # Vulnerable: Stored XSS - message will be viewed by admin bot
            support_model.create_message(session['user_id'], message)
            flash('Message sent to support!', 'success')
        
        messages = support_model.get_messages()
        return render_template('support_messages.html', messages=messages)
    
    @app.route('/transaction-history')
    def transaction_history():
        """Vulnerable: IDOR - URL manipulation reveals other users' transactions"""
        if 'user_id' not in session:
            return redirect(url_for('login'))
        
        # Vulnerable: IDOR - user_id can be manipulated in URL
        user_id = request.args.get('user_id', session['user_id'])
        
        # No authorization check - can view any user's transactions
        transactions = transaction_model.get_transactions(user_id)
        return render_template('transaction_history.html', transactions=transactions)
    
    @app.route('/upload-document', methods=['GET', 'POST'])
    def upload_document():
        """Vulnerable: RFI/LFI + Insecure Upload"""
        if 'user_id' not in session:
            return redirect(url_for('login'))
        
        if request.method == 'POST':
            if 'file' not in request.files:
                flash('No file selected', 'error')
                return redirect(request.url)
            
            file = request.files['file']
            if file.filename == '':
                flash('No file selected', 'error')
                return redirect(request.url)
            
            # Vulnerable: No file type validation
            # Allows upload of .php, .jsp, .asp, etc.
            filename = file.filename
            file.save(os.path.join('uploads', filename))
            flash('File uploaded successfully!', 'success')
        
        return render_template('upload_document.html')
    
    @app.route('/account/settings', methods=['GET', 'POST'])
    def account_settings():
        """Vulnerable: Session Fixation + Insecure Cookies"""
        if 'user_id' not in session:
            return redirect(url_for('login'))
        
        if request.method == 'POST':
            # Vulnerable: No session rotation
            # Intentionally insecure cookie settings
            session['theme'] = request.form.get('theme', 'light')
            flash('Settings updated!', 'success')
        
        return render_template('account_settings.html')
    
    @app.route('/api/transactions', methods=['GET'])
    def api_transactions():
        """Vulnerable: Missing Rate Limiting"""
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        
        # Vulnerable: No rate limiting
        # Repeated requests not throttled
        transactions = transaction_model.get_transactions(session['user_id'])
        
        result = []
        for t in transactions:
            result.append({
                'id': t[0],
                'from_user_id': t[1],
                'to_user_id': t[2],
                'amount': t[3],
                'message': t[4],
                'created_at': t[5]
            })
        
        return jsonify(result)
    
    @app.route('/funds/transfer', methods=['POST'])
    def funds_transfer():
        """Vulnerable: CSRF + No Rate Limiting"""
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        
        # Vulnerable: No CSRF protection
        # No rate limiting for brute force attacks
        
        data = request.get_json()
        to_user_id = data.get('to_user_id')
        amount = float(data.get('amount'))
        message = data.get('message', '')
        
        transaction_model.create_transfer(session['user_id'], to_user_id, amount, message)
        
        return jsonify({'success': True})
    
    @app.route('/logout')
    def logout():
        """Vulnerable: Session Management Weakness"""
        # Vulnerable: Session not properly invalidated
        # Session data remains in database
        session.clear()
        return redirect(url_for('index'))
    
    @app.route('/help')
    def help_page():
        """Vulnerable: Local File Inclusion / Remote File Inclusion"""
        topic = request.args.get('topic', 'welcome')
        
        # Vulnerable: Direct file inclusion without validation
        # Allows path traversal: ?topic=../etc/passwd
        try:
            file_path = f"help/{topic}.txt"
            with open(file_path, 'r') as f:
                content = f.read()
        except:
            content = "Help topic not found."
        
        return render_template('help.html', content=content, topic=topic)
    
    @app.route('/admin/user-audit')
    def admin_user_audit():
        """Vulnerable: Forced Browsing"""
        # No authentication required - hidden admin page
        audit_logs = audit_model.get_audit_logs()
        return render_template('admin_user_audit.html', logs=audit_logs)
    
    @app.route('/api/v1/transactions/export')
    def api_transactions_export():
        """Vulnerable: Forced Browsing / Data Leakage"""
        # No authentication required - legacy API
        # Exposes sensitive transaction data
        transactions = transaction_model.get_all_transactions()
        
        result = []
        for t in transactions:
            result.append({
                'id': t[0],
                'from_user_id': t[1],
                'to_user_id': t[2],
                'amount': t[3],
                'message': t[4],
                'created_at': t[5]
            })
        
        return jsonify(result)
    
    @app.route('/api/v1/users/list')
    def api_users_list():
        """Vulnerable: Forced Browsing / Data Exposure"""
        # No authentication required - legacy API
        # Exposes user information
        users = user_model.db.execute_query("SELECT id, username, email, balance FROM users")
        
        result = []
        for u in users:
            result.append({
                'id': u[0],
                'username': u[1],
                'email': u[2],
                'balance': u[3]
            })
        
        return jsonify(result)
    
    @app.route('/old-login', methods=['GET', 'POST'])
    def old_login():
        """Vulnerable: Forced Browsing / Weak Auth"""
        # Legacy login page - no MFA, no rate limiting
        if request.method == 'POST':
            username = request.form.get('username')
            password = request.form.get('password')
            
            # Vulnerable: Weak authentication
            user = user_model.authenticate(username, password)
            
            if user:
                session['user_id'] = user[0]
                session['username'] = user[1]
                return redirect(url_for('dashboard'))
            else:
                flash('Invalid credentials', 'error')
        
        return render_template('old_login.html')
    
    @app.route('/profile/edit-legacy', methods=['GET', 'POST'])
    def profile_edit_legacy():
        """Vulnerable: Forced Browsing / Missing Validation"""
        if 'user_id' not in session:
            return redirect(url_for('login'))
        
        if request.method == 'POST':
            # Vulnerable: No input validation
            name = request.form.get('name', '')
            email = request.form.get('email', '')
            
            # Vulnerable: Direct SQL injection
            query = f"UPDATE users SET username = '{name}', email = '{email}' WHERE id = {session['user_id']}"
            user_model.db.execute_query(query)
            flash('Profile updated!', 'success')
        
        user = user_model.get_user_by_id(session['user_id'])
        return render_template('profile_edit_legacy.html', user=user)
    
    @app.route('/search')
    def search():
        """Vulnerable: DOM XSS"""
        query = request.args.get('q', '')
        # Vulnerable: User input reflected in DOM using innerHTML
        return render_template('search.html', query=query)
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return render_template('404.html'), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return render_template('500.html'), 500 