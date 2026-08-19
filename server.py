#!/usr/bin/env python3
"""
==============================================================================
Business Finance & Expense Tracker — Backend Server & SQLite Audit Engine
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

    # 1. Transactions Table (Immutable Soft-Deletes: is_deleted = 1, never purged)
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
            deleted_reason TEXT DEFAULT 'Deleted by user'
        )
    ''')

    # Ensure schema migrations for existing database files
    try:
        cursor.execute("ALTER TABLE transactions ADD COLUMN deleted_reason TEXT DEFAULT 'Deleted by user'")
    except Exception:
        pass

    try:
        cursor.execute("ALTER TABLE transactions ADD COLUMN deleted_at TEXT DEFAULT NULL")
    except Exception:
        pass

    # 2. Immutable Audit Logs Table (Full ledger of all activities)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            transaction_id TEXT,
            details TEXT NOT NULL,
            timestamp TEXT DEFAULT (datetime('now', 'localtime'))
        )
    ''')

    # 3. Business Profile Table
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

def log_audit(conn, action, transaction_id, details_dict):
    cursor = conn.cursor()
    details_json = json.dumps(details_dict, ensure_ascii=False)
    cursor.execute('''
        INSERT INTO audit_logs (action, transaction_id, details, timestamp)
        VALUES (?, ?, ?, datetime('now', 'localtime'))
    ''', (action, transaction_id, details_json))
    conn.commit()

def seed_business_sample_data(conn):
    samples = [
        ('tx_b_1', 'Client Retainer — Enterprise Cloud Migration', 185000.0, 'income', 'Client Invoices & Retainers', datetime.now().strftime('%Y-%m-02')),
        ('tx_b_2', 'Monthly Office Lease & Co-working Space', 45000.0, 'expense', 'Office Rent & Facilities', datetime.now().strftime('%Y-%m-03')),
        ('tx_b_3', 'Core Engineering & Design Team Payroll', 95000.0, 'expense', 'Salaries & Payroll', datetime.now().strftime('%Y-%m-05')),
        ('tx_b_4', 'SaaS Consulting & Custom API Integration', 68000.0, 'income', 'Consulting & Services', datetime.now().strftime('%Y-%m-07')),
        ('tx_b_5', 'AWS Cloud Infrastructure & Server Hosting', 12400.0, 'expense', 'Cloud & Software Tools', datetime.now().strftime('%Y-%m-09')),
        ('tx_b_6', 'Digital Marketing Campaign & Google Ads', 16500.0, 'expense', 'Marketing & Advertising', datetime.now().strftime('%Y-%m-12')),
        ('tx_b_7', 'Quarterly High-Yield Corporate Deposit', 8500.0, 'income', 'Investments & Returns', datetime.now().strftime('%Y-%m-14')),
        ('tx_b_8', 'Office Gigabit Internet & Power Utilities', 4800.0, 'expense', 'Utilities & Internet', datetime.now().strftime('%Y-%m-16'))
    ]

    cursor = conn.cursor()
    for tx in samples:
        cursor.execute('''
            INSERT INTO transactions (id, description, amount, type, category, date, is_deleted, deleted_at, deleted_reason)
            VALUES (?, ?, ?, ?, ?, ?, 0, NULL, NULL)
            ON CONFLICT(id) DO UPDATE SET
                description = excluded.description,
                amount = excluded.amount,
                type = excluded.type,
                category = excluded.category,
                date = excluded.date,
                is_deleted = 0,
                deleted_at = NULL,
                deleted_reason = NULL
        ''', tx)
        log_audit(conn, 'CREATE', tx[0], {
            'description': tx[1],
            'amount': tx[2],
            'type': tx[3],
            'category': tx[4],
            'date': tx[5],
            'note': 'Business Sample Dataset'
        })
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
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Connection', 'close')
        self.end_headers()
        self.wfile.write(response_bytes)
        self.wfile.flush()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        try:
            parsed = urlparse(self.path)
            path = parsed.path
            query = parse_qs(parsed.query)

            # 1. Health Status
            if path == '/api/health':
                self.send_json_response(200, {'status': 'online', 'service': 'Business Expense Tracker', 'db': 'SQLite active'})
                return

            # 2. Get Active Transactions
            elif path == '/api/transactions':
                conn = get_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute('''
                        SELECT id, description, amount, type, category, date, created_at
                        FROM transactions
                        WHERE is_deleted = 0
                        ORDER BY date DESC, created_at DESC
                    ''')
                    rows = [dict(r) for r in cursor.fetchall()]
                finally:
                    conn.close()
                self.send_json_response(200, {'status': 'success', 'data': rows})
                return

            # 3. Get Business Profile
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

            # 4. Admin API: Full Audit Log Ledger
            elif path == '/api/admin/audit-logs':
                conn = get_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute('''
                        SELECT id, action, transaction_id, details, timestamp
                        FROM audit_logs
                        ORDER BY id DESC
                        LIMIT 200
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

            # 5. Admin API: Get All Deleted / Archived Transactions (Immutable Trash)
            elif path == '/api/admin/deleted':
                conn = get_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute('''
                        SELECT id, description, amount, type, category, date, deleted_at, deleted_reason
                        FROM transactions
                        WHERE is_deleted = 1
                        ORDER BY deleted_at DESC
                    ''')
                    rows = [dict(r) for r in cursor.fetchall()]
                finally:
                    conn.close()
                self.send_json_response(200, {'status': 'success', 'data': rows})
                return

            # 6. Admin API: Generate Financial Statement / P&L
            elif path == '/api/admin/statement':
                start_date = query.get('start_date', [''])[0]
                end_date = query.get('end_date', [''])[0]

                conn = get_db()
                try:
                    cursor = conn.cursor()
                    sql = "SELECT id, description, amount, type, category, date FROM transactions WHERE is_deleted = 0"
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

                    # Group by Category
                    revenue_by_cat = {}
                    expense_by_cat = {}
                    for t in txs:
                        cat = t['category']
                        amt = t['amount']
                        if t['type'] == 'income':
                            revenue_by_cat[cat] = revenue_by_cat.get(cat, 0) + amt
                        else:
                            expense_by_cat[cat] = expense_by_cat.get(cat, 0) + amt

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
                    'transactions': txs
                }

                self.send_json_response(200, {'status': 'success', 'data': statement_data})
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
                    self.send_json_response(400, {'status': 'error', 'message': 'Invalid JSON'})
                    return

            # 1. Create Transaction
            if path == '/api/transactions':
                desc = body.get('description', '').strip()
                amount = body.get('amount')
                tx_type = body.get('type')
                category = body.get('category')
                date_str = body.get('date')
                tx_id = body.get('id') or f"tx_{int(datetime.now().timestamp()*1000)}"

                if not desc or amount is None or not tx_type or not category or not date_str:
                    self.send_json_response(400, {'status': 'error', 'message': 'Missing required fields.'})
                    return

                conn = get_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute('''
                        INSERT INTO transactions (id, description, amount, type, category, date, is_deleted)
                        VALUES (?, ?, ?, ?, ?, ?, 0)
                        ON CONFLICT(id) DO UPDATE SET
                            description = excluded.description,
                            amount = excluded.amount,
                            type = excluded.type,
                            category = excluded.category,
                            date = excluded.date,
                            is_deleted = 0,
                            deleted_at = NULL,
                            deleted_reason = NULL
                    ''', (tx_id, desc, float(amount), tx_type, category, date_str))

                    log_audit(conn, 'CREATE', tx_id, {
                        'description': desc,
                        'amount': float(amount),
                        'type': tx_type,
                        'category': category,
                        'date': date_str
                    })
                finally:
                    conn.close()

                self.send_json_response(201, {'status': 'success', 'message': 'Transaction added'})
                return

            # 2. Restore Deleted Transaction (Soft-delete reversal)
            elif path.startswith('/api/admin/restore/'):
                tx_id = path.replace('/api/admin/restore/', '').strip()
                conn = get_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute('SELECT * FROM transactions WHERE id = ?', (tx_id,))
                    target = cursor.fetchone()

                    if not target:
                        self.send_json_response(404, {'status': 'error', 'message': 'Transaction not found'})
                        return

                    cursor.execute('UPDATE transactions SET is_deleted = 0, deleted_at = NULL WHERE id = ?', (tx_id,))
                    log_audit(conn, 'RESTORE', tx_id, {
                        'description': target['description'],
                        'amount': target['amount'],
                        'type': target['type'],
                        'category': target['category']
                    })
                finally:
                    conn.close()

                self.send_json_response(200, {'status': 'success', 'message': f'Restored "{target["description"]}"'})
                return

            # 3. Update Business Profile
            elif path == '/api/business-profile':
                company_name = body.get('company_name', 'Apex Business Solutions Pvt. Ltd.')
                tax_id = body.get('tax_id', '')
                financial_year = body.get('financial_year', '2026-2027')
                conn = get_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute('UPDATE business_profile SET company_name = ?, tax_id = ?, financial_year = ? WHERE id = 1', (company_name, tax_id, financial_year))
                    log_audit(conn, 'PROFILE_UPDATE', None, {'company_name': company_name, 'tax_id': tax_id, 'financial_year': financial_year})
                finally:
                    conn.close()
                self.send_json_response(200, {'status': 'success', 'message': 'Profile updated'})
                return

            # 4. Reset All Active Transactions
            elif path == '/api/reset':
                conn = get_db()
                try:
                    cursor = conn.cursor()
                    cursor.execute('UPDATE transactions SET is_deleted = 1, deleted_at = datetime("now", "localtime"), deleted_reason = "Admin Reset" WHERE is_deleted = 0')
                    log_audit(conn, 'RESET', None, {'timestamp': datetime.now().isoformat()})
                finally:
                    conn.close()
                self.send_json_response(200, {'status': 'success', 'message': 'All active transactions archived.'})
                return

            # 5. Reload Sample Data
            elif path == '/api/sample-data':
                conn = get_db()
                try:
                    seed_business_sample_data(conn)
                finally:
                    conn.close()
                self.send_json_response(200, {'status': 'success', 'message': 'Sample dataset loaded.'})
                return

            self.send_json_response(404, {'status': 'error', 'message': 'Route not found'})
        except Exception as e:
            self.send_json_response(500, {'status': 'error', 'message': str(e)})

    def do_DELETE(self):
        try:
            parsed = urlparse(self.path)
            path = parsed.path

            # Soft Delete (Immutable archive - NO permanent purge)
            if path.startswith('/api/transactions/'):
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
                        'deleted_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    })
                finally:
                    conn.close()

                self.send_json_response(200, {'status': 'success', 'message': f'Archived "{target["description"]}"'})
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
    print("=" * 65)
    print(" [APEX FINANCE] Business Expense Tracker & SQLite Ledger")
    print("=" * 65)
    print(f" * Dashboard     : http://localhost:{PORT}")
    print(f" * Transactions  : http://localhost:{PORT}/transactions.html")
    print(f" * Analytics     : http://localhost:{PORT}/analytics.html")
    print(f" * Statements    : http://localhost:{PORT}/statements.html")
    print(f" * Audit Ledger  : http://localhost:{PORT}/audit-logs.html")
    print(f" * Archived Trash: http://localhost:{PORT}/trash.html")
    print(f" * Settings      : http://localhost:{PORT}/settings.html")
    print(f" * Database File : {DB_FILE}")
    print("=" * 65)

    with ThreadedHTTPServer(("", PORT), BusinessTrackerHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server gracefully...")
            httpd.server_close()

if __name__ == '__main__':
    run_server()
