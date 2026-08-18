#!/usr/bin/env python3
"""
==============================================================================
Expense Tracker — Backend Server & SQLite Audit Logging Engine
Uses Python standard library (http.server, sqlite3, json) - Zero dependencies needed!
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
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database.db')
STATIC_DIR = os.path.dirname(os.path.abspath(__file__))

# ----------------------------------------------------------------------------
# Database Initialization & Helpers
# ----------------------------------------------------------------------------

def get_db():
    """Returns a SQLite database connection with dictionary-like row access."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the SQLite schema for transactions and change-tracking audit logs."""
    conn = get_db()
    cursor = conn.cursor()

    # Table 1: Transactions (with soft-delete capability)
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
            deleted_at TEXT DEFAULT NULL
        )
    ''')

    # Table 2: Audit Logs (Complete record of all additions, deletions, resets, and restorations)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            transaction_id TEXT,
            details TEXT NOT NULL,
            timestamp TEXT DEFAULT (datetime('now', 'localtime'))
        )
    ''')

    conn.commit()

    # Seed sample transactions if table is completely empty
    cursor.execute('SELECT COUNT(*) as count FROM transactions')
    if cursor.fetchone()['count'] == 0:
        seed_sample_data(conn)

    conn.close()

def log_audit(conn, action, transaction_id, details_dict):
    """Records an audit log entry."""
    cursor = conn.cursor()
    details_json = json.dumps(details_dict, ensure_ascii=False)
    cursor.execute('''
        INSERT INTO audit_logs (action, transaction_id, details, timestamp)
        VALUES (?, ?, ?, datetime('now', 'localtime'))
    ''', (action, transaction_id, details_json))
    conn.commit()

