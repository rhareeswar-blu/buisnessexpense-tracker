#!/usr/bin/env python3
"""
==============================================================================
Apex Business Finance — Enterprise Multi-User Backend & Policy Engine
Zero external dependencies (Python Standard Library: http.server, sqlite3, json)
==============================================================================
"""

import http.server
import socketserver
import json
import sqlite3
import os
import mimetypes
from urllib.parse import urlparse, parse_qs
from datetime import datetime

PORT = 5000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, 'database.db')

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

    # 1. Transactions Table
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
            department TEXT DEFAULT 'Management',
            avatar_color TEXT DEFAULT '#8b5cf6'
        )
    ''')

    # Ensure schema migrations for existing database files
    migrations = [
        ("ALTER TABLE transactions ADD COLUMN deleted_reason TEXT DEFAULT 'Deleted by user'"),
        ("ALTER TABLE transactions ADD COLUMN deleted_at TEXT DEFAULT NULL"),
        ("ALTER TABLE transactions ADD COLUMN user_id TEXT DEFAULT 'usr_1'"),
        ("ALTER TABLE transactions ADD COLUMN user_name TEXT DEFAULT 'Elena Rostova'"),
        ("ALTER TABLE transactions ADD COLUMN department TEXT DEFAULT 'Management'"),
        ("ALTER TABLE transactions ADD COLUMN avatar_color TEXT DEFAULT '#8b5cf6'")
    ]
    for sql in migrations:
        try:
            cursor.execute(sql)
        except Exception:
            pass

    # 2. Immutable Audit Logs Table
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
    try:
        cursor.execute("ALTER TABLE audit_logs ADD COLUMN user_name TEXT DEFAULT 'System'")
    except Exception:
        pass

    # 3. System Settings / Policy Table (Controls Immutable vs Purge mode)
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

    # 4. Multi-User Team Roster Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            role TEXT NOT NULL,
            department TEXT NOT NULL,
            avatar_color TEXT DEFAULT '#6366f1',
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        )
    ''')

    # Seed Default Team Members
    default_users = [
        ('usr_1', 'Elena Rostova', 'elena.rostova@apexsolutions.com', 'Finance Director (Admin)', 'Management', '#8b5cf6'),
        ('usr_2', 'Alex Rivera', 'alex.rivera@apexsolutions.com', 'Enterprise Sales Lead', 'Sales', '#3b82f6'),
        ('usr_3', 'Priya Sharma', 'priya.sharma@apexsolutions.com', 'Principal Cloud Architect', 'Engineering', '#10b981'),
        ('usr_4', 'Marcus Vance', 'marcus.vance@apexsolutions.com', 'Marketing Director', 'Marketing', '#ec4899'),
        ('usr_5', 'Sophia Chen', 'sophia.chen@apexsolutions.com', 'Operations Specialist', 'Operations', '#f59e0b')
    ]
    for u in default_users:
        cursor.execute('''
            INSERT OR IGNORE INTO users (id, name, email, role, department, avatar_color, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)
        ''', u)

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

    # Seed initial business transactions if empty
    cursor.execute('SELECT COUNT(*) as count FROM transactions')
    if cursor.fetchone()['count'] == 0:
        seed_business_sample_data(conn)

    conn.close()

def log_audit(conn, action, transaction_id, details_dict, user_name='Executive Admin'):
    cursor = conn.cursor()
    details_json = json.dumps(details_dict, ensure_ascii=False)
    cursor.execute('''
        INSERT INTO audit_logs (action, transaction_id, details, user_name, timestamp)
        VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
    ''', (action, transaction_id, details_json, user_name))
    conn.commit()

