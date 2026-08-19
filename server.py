#!/usr/bin/env python3
"""
==============================================================================
Apex Business Finance — Enterprise Multi-User Backend & Security Engine
Zero external dependencies (Python Standard Library: http.server, sqlite3, hashlib, json)
==============================================================================
"""

import http.server
import socketserver
import json
import sqlite3
import os
import hashlib
import mimetypes
from urllib.parse import urlparse, parse_qs
from datetime import datetime

PORT = 5000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, 'database.db')

def hash_password(pwd: str) -> str:
    """Hash password using SHA-256 with project salt."""
    salt = "apex_finance_secure_salt_v2"
    return hashlib.sha256((pwd + salt).encode('utf-8')).hexdigest()

# ----------------------------------------------------------------------------
# Database Setup & Connection
# ----------------------------------------------------------------------------

def get_db():
    conn = sqlite3.connect(DB_FILE, timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA busy_timeout = 30000;")
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # 1. Users & Credentials Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            department TEXT NOT NULL,
            avatar_color TEXT DEFAULT '#6366f1',
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        )
    ''')

    # Column migrations
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN password_hash TEXT DEFAULT ''")
    except Exception:
        pass

    # Default Seed Users with Secure Hashed Passwords
    default_users = [
        ('usr_1', 'Elena Rostova', 'admin@apex.com', hash_password('admin123'), 'admin', 'Management', '#8b5cf6'),
        ('usr_2', 'Alex Rivera', 'alex@apex.com', hash_password('user123'), 'user', 'Sales', '#3b82f6'),
        ('usr_3', 'Priya Sharma', 'priya@apex.com', hash_password('user123'), 'user', 'Engineering', '#10b981'),
        ('usr_4', 'Marcus Vance', 'marcus@apex.com', hash_password('user123'), 'user', 'Marketing', '#ec4899'),
        ('usr_5', 'Sophia Chen', 'sophia.apex.com', hash_password('user123'), 'user', 'Operations', '#f59e0b')
    ]
    for u in default_users:
        cursor.execute('''
            INSERT OR REPLACE INTO users (id, name, email, password_hash, role, department, avatar_color, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        ''', u)

    # 2. Transactions Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            type TEXT NOT NULL,
            category TEXT NOT NULL,
            date TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            is_deleted INTEGER DEFAULT 0,
            deleted_at TEXT DEFAULT NULL,
            deleted_reason TEXT DEFAULT 'Deleted by user',
            user_id TEXT DEFAULT 'usr_1',
            user_name TEXT DEFAULT 'Elena Rostova',
            user_email TEXT DEFAULT 'admin@apex.com',
            department TEXT DEFAULT 'Management',
            avatar_color TEXT DEFAULT '#8b5cf6'
        )
    ''')

    for sql in [
        "ALTER TABLE transactions ADD COLUMN deleted_reason TEXT DEFAULT 'Deleted by user'",
        "ALTER TABLE transactions ADD COLUMN deleted_at TEXT DEFAULT NULL",
        "ALTER TABLE transactions ADD COLUMN user_id TEXT DEFAULT 'usr_1'",
        "ALTER TABLE transactions ADD COLUMN user_name TEXT DEFAULT 'Elena Rostova'",
        "ALTER TABLE transactions ADD COLUMN user_email TEXT DEFAULT 'admin@apex.com'",
        "ALTER TABLE transactions ADD COLUMN department TEXT DEFAULT 'Management'",
        "ALTER TABLE transactions ADD COLUMN avatar_color TEXT DEFAULT '#8b5cf6'"
    ]:
        try:
            cursor.execute(sql)
        except Exception:
            pass

    # 3. Immutable Audit Logs Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            transaction_id TEXT,
            details TEXT NOT NULL,
            user_name TEXT DEFAULT 'System',
            timestamp TEXT DEFAULT (datetime('now', 'localtime'))
        )
    ''')

    # 4. System Settings / Policy Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS system_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT DEFAULT (datetime('now', 'localtime'))
        )
    ''')
    cursor.execute('''
        INSERT OR IGNORE INTO system_settings (key, value)
        VALUES ('immutable_policy_enabled', '1')
    ''')

    # 5. Business Profile Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS business_profile (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            company_name TEXT NOT NULL,
            tax_id TEXT,
            currency_symbol TEXT DEFAULT '₹',
            financial_year TEXT
        )
    ''')
    cursor.execute('''
        INSERT OR IGNORE INTO business_profile (id, company_name, tax_id, currency_symbol, financial_year)
        VALUES (1, 'Apex Business Solutions Pvt. Ltd.', 'GSTIN: 27AABCU9603R1ZN', '₹', '2026-2027')
    ''')

    conn.commit()

    cursor.execute('SELECT COUNT(*) as count FROM transactions')
    if cursor.fetchone()['count'] == 0:
        seed_business_sample_data(conn)

    conn.close()

def log_audit(conn, action, transaction_id, details_dict, user_name='System'):
    cursor = conn.cursor()
    details_json = json.dumps(details_dict, ensure_ascii=False)
    cursor.execute('''
        INSERT INTO audit_logs (action, transaction_id, details, user_name, timestamp)
        VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
    ''', (action, transaction_id, details_json, user_name))
    conn.commit()

def seed_business_sample_data(conn):
    samples = [
        ('tx_b_1', 'Client Retainer — Enterprise Cloud Migration', 185000.0, 'income', 'Client Invoices & Retainers', datetime.now().strftime('%Y-%m-02'), 'usr_2', 'Alex Rivera', 'alex@apex.com', 'Sales', '#3b82f6'),
        ('tx_b_2', 'Monthly Office Lease & Co-working Space', 45000.0, 'expense', 'Office Rent & Facilities', datetime.now().strftime('%Y-%m-03'), 'usr_5', 'Sophia Chen', 'sophia@apex.com', 'Operations', '#f59e0b'),
        ('tx_b_3', 'Core Engineering & Design Team Payroll', 95000.0, 'expense', 'Salaries & Payroll', datetime.now().strftime('%Y-%m-05'), 'usr_1', 'Elena Rostova', 'admin@apex.com', 'Management', '#8b5cf6'),
        ('tx_b_4', 'SaaS Consulting & Custom API Integration', 68000.0, 'income', 'Consulting & Services', datetime.now().strftime('%Y-%m-07'), 'usr_3', 'Priya Sharma', 'priya@apex.com', 'Engineering', '#10b981'),
        ('tx_b_5', 'AWS Cloud Infrastructure & Server Hosting', 12400.0, 'expense', 'Cloud & Software Tools', datetime.now().strftime('%Y-%m-09'), 'usr_3', 'Priya Sharma', 'priya@apex.com', 'Engineering', '#10b981'),
        ('tx_b_6', 'Digital Marketing Campaign & Google Ads', 16500.0, 'expense', 'Marketing & Advertising', datetime.now().strftime('%Y-%m-12'), 'usr_4', 'Marcus Vance', 'marcus@apex.com', 'Marketing', '#ec4899'),
        ('tx_b_7', 'Quarterly High-Yield Corporate Deposit', 8500.0, 'income', 'Investments & Returns', datetime.now().strftime('%Y-%m-14'), 'usr_1', 'Elena Rostova', 'admin@apex.com', 'Management', '#8b5cf6'),
        ('tx_b_8', 'Office Gigabit Internet & Power Utilities', 4800.0, 'expense', 'Utilities & Internet', datetime.now().strftime('%Y-%m-16'), 'usr_5', 'Sophia Chen', 'sophia@apex.com', 'Operations', '#f59e0b')
    ]

    cursor = conn.cursor()
    for tx in samples:
        cursor.execute('''
            INSERT INTO transactions (id, description, amount, type, category, date, is_deleted, deleted_at, deleted_reason, user_id, user_name, user_email, department, avatar_color)
            VALUES (?, ?, ?, ?, ?, ?, 0, NULL, NULL, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                description = excluded.description,
                amount = excluded.amount,
                type = excluded.type,
                category = excluded.category,
                date = excluded.date,
                is_deleted = 0,
                deleted_at = NULL,
                deleted_reason = NULL,
                user_id = excluded.user_id,
                user_name = excluded.user_name,
                user_email = excluded.user_email,
                department = excluded.department,
                avatar_color = excluded.avatar_color
        ''', tx)
        log_audit(conn, 'CREATE', tx[0], {
            'description': tx[1],
            'amount': tx[2],
            'type': tx[3],
            'category': tx[4],
            'date': tx[5],
            'user': tx[7],
            'email': tx[8],
            'department': tx[9]
        }, user_name=tx[7])
    conn.commit()

# ----------------------------------------------------------------------------
# HTTP Request Handler & Business API Endpoints
# ----------------------------------------------------------------------------

class BusinessTrackerHandler(http.server.BaseHTTPRequestHandler):

    def send_json_response(self, status_code, data):
        response_bytes = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(response_bytes)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-User-Name, X-User-Id, X-User-Role')
        self.send_header('Connection', 'close')
        self.end_headers()
        self.wfile.write(response_bytes)
        self.wfile.flush()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-User-Name, X-User-Id, X-User-Role')
        self.send_header('Connection', 'close')
        self.end_headers()

    def do_GET(self):
        try:
            parsed = urlparse(self.path)
            path = parsed.path
            query = parse_qs(parsed.query)

            # Health Check
            if path == '/api/health':
                self.send_json_response(200, {
                    'status': 'online',
                    'service': 'Apex Business Finance Platform',
                    'db': 'SQLite active with WAL mode'
                })
                return

            # Security Policy
            elif path == '/api/admin/policy':
                conn = get_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute("SELECT value FROM system_settings WHERE key = 'immutable_policy_enabled'")
                    row = cursor.fetchone()
                    enabled = (row['value'] == '1' or row['value'].lower() == 'true') if row else True
                finally:
                    conn.close()
                self.send_json_response(200, {
                    'status': 'success',
                    'data': {
                        'immutable_policy_enabled': enabled,
                        'description': 'When enabled, soft-deletes are strictly enforced.'
                    }
                })
                return

            # Users Roster (Pass sanitized without password_hash)
            elif path == '/api/users':
                conn = get_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute("SELECT id, name, email, role, department, avatar_color, is_active FROM users ORDER BY name ASC")
                    users = [dict(r) for r in cursor.fetchall()]
                finally:
                    conn.close()
                self.send_json_response(200, {'status': 'success', 'data': users})
                return

            # Active Transactions (Supports ?user_id= & ?department=)
            elif path == '/api/transactions':
                user_filter = query.get('user_id', [''])[0]
                dept_filter = query.get('department', [''])[0]

                conn = get_db()
                try:
                    cursor = conn.cursor()
                    sql = '''
                        SELECT id, description, amount, type, category, date, created_at,
                               user_id, user_name, user_email, department, avatar_color
                        FROM transactions
                        WHERE is_deleted = 0
                    '''
                    params = []
                    if user_filter:
                        sql += " AND user_id = ?"
                        params.append(user_filter)
                    if dept_filter:
                        sql += " AND department = ?"
                        params.append(dept_filter)

                    sql += " ORDER BY date DESC, created_at DESC"
                    cursor.execute(sql, params)
                    rows = [dict(r) for r in cursor.fetchall()]
                finally:
                    conn.close()
                self.send_json_response(200, {'status': 'success', 'data': rows})
                return

            # Business Profile
            elif path == '/api/business-profile':
                conn = get_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute('SELECT * FROM business_profile WHERE id = 1')
                    profile = dict(cursor.fetchone())
                finally:
                    conn.close()
                self.send_json_response(200, {'status': 'success', 'data': profile})
                return

            # Admin Audit Logs
            elif path == '/api/admin/audit-logs':
                conn = get_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute('''
                        SELECT id, action, transaction_id, details, user_name, timestamp
                        FROM audit_logs
                        ORDER BY id DESC
                        LIMIT 300
                    ''')
                    rows = []
                    for r in cursor.fetchall():
                        item = dict(r)
                        try:
                            item['details'] = json.loads(item['details'])
                        except Exception:
                            pass
                        rows.append(item)
                finally:
                    conn.close()
                self.send_json_response(200, {'status': 'success', 'data': rows})
                return

            # Archived / Soft-Deleted Transactions
            elif path == '/api/admin/deleted':
                conn = get_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute('''
                        SELECT id, description, amount, type, category, date, deleted_at, deleted_reason,
                               user_id, user_name, user_email, department, avatar_color
                        FROM transactions
                        WHERE is_deleted = 1
                        ORDER BY deleted_at DESC
                    ''')
                    rows = [dict(r) for r in cursor.fetchall()]
                finally:
                    conn.close()
                self.send_json_response(200, {'status': 'success', 'data': rows})
                return

            # Financial Statement (P&L)
            elif path == '/api/admin/statement':
                start_date = query.get('start_date', [''])[0]
                end_date = query.get('end_date', [''])[0]
                user_id = query.get('user_id', [''])[0]

                conn = get_db()
                try:
                    cursor = conn.cursor()
                    sql = "SELECT id, description, amount, type, category, date, user_name, department FROM transactions WHERE is_deleted = 0"
                    params = []

                    if start_date:
                        sql += " AND date >= ?"
                        params.append(start_date)
                    if end_date:
                        sql += " AND date <= ?"
                        params.append(end_date)
                    if user_id:
                        sql += " AND user_id = ?"
                        params.append(user_id)

                    sql += " ORDER BY date ASC"
                    cursor.execute(sql, params)
                    txs = [dict(r) for r in cursor.fetchall()]

                    total_revenue = sum(t['amount'] for t in txs if t['type'] == 'income')
                    total_expense = sum(t['amount'] for t in txs if t['type'] == 'expense')
                    net_profit = total_revenue - total_expense
                    profit_margin = round((net_profit / total_revenue * 100), 2) if total_revenue > 0 else 0.0

                    revenue_by_cat = {}
                    expense_by_cat = {}
                    dept_spend = {}

                    for t in txs:
                        cat = t['category']
                        amt = t['amount']
                        dept = t.get('department') or 'General'

                        if t['type'] == 'income':
                            revenue_by_cat[cat] = revenue_by_cat.get(cat, 0) + amt
                        else:
                            expense_by_cat[cat] = expense_by_cat.get(cat, 0) + amt
                            dept_spend[dept] = dept_spend.get(dept, 0) + amt

                    cursor.execute('SELECT * FROM business_profile WHERE id = 1')
                    profile = dict(cursor.fetchone())
                finally:
                    conn.close()

                statement_data = {
                    'profile': profile,
                    'period': {
                        'start_date': start_date or 'Beginning',
                        'end_date': end_date or datetime.now().strftime('%Y-%m-%d'),
                        'generated_at': datetime.now().strftime('%d %b %Y, %I:%M %p')
                    },
                    'summary': {
                        'total_revenue': total_revenue,
                        'total_expense': total_expense,
                        'net_profit': net_profit,
                        'profit_margin_percent': profit_margin,
                        'transaction_count': len(txs)
                    },
                    'revenue_breakdown': revenue_by_cat,
                    'expense_breakdown': expense_by_cat,
                    'department_spending': dept_spend,
                    'transactions': txs
                }
                self.send_json_response(200, {'status': 'success', 'data': statement_data})
                return

            # Team Spending Analytics
            elif path == '/api/admin/team-analytics':
                conn = get_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute('''
                        SELECT user_id, user_name, department, avatar_color,
                               COUNT(*) as tx_count,
                               SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as total_spent,
                               SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as total_revenue
                        FROM transactions
                        WHERE is_deleted = 0
                        GROUP BY user_id
                        ORDER BY total_spent DESC
                    ''')
                    user_stats = [dict(r) for r in cursor.fetchall()]

                    cursor.execute('''
                        SELECT department,
                               COUNT(*) as tx_count,
                               SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as total_spent,
                               SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as total_revenue
                        FROM transactions
                        WHERE is_deleted = 0
                        GROUP BY department
                        ORDER BY total_spent DESC
                    ''')
                    dept_stats = [dict(r) for r in cursor.fetchall()]
                finally:
                    conn.close()

                self.send_json_response(200, {
                    'status': 'success',
                    'data': {
                        'by_user': user_stats,
                        'by_department': dept_stats
                    }
                })
                return

            self.serve_static_file(path)
        except Exception as e:
            self.send_json_response(500, {'status': 'error', 'message': str(e)})

    def do_POST(self):
        try:
            parsed = urlparse(self.path)
            path = parsed.path
            length = int(self.headers.get('Content-Length', 0))
            body = {}

            if length > 0:
                try:
                    body = json.loads(self.rfile.read(length).decode('utf-8'))
                except Exception:
                    self.send_json_response(400, {'status': 'error', 'message': 'Invalid JSON format.'})
                    return

            operator_user = self.headers.get('X-User-Name') or body.get('operator_user') or 'Staff'

            # 1. User Authentication: Login
            if path == '/api/auth/login':
                email = body.get('email', '').strip().lower()
                password = body.get('password', '')

                if not email or not password:
                    self.send_json_response(400, {'status': 'error', 'message': 'Email and password are required.'})
                    return

                pwd_hash = hash_password(password)
                conn = get_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute("SELECT id, name, email, role, department, avatar_color, password_hash FROM users WHERE LOWER(email) = ?", (email,))
                    user = cursor.fetchone()

                    if not user or user['password_hash'] != pwd_hash:
                        self.send_json_response(401, {'status': 'error', 'message': 'Invalid email or password.'})
                        return

                    user_dict = {
                        'id': user['id'],
                        'name': user['name'],
                        'email': user['email'],
                        'role': user['role'],
                        'department': user['department'],
                        'avatar_color': user['avatar_color'],
                        'token': f"sess_{user['id']}_{int(datetime.now().timestamp())}"
                    }
                    log_audit(conn, 'USER_LOGIN', user['id'], {'email': email}, user_name=user['name'])
                finally:
                    conn.close()

                self.send_json_response(200, {'status': 'success', 'message': 'Login successful', 'data': user_dict})
                return

            # 2. User Authentication: Register
            elif path == '/api/auth/register':
                name = body.get('name', '').strip()
                email = body.get('email', '').strip().lower()
                password = body.get('password', '')
                dept = body.get('department', 'General').strip()
                role = body.get('role', 'user').strip()
                color = body.get('avatar_color', '#6366f1')

                if not name or not email or not password:
                    self.send_json_response(400, {'status': 'error', 'message': 'Name, email, and password are required.'})
                    return

                if len(password) < 6:
                    self.send_json_response(400, {'status': 'error', 'message': 'Password must be at least 6 characters.'})
                    return

                u_id = f"usr_{int(datetime.now().timestamp()*1000)}"
                pwd_hash = hash_password(password)

                conn = get_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute("SELECT id FROM users WHERE LOWER(email) = ?", (email,))
                    if cursor.fetchone():
                        self.send_json_response(400, {'status': 'error', 'message': 'An account with this email already exists.'})
                        return

                    cursor.execute('''
                        INSERT INTO users (id, name, email, password_hash, role, department, avatar_color, is_active)
                        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                    ''', (u_id, name, email, pwd_hash, role, dept, color))

                    user_dict = {
                        'id': u_id,
                        'name': name,
                        'email': email,
                        'role': role,
                        'department': dept,
                        'avatar_color': color,
                        'token': f"sess_{u_id}_{int(datetime.now().timestamp())}"
                    }
                    log_audit(conn, 'USER_REGISTER', u_id, {'name': name, 'email': email, 'role': role, 'dept': dept}, user_name=name)
                finally:
                    conn.close()

                self.send_json_response(201, {'status': 'success', 'message': 'Account registered successfully', 'data': user_dict})
                return

            # 3. Create / Record Transaction
            elif path == '/api/transactions':
                desc = body.get('description', '').strip()
                amount = body.get('amount')
                tx_type = body.get('type')
                category = body.get('category')
                date_str = body.get('date')
                tx_id = body.get('id') or f"tx_{int(datetime.now().timestamp()*1000)}"
                
                user_id = body.get('user_id', 'usr_1')
                user_name = body.get('user_name', 'Elena Rostova')
                user_email = body.get('user_email', 'admin@apex.com')
                department = body.get('department', 'Management')
                avatar_color = body.get('avatar_color', '#8b5cf6')

                if not desc or amount is None or not tx_type or not category or not date_str:
                    self.send_json_response(400, {'status': 'error', 'message': 'Missing required fields.'})
                    return

                conn = get_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute('''
                        INSERT INTO transactions (
                            id, description, amount, type, category, date, is_deleted,
                            user_id, user_name, user_email, department, avatar_color
                        )
                        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
                        ON CONFLICT(id) DO UPDATE SET
                            description = excluded.description,
                            amount = excluded.amount,
                            type = excluded.type,
                            category = excluded.category,
                            date = excluded.date,
                            is_deleted = 0,
                            deleted_at = NULL,
                            deleted_reason = NULL,
                            user_id = excluded.user_id,
                            user_name = excluded.user_name,
                            user_email = excluded.user_email,
                            department = excluded.department,
                            avatar_color = excluded.avatar_color
                    ''', (tx_id, desc, float(amount), tx_type, category, date_str, user_id, user_name, user_email, department, avatar_color))

                    log_audit(conn, 'CREATE', tx_id, {
                        'description': desc,
                        'amount': float(amount),
                        'type': tx_type,
                        'category': category,
                        'date': date_str,
                        'created_by': user_name,
                        'department': department
                    }, user_name=user_name)
                finally:
                    conn.close()

                self.send_json_response(201, {'status': 'success', 'message': 'Transaction recorded successfully', 'id': tx_id})
                return

            # 4. Toggle Immutable Policy
            elif path == '/api/admin/policy/toggle':
                conn = get_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute("SELECT value FROM system_settings WHERE key = 'immutable_policy_enabled'")
                    row = cursor.fetchone()
                    current = (row['value'] == '1' or row['value'].lower() == 'true') if row else True
                    new_val = '0' if current else '1'
                    new_bool = (new_val == '1')

                    cursor.execute("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('immutable_policy_enabled', ?, datetime('now', 'localtime'))", (new_val,))
                    log_audit(conn, 'POLICY_TOGGLE', None, {
                        'policy': 'immutable_policy_enabled',
                        'previous': current,
                        'new_state': new_bool
                    }, user_name=operator_user)
                finally:
                    conn.close()

                self.send_json_response(200, {
                    'status': 'success',
                    'data': {
                        'immutable_policy_enabled': new_bool,
                        'message': f'Immutable Policy is now {"ENABLED (Strict Audit Compliance)" if new_bool else "DISABLED (Permanent Purge Permitted)"}'
                    }
                })
                return

            # 5. Restore Deleted Transaction
            elif path.startswith('/api/admin/restore/'):
                tx_id = path.replace('/api/admin/restore/', '').strip()
                conn = get_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute('SELECT * FROM transactions WHERE id = ?', (tx_id,))
                    target = cursor.fetchone()

                    if not target:
                        self.send_json_response(404, {'status': 'error', 'message': 'Transaction not found in archive.'})
                        return

                    cursor.execute('UPDATE transactions SET is_deleted = 0, deleted_at = NULL WHERE id = ?', (tx_id,))
                    log_audit(conn, 'RESTORE', tx_id, {
                        'description': target['description'],
                        'amount': target['amount'],
                        'type': target['type']
                    }, user_name=operator_user)
                finally:
                    conn.close()

                self.send_json_response(200, {'status': 'success', 'message': f'Restored "{target["description"]}"'})
                return

            # 6. Purge All Deleted Records
            elif path == '/api/admin/purge-all':
                conn = get_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute("SELECT value FROM system_settings WHERE key = 'immutable_policy_enabled'")
                    row = cursor.fetchone()
                    immutable = (row['value'] == '1' or row['value'].lower() == 'true') if row else True

                    if immutable:
                        self.send_json_response(403, {'status': 'error', 'message': 'Immutable Audit Policy is ACTIVE. Permanent purge prohibited.'})
                        return

                    cursor.execute("SELECT COUNT(*) as count FROM transactions WHERE is_deleted = 1")
                    del_count = cursor.fetchone()['count']
                    cursor.execute("DELETE FROM transactions WHERE is_deleted = 1")
                    log_audit(conn, 'PERMANENT_PURGE_ALL', None, {'purged_count': del_count}, user_name=operator_user)
                finally:
                    conn.close()

                self.send_json_response(200, {'status': 'success', 'message': f'Permanently purged {del_count} archived records.'})
                return

            # 7. Update Business Profile
            elif path == '/api/business-profile':
                company_name = body.get('company_name', 'Apex Business Solutions Pvt. Ltd.')
                tax_id = body.get('tax_id', '')
                financial_year = body.get('financial_year', '2026-2027')
                conn = get_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute('UPDATE business_profile SET company_name = ?, tax_id = ?, financial_year = ? WHERE id = 1', (company_name, tax_id, financial_year))
                    log_audit(conn, 'PROFILE_UPDATE', None, {'company_name': company_name, 'tax_id': tax_id}, user_name=operator_user)
                finally:
                    conn.close()
                self.send_json_response(200, {'status': 'success', 'message': 'Business profile updated.'})
                return

            # 8. Reset / Sample Data
            elif path == '/api/reset':
                conn = get_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute('UPDATE transactions SET is_deleted = 1, deleted_at = datetime("now", "localtime"), deleted_reason = "Admin Reset" WHERE is_deleted = 0')
                    log_audit(conn, 'RESET', None, {'timestamp': datetime.now().isoformat()}, user_name=operator_user)
                finally:
                    conn.close()
                self.send_json_response(200, {'status': 'success', 'message': 'All active transactions archived.'})
                return

            elif path == '/api/sample-data':
                conn = get_db()
                try:
                    seed_business_sample_data(conn)
                finally:
                    conn.close()
                self.send_json_response(200, {'status': 'success', 'message': 'Sample multi-user dataset reloaded.'})
                return

            self.send_json_response(404, {'status': 'error', 'message': 'Route not found'})
        except Exception as e:
            self.send_json_response(500, {'status': 'error', 'message': str(e)})

    def do_DELETE(self):
        try:
            parsed = urlparse(self.path)
            path = parsed.path
            operator_user = self.headers.get('X-User-Name') or 'Staff'

            if path.startswith('/api/admin/purge/'):
                tx_id = path.replace('/api/admin/purge/', '').strip()
                conn = get_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute("SELECT value FROM system_settings WHERE key = 'immutable_policy_enabled'")
                    row = cursor.fetchone()
                    immutable = (row['value'] == '1' or row['value'].lower() == 'true') if row else True

                    if immutable:
                        self.send_json_response(403, {'status': 'error', 'message': 'Immutable Audit Policy is ACTIVE. Permanent deletion prohibited.'})
                        return

                    cursor.execute('SELECT * FROM transactions WHERE id = ?', (tx_id,))
                    target = cursor.fetchone()
                    if not target:
                        self.send_json_response(404, {'status': 'error', 'message': 'Transaction not found.'})
                        return

                    cursor.execute('DELETE FROM transactions WHERE id = ?', (tx_id,))
                    log_audit(conn, 'PERMANENT_PURGE', tx_id, {'description': target['description']}, user_name=operator_user)
                finally:
                    conn.close()

                self.send_json_response(200, {'status': 'success', 'message': f'Permanently purged "{target["description"]}".'})
                return

            elif path.startswith('/api/transactions/'):
                tx_id = path.replace('/api/transactions/', '').strip()
                conn = get_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute('SELECT * FROM transactions WHERE id = ? AND is_deleted = 0', (tx_id,))
                    target = cursor.fetchone()

                    if not target:
                        self.send_json_response(404, {'status': 'error', 'message': 'Active transaction not found.'})
                        return

                    cursor.execute('''
                        UPDATE transactions
                        SET is_deleted = 1, deleted_at = datetime('now', 'localtime'), deleted_reason = 'Deleted via User App'
                        WHERE id = ?
                    ''', (tx_id,))

                    log_audit(conn, 'DELETE', tx_id, {
                        'description': target['description'],
                        'amount': target['amount'],
                        'type': target['type'],
                        'deleted_by': operator_user
                    }, user_name=operator_user)
                finally:
                    conn.close()

                self.send_json_response(200, {'status': 'success', 'message': f'Archived "{target["description"]}" to Trash.'})
                return

            self.send_json_response(404, {'status': 'error', 'message': 'Route not found'})
        except Exception as e:
            self.send_json_response(500, {'status': 'error', 'message': str(e)})

    def serve_static_file(self, path):
        if path in ('/', ''):
            path = '/index.html'

        safe_path = os.path.normpath(path.lstrip('/\\'))
        full_path = os.path.abspath(os.path.join(BASE_DIR, safe_path))

        try:
            if os.path.commonpath([BASE_DIR, full_path]) != BASE_DIR:
                self.send_response(403)
                self.end_headers()
                self.wfile.write(b"<h1>403 Forbidden</h1>")
                return
        except Exception:
            self.send_response(400)
            self.end_headers()
            return

        if not os.path.exists(full_path) or os.path.isdir(full_path):
            self.send_response(404)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(b"<h1>404 Not Found</h1>")
            return

        mime_type, _ = mimetypes.guess_type(full_path)
        if not mime_type:
            mime_type = 'application/octet-stream'

        try:
            with open(full_path, 'rb') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', f'{mime_type}; charset=utf-8' if 'text' in mime_type or 'javascript' in mime_type or 'json' in mime_type else mime_type)
            self.send_header('Content-Length', str(len(content)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Connection', 'close')
            self.end_headers()
            self.wfile.write(content)
            self.wfile.flush()
        except Exception as e:
            self.send_response(500)
            self.send_header('Connection', 'close')
            self.end_headers()
            self.wfile.write(str(e).encode('utf-8'))
            self.wfile.flush()

    def log_message(self, format, *args):
        pass

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

def run_server():
    import sys
    if hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass

    init_db()
    print("=" * 70)
    print(" [APEX FINANCE] Enterprise Multi-User Platform with Password Auth")
    print("=" * 70)
    print(f" * Portal Login    : http://localhost:{PORT}/login.html")
    print(f" * Staff Hub       : http://localhost:{PORT}")
    print(f" * Admin Portal    : http://localhost:{PORT}/admin.html")
    print(f" * Transactions    : http://localhost:{PORT}/transactions.html")
    print(f" * Analytics       : http://localhost:{PORT}/analytics.html")
    print(f" * Statements      : http://localhost:{PORT}/statements.html")
    print(f" * Database File   : {DB_FILE}")
    print("=" * 70)

    with ThreadedHTTPServer(("", PORT), BusinessTrackerHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server gracefully...")
            httpd.server_close()

if __name__ == '__main__':
    run_server()