def seed_sample_data(conn):
    """Seeds initial sample transactions into the database."""
    samples = [
        ('tx_sample_1', 'Monthly Salary Credit', 65000.0, 'income', 'Salary', datetime.now().strftime('%Y-%m-01')),
        ('tx_sample_2', 'Apartment Rent Payment', 18000.0, 'expense', 'Housing & Rent', datetime.now().strftime('%Y-%m-03')),
        ('tx_sample_3', 'Freelance Web Design Project', 22000.0, 'income', 'Freelance & Projects', datetime.now().strftime('%Y-%m-05')),
        ('tx_sample_4', 'Supermarket Grocery Restock', 3450.0, 'expense', 'Groceries', datetime.now().strftime('%Y-%m-08')),
        ('tx_sample_5', 'Electricity & High-Speed WiFi Bill', 2150.0, 'expense', 'Utilities & Bills', datetime.now().strftime('%Y-%m-10')),
        ('tx_sample_6', 'Weekend Dining & Cafe', 1680.0, 'expense', 'Food & Dining', datetime.now().strftime('%Y-%m-12')),
        ('tx_sample_7', 'Stock Market Dividend', 4500.0, 'income', 'Investments & Dividends', datetime.now().strftime('%Y-%m-14')),
        ('tx_sample_8', 'Fuel & Metro Travel Pass', 1950.0, 'expense', 'Transportation', datetime.now().strftime('%Y-%m-16'))
    ]

    cursor = conn.cursor()
    for tx in samples:
        cursor.execute('''
            INSERT OR IGNORE INTO transactions (id, description, amount, type, category, date)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', tx)
        log_audit(conn, 'CREATE', tx[0], {
            'description': tx[1],
            'amount': tx[2],
            'type': tx[3],
            'category': tx[4],
            'date': tx[5],
            'note': 'Initial Sample Seed'
        })
    conn.commit()

# ----------------------------------------------------------------------------
# Custom HTTP Request Handler (REST API + Static File Server)
# ----------------------------------------------------------------------------

class ExpenseTrackerHandler(http.server.BaseHTTPRequestHandler):

    def send_json_response(self, status_code, data):
        """Helper to send JSON response with standard CORS headers."""
        response_bytes = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(response_bytes)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(response_bytes)

    def do_OPTIONS(self):
        """Handle CORS preflight requests."""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    # ------------------------------------------------------------------------
    # GET Requests Handler
    # ------------------------------------------------------------------------
    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        # 1. API: Get all active (non-deleted) transactions
        if path == '/api/transactions':
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, description, amount, type, category, date, created_at
                FROM transactions
                WHERE is_deleted = 0
                ORDER BY date DESC, created_at DESC
            ''')
            rows = [dict(row) for row in cursor.fetchall()]
            conn.close()
            self.send_json_response(200, {'status': 'success', 'data': rows})
            return

        # 2. API: Get change-tracking audit logs
        elif path == '/api/audit-logs':
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, action, transaction_id, details, timestamp
                FROM audit_logs
                ORDER BY timestamp DESC, id DESC
                LIMIT 100
            ''')
            rows = []
            for row in cursor.fetchall():
                row_dict = dict(row)
                try:
                    row_dict['details'] = json.loads(row_dict['details'])
                except Exception:
                    pass
                rows.append(row_dict)
            conn.close()
            self.send_json_response(200, {'status': 'success', 'data': rows})
            return

        # 3. API: Get only deleted transactions (Trash / History)
        elif path == '/api/deleted-transactions':
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, description, amount, type, category, date, deleted_at
                FROM transactions
                WHERE is_deleted = 1
                ORDER BY deleted_at DESC
            ''')
            rows = [dict(row) for row in cursor.fetchall()]
            conn.close()
            self.send_json_response(200, {'status': 'success', 'data': rows})
            return

        # 4. API: Server Health & Status Check
        elif path == '/api/health':
            self.send_json_response(200, {'status': 'online', 'database': 'SQLite connected', 'timestamp': datetime.now().isoformat()})
            return

        # 5. Static Files Serving (index.html, style.css, script.js, assets)
        self.serve_static_file(path)

    # ------------------------------------------------------------------------
    # POST Requests Handler
    # ------------------------------------------------------------------------
    def do_POST(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        content_length = int(self.headers.get('Content-Length', 0))
        body_data = {}

        if content_length > 0:
            try:
                body_bytes = self.rfile.read(content_length)
                body_data = json.loads(body_bytes.decode('utf-8'))
            except Exception as e:
                self.send_json_response(400, {'status': 'error', 'message': f'Invalid JSON payload: {str(e)}'})
                return

        # 1. API: Create New Transaction
        if path == '/api/transactions':
            desc = body_data.get('description', '').strip()
            amount = body_data.get('amount')
            tx_type = body_data.get('type')
            category = body_data.get('category')
            date_str = body_data.get('date')
            tx_id = body_data.get('id') or f"tx_{int(datetime.now().timestamp()*1000)}"

            if not desc or amount is None or not tx_type or not category or not date_str:
                self.send_json_response(400, {'status': 'error', 'message': 'Missing required fields.'})
                return

            try:
                amount = float(amount)
                if amount <= 0:
                    raise ValueError("Amount must be positive.")
            except ValueError:
                self.send_json_response(400, {'status': 'error', 'message': 'Invalid amount value.'})
                return

            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO transactions (id, description, amount, type, category, date, is_deleted)
                VALUES (?, ?, ?, ?, ?, ?, 0)
            ''', (tx_id, desc, amount, tx_type, category, date_str))

            log_audit(conn, 'CREATE', tx_id, {
                'description': desc,
                'amount': amount,
                'type': tx_type,
                'category': category,
                'date': date_str
            })
            conn.close()

            self.send_json_response(201, {
                'status': 'success',
                'message': 'Transaction recorded successfully',
                'data': {'id': tx_id, 'description': desc, 'amount': amount, 'type': tx_type, 'category': category, 'date': date_str}
            })
            return

        # 2. API: Restore a Deleted Transaction
        elif path.startswith('/api/transactions/restore/'):
            tx_id = path.replace('/api/transactions/restore/', '').strip()
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM transactions WHERE id = ?', (tx_id,))
            target = cursor.fetchone()

            if not target:
                conn.close()
                self.send_json_response(404, {'status': 'error', 'message': 'Transaction not found'})
                return

            cursor.execute('UPDATE transactions SET is_deleted = 0, deleted_at = NULL WHERE id = ?', (tx_id,))
            log_audit(conn, 'RESTORE', tx_id, {
                'description': target['description'],
                'amount': target['amount'],
                'type': target['type'],
                'category': target['category']
            })
            conn.close()

            self.send_json_response(200, {'status': 'success', 'message': f'Transaction "{target["description"]}" restored successfully.'})
            return

        # 3. API: Reset All Data (Soft delete active data and log reset action)
        elif path == '/api/reset':
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) as count FROM transactions WHERE is_deleted = 0')
            active_count = cursor.fetchone()['count']

            cursor.execute('UPDATE transactions SET is_deleted = 1, deleted_at = datetime("now", "localtime") WHERE is_deleted = 0')
            log_audit(conn, 'RESET', None, {
                'archived_transactions_count': active_count,
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            })
            conn.close()

            self.send_json_response(200, {'status': 'success', 'message': f'All {active_count} active transactions have been archived.'})
            return

        # 4. API: Reload Sample Data
        elif path == '/api/sample-data':
            conn = get_db()
            seed_sample_data(conn)
            conn.close()
            self.send_json_response(200, {'status': 'success', 'message': 'Sample dataset loaded successfully.'})
            return

        self.send_json_response(404, {'status': 'error', 'message': 'API route not found.'})

    # ------------------------------------------------------------------------
    # DELETE Requests Handler (Soft Delete with Audit Log)
    # ------------------------------------------------------------------------
    def do_DELETE(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        if path.startswith('/api/transactions/'):
            tx_id = path.replace('/api/transactions/', '').strip()
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM transactions WHERE id = ? AND is_deleted = 0', (tx_id,))
            target = cursor.fetchone()

            if not target:
                conn.close()
                self.send_json_response(404, {'status': 'error', 'message': 'Active transaction not found.'})
                return

            # Perform soft-delete and log details
            cursor.execute('''
                UPDATE transactions
                SET is_deleted = 1, deleted_at = datetime('now', 'localtime')
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
            conn.close()

            self.send_json_response(200, {
                'status': 'success',
                'message': f'Transaction "{target["description"]}" deleted and archived in audit log.',
                'deleted_id': tx_id
            })
            return

        self.send_json_response(404, {'status': 'error', 'message': 'API route not found.'})

    # ------------------------------------------------------------------------
    # Static Files Delivery
    # ------------------------------------------------------------------------
    def serve_static_file(self, path):
        if path == '/' or path == '':
            path = '/index.html'

        # Sanitize path to prevent directory traversal
        safe_path = os.path.normpath(path.lstrip('/'))
        full_path = os.path.join(STATIC_DIR, safe_path)

        if not os.path.exists(full_path) or os.path.isdir(full_path):
            self.send_response(404)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(b"<h1>404 Not Found</h1><p>The requested file does not exist.</p>")
            return

        mime_type, _ = mimetypes.guess_type(full_path)
        if mime_type is None:
            mime_type = 'application/octet-stream'

        try:
            with open(full_path, 'rb') as f:
                content = f.read()

            self.send_response(200)
            self.send_header('Content-Type', f'{mime_type}; charset=utf-8' if 'text' in mime_type or 'json' in mime_type or 'javascript' in mime_type else mime_type)
            self.send_header('Content-Length', str(len(content)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f"Server Error: {str(e)}".encode('utf-8'))

    def log_message(self, format, *args):
        """Clean console request logger."""
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {args[0]} -> {args[1]}")

# ----------------------------------------------------------------------------
# Server Entry Point
# ----------------------------------------------------------------------------

def run_server():
    init_db()
    print("=" * 65)
    print(" 🚀 EXPENSE TRACKER BACKEND SERVER & DATABASE ENGINE")
    print("=" * 65)
    print(f" • Database File   : {DB_FILE} (SQLite)")
    print(f" • Server Endpoint : http://localhost:{PORT}")
    print(f" • Audit Log API   : http://localhost:{PORT}/api/audit-logs")
    print(f" • Press Ctrl+C in terminal to deactivate / stop server.")
    print("=" * 65)

    with socketserver.TCPServer(("", PORT), ExpenseTrackerHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server gracefully...")
            httpd.server_close()

if __name__ == '__main__':
    run_server()