def seed_business_sample_data(conn):
    samples = [
        ('tx_b_1', 'Client Retainer — Enterprise Cloud Migration', 185000.0, 'income', 'Client Invoices & Retainers', datetime.now().strftime('%Y-%m-02'), 'usr_2', 'Alex Rivera', 'Sales', '#3b82f6'),
        ('tx_b_2', 'Monthly Office Lease & Co-working Space', 45000.0, 'expense', 'Office Rent & Facilities', datetime.now().strftime('%Y-%m-03'), 'usr_5', 'Sophia Chen', 'Operations', '#f59e0b'),
        ('tx_b_3', 'Core Engineering & Design Team Payroll', 95000.0, 'expense', 'Salaries & Payroll', datetime.now().strftime('%Y-%m-05'), 'usr_1', 'Elena Rostova', 'Management', '#8b5cf6'),
        ('tx_b_4', 'SaaS Consulting & Custom API Integration', 68000.0, 'income', 'Consulting & Services', datetime.now().strftime('%Y-%m-07'), 'usr_3', 'Priya Sharma', 'Engineering', '#10b981'),
        ('tx_b_5', 'AWS Cloud Infrastructure & Server Hosting', 12400.0, 'expense', 'Cloud & Software Tools', datetime.now().strftime('%Y-%m-09'), 'usr_3', 'Priya Sharma', 'Engineering', '#10b981'),
        ('tx_b_6', 'Digital Marketing Campaign & Google Ads', 16500.0, 'expense', 'Marketing & Advertising', datetime.now().strftime('%Y-%m-12'), 'usr_4', 'Marcus Vance', 'Marketing', '#ec4899'),
        ('tx_b_7', 'Quarterly High-Yield Corporate Deposit', 8500.0, 'income', 'Investments & Returns', datetime.now().strftime('%Y-%m-14'), 'usr_1', 'Elena Rostova', 'Management', '#8b5cf6'),
        ('tx_b_8', 'Office Gigabit Internet & Power Utilities', 4800.0, 'expense', 'Utilities & Internet', datetime.now().strftime('%Y-%m-16'), 'usr_5', 'Sophia Chen', 'Operations', '#f59e0b')
    ]

    cursor = conn.cursor()
    for tx in samples:
        cursor.execute('''
            INSERT INTO transactions (id, description, amount, type, category, date, is_deleted, deleted_at, deleted_reason, user_id, user_name, department, avatar_color)
            VALUES (?, ?, ?, ?, ?, ?, 0, NULL, NULL, ?, ?, ?, ?)
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
            'department': tx[8],
            'note': 'Enterprise Multi-User Sample'
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
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-User-Name')
        self.send_header('Connection', 'close')
        self.end_headers()
        self.wfile.write(response_bytes)
        self.wfile.flush()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-User-Name')
        self.send_header('Connection', 'close')
        self.end_headers()

    def do_GET(self):
        try:
            parsed = urlparse(self.path)
            path = parsed.path
            query = parse_qs(parsed.query)

            # 1. Health Status
            if path == '/api/health':
                self.send_json_response(200, {
                    'status': 'online',
                    'service': 'Apex Business Finance Platform',
                    'db': 'SQLite active with WAL mode'
                })
                return

            # 2. Get System Security Policy (Immutable Policy status)
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
                        'description': 'When enabled, transactions are archived with soft-deletes only. When disabled, administrators may permanently purge records.'
                    }
                })
                return

            # 3. Get Multi-User Team Roster
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

            # 4. Get Active Transactions
            elif path == '/api/transactions':
                user_filter = query.get('user_id', [''])[0]
                dept_filter = query.get('department', [''])[0]

                conn = get_db()
                try:
                    cursor = conn.cursor()
                    sql = '''
                        SELECT id, description, amount, type, category, date, created_at,
                               user_id, user_name, department, avatar_color
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

            # 5. Get Business Profile
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

            # 6. Admin API: Full Audit Log Ledger
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

            # 7. Admin API: Get All Deleted / Archived Transactions (Immutable Trash)
            elif path == '/api/admin/deleted':
                conn = get_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute('''
                        SELECT id, description, amount, type, category, date, deleted_at, deleted_reason,
                               user_id, user_name, department, avatar_color
                        FROM transactions
                        WHERE is_deleted = 1
                        ORDER BY deleted_at DESC
                    ''')
                    rows = [dict(r) for r in cursor.fetchall()]
                finally:
                    conn.close()
                self.send_json_response(200, {'status': 'success', 'data': rows})
                return

            # 8. Admin API: Generate Financial Statement / P&L
            elif path == '/api/admin/statement':
                start_date = query.get('start_date', [''])[0]
                end_date = query.get('end_date', [''])[0]

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

                    sql += " ORDER BY date ASC"
                    cursor.execute(sql, params)
                    txs = [dict(r) for r in cursor.fetchall()]

                    # Compute Statement Metrics
                    total_revenue = sum(t['amount'] for t in txs if t['type'] == 'income')
                    total_expense = sum(t['amount'] for t in txs if t['type'] == 'expense')
                    net_profit = total_revenue - total_expense
                    profit_margin = round((net_profit / total_revenue * 100), 2) if total_revenue > 0 else 0.0

                    # Group by Category & Department
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

            # 9. Admin API: Team Spending & User Analytics
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

            # Serve static assets
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
                except Exception as e:
                    self.send_json_response(400, {'status': 'error', 'message': 'Invalid JSON format.'})
                    return

            operator_user = self.headers.get('X-User-Name') or body.get('operator_user') or 'Executive Admin'

            # 1. Create / Update Transaction
            if path == '/api/transactions':
                desc = body.get('description', '').strip()
                amount = body.get('amount')
                tx_type = body.get('type')
                category = body.get('category')
                date_str = body.get('date')
                tx_id = body.get('id') or f"tx_{int(datetime.now().timestamp()*1000)}"
                
                user_id = body.get('user_id', 'usr_1')
                user_name = body.get('user_name', 'Elena Rostova')
                department = body.get('department', 'Management')
                avatar_color = body.get('avatar_color', '#8b5cf6')

                if not desc or amount is None or not tx_type or not category or not date_str:
                    self.send_json_response(400, {'status': 'error', 'message': 'Missing required fields (description, amount, type, category, date).'})
                    return

                conn = get_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute('''
                        INSERT INTO transactions (
                            id, description, amount, type, category, date, is_deleted,
                            user_id, user_name, department, avatar_color
                        )
                        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
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
                            department = excluded.department,
                            avatar_color = excluded.avatar_color
                    ''', (tx_id, desc, float(amount), tx_type, category, date_str, user_id, user_name, department, avatar_color))

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

            # 2. Toggle Immutable Policy (Admin Switch)
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
                        'new_state': new_bool,
                        'note': 'Immutable Audit Policy toggled by Admin'
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

            # 3. Add or Update Team Member
            elif path == '/api/users':
                u_id = body.get('id') or f"usr_{int(datetime.now().timestamp()*1000)}"
                name = body.get('name', '').strip()
                email = body.get('email', '').strip()
                role = body.get('role', 'Team Member').strip()
                dept = body.get('department', 'General').strip()
                color = body.get('avatar_color', '#6366f1')

                if not name:
                    self.send_json_response(400, {'status': 'error', 'message': 'User name is required.'})
                    return

                conn = get_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute('''
                        INSERT INTO users (id, name, email, role, department, avatar_color, is_active)
                        VALUES (?, ?, ?, ?, ?, ?, 1)
                        ON CONFLICT(id) DO UPDATE SET
                            name = excluded.name,
                            email = excluded.email,
                            role = excluded.role,
                            department = excluded.department,
                            avatar_color = excluded.avatar_color
                    ''', (u_id, name, email, role, dept, color))
                    log_audit(conn, 'USER_UPDATE', u_id, {'name': name, 'role': role, 'department': dept}, user_name=operator_user)
                finally:
                    conn.close()

                self.send_json_response(200, {'status': 'success', 'message': f'User {name} saved.', 'id': u_id})
                return

            # 4. Restore Deleted Transaction (Soft-delete reversal)
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
                        'type': target['type'],
                        'category': target['category']
                    }, user_name=operator_user)
                finally:
                    conn.close()

                self.send_json_response(200, {'status': 'success', 'message': f'Restored "{target["description"]}" back to active ledger.'})
                return

            # 5. Permanent Purge All Deleted Records (Permitted ONLY when Immutable Policy is OFF)
            elif path == '/api/admin/purge-all':
                conn = get_db()
                try:
                    cursor = conn.cursor()
                    # Check policy
                    cursor.execute("SELECT value FROM system_settings WHERE key = 'immutable_policy_enabled'")
                    row = cursor.fetchone()
                    immutable = (row['value'] == '1' or row['value'].lower() == 'true') if row else True

                    if immutable:
                        self.send_json_response(403, {
                            'status': 'error',
                            'message': 'Immutable Audit Policy is ACTIVE. Permanent purge is prohibited by security policy. Disable the Immutable Policy first in Admin Security Settings.'
                        })
                        return

                    cursor.execute("SELECT COUNT(*) as count FROM transactions WHERE is_deleted = 1")
                    del_count = cursor.fetchone()['count']

                    cursor.execute("DELETE FROM transactions WHERE is_deleted = 1")
                    log_audit(conn, 'PERMANENT_PURGE_ALL', None, {
                        'purged_count': del_count,
                        'timestamp': datetime.now().isoformat(),
                        'executed_by': operator_user
                    }, user_name=operator_user)
                finally:
                    conn.close()

                self.send_json_response(200, {
                    'status': 'success',
                    'message': f'Permanently purged {del_count} archived records from SQLite database.'
                })
                return

            # 6. Update Business Profile
            elif path == '/api/business-profile':
                company_name = body.get('company_name', 'Apex Business Solutions Pvt. Ltd.')
                tax_id = body.get('tax_id', '')
                financial_year = body.get('financial_year', '2026-2027')
                conn = get_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute('UPDATE business_profile SET company_name = ?, tax_id = ?, financial_year = ? WHERE id = 1', (company_name, tax_id, financial_year))
                    log_audit(conn, 'PROFILE_UPDATE', None, {'company_name': company_name, 'tax_id': tax_id, 'financial_year': financial_year}, user_name=operator_user)
                finally:
                    conn.close()
                self.send_json_response(200, {'status': 'success', 'message': 'Business profile updated.'})
                return

            # 7. Reset All Active Transactions (Soft-archive to trash)
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

            # 8. Reload Sample Data
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
            operator_user = self.headers.get('X-User-Name') or 'Executive Admin'

            # 1. Permanent Purge Single Transaction (Permitted ONLY when Immutable Policy is OFF)
            if path.startswith('/api/admin/purge/'):
                tx_id = path.replace('/api/admin/purge/', '').strip()
                conn = get_db()
                try:
                    cursor = conn.cursor()
                    # Check policy
                    cursor.execute("SELECT value FROM system_settings WHERE key = 'immutable_policy_enabled'")
                    row = cursor.fetchone()
                    immutable = (row['value'] == '1' or row['value'].lower() == 'true') if row else True

                    if immutable:
                        self.send_json_response(403, {
                            'status': 'error',
                            'message': 'Immutable Audit Policy is ACTIVE. Permanent deletion is prohibited. To permanently remove records, disable the Immutable Policy in the Admin Security Settings.'
                        })
                        return

                    cursor.execute('SELECT * FROM transactions WHERE id = ?', (tx_id,))
                    target = cursor.fetchone()
                    if not target:
                        self.send_json_response(404, {'status': 'error', 'message': 'Transaction not found.'})
                        return

                    cursor.execute('DELETE FROM transactions WHERE id = ?', (tx_id,))
                    log_audit(conn, 'PERMANENT_PURGE', tx_id, {
                        'description': target['description'],
                        'amount': target['amount'],
                        'type': target['type'],
                        'purged_by': operator_user
                    }, user_name=operator_user)
                finally:
                    conn.close()

                self.send_json_response(200, {'status': 'success', 'message': f'Permanently purged "{target["description"]}" from database.'})
                return

            # 2. Standard Soft Delete (Archive)
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
                        'category': target['category'],
                        'date': target['date'],
                        'deleted_by': operator_user,
                        'deleted_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
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

        # Prevent path traversal
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
        pass # Clean console

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
    print(" [APEX FINANCE] Enterprise Multi-User Platform & Policy Engine")
    print("=" * 70)
    print(f" * Staff Hub       : http://localhost:{PORT}")
    print(f" * Admin Portal    : http://localhost:{PORT}/admin.html")
    print(f" * Transactions    : http://localhost:{PORT}/transactions.html")
    print(f" * Analytics       : http://localhost:{PORT}/analytics.html")
    print(f" * Statements      : http://localhost:{PORT}/statements.html")
    print(f" * Audit Ledger    : http://localhost:{PORT}/audit-logs.html")
    print(f" * Archived Trash  : http://localhost:{PORT}/trash.html")
    print(f" * Settings        : http://localhost:{PORT}/settings.html")
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
