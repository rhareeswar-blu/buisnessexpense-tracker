# 💼 Apex Business Finance — Enterprise Multi-User Platform & Executive Admin Portal

A complete, high-performance **Multi-User Corporate Finance & Accounting Engine** built with an embedded **SQLite Database (WAL Mode)**, **Executive Admin Command Center**, **Dynamic Security Policy Controls (Immutable vs Permanent Purge)**, **Team Roster Management**, and a **Printable Financial Statement (P&L) Generator**.

---

## 🌟 Architecture & Key Features

| Module | File | Key Capabilities |
| :--- | :--- | :--- |
| **🛡️ Executive Admin Command Center** | [`admin.html`](admin.html) | **Security Policy Engine**: Toggle between Strict Immutability and Permanent Purge; **Permanent Database Purge**: Safely erase soft-deleted records when policy is off; **Team Roster**: Add/manage members, roles, and departments; **Audit Trail**: Chronological activity logs; **P&L Generator**. |
| **📊 Dashboard** | [`index.html`](index.html) | Multi-User profile indicator, Cash Flow Trajectory bar chart, Category Doughnut, recent ledger with user avatars and department pills. |
| **💳 Transactions Ledger** | [`transactions.html`](transactions.html) | Record transactions with user attribution, filter by Type, Department, Category, or keyword; CSV export. |
| **📈 Analytics & Cost Intelligence** | [`analytics.html`](analytics.html) | Spending by Department distribution, Spending per Team Member, Revenue vs Expense trajectory. |
| **📄 Financial Statement (P&L)** | [`statements.html`](statements.html) | Period presets (*This Month*, *Last Month*, *Quarter*, *Custom Range*), Printable Executive PDF with auditor signature lines, CSV export. |
| **📜 Tamper-Evident Audit Ledger** | [`audit-logs.html`](audit-logs.html) | Full chronological tracking of `CREATE`, `DELETE`, `RESTORE`, `PERMANENT_PURGE`, `POLICY_TOGGLE`, `USER_UPDATE`. |
| **🗄️ Archived Trash & Recovery** | [`trash.html`](trash.html) | Live Immutable Policy banner, instant **"Restore"** action, and **"Purge Permanently"** when policy is unlocked. |
| **⚙️ Corporate Settings** | [`settings.html`](settings.html) | Configure Legal Entity Name, GSTIN / Tax ID, Financial Year, and database maintenance tools. |

---

## 🛠️ Technology Stack

- **Backend API**: Python Standard Library (`http.server`, `sqlite3`, `json`) — Zero external pip dependencies.
- **Database**: SQLite3 with **WAL mode** (`PRAGMA journal_mode = WAL;`) for robust concurrent multi-user transactions.
- **Frontend Core**: Vanilla JavaScript ES6+ (`shared.js`, `admin.js`) with dynamic user session switcher and offline LocalStorage fallback.
- **Design System**: Vanilla CSS3 Custom Properties (`shared.css`, `admin.css`) with luxury dark obsidian & light slate themes.
- **Charts**: [Chart.js 4.4.1](https://www.chartjs.org/) for responsive financial visualizations.

---

## 🚀 How to Run Locally

1. Open PowerShell or Terminal in this folder:
   ```powershell
   cd "c:\Users\R Hareeswar\.gemini\antigravity\scratch\expense-tracker"
   ```
2. Start the server:
   ```powershell
   py server.py
   ```
   *(or `python server.py`)*
3. Access in your browser:
   - **Staff Dashboard:** [http://localhost:5000](http://localhost:5000)
   - **Executive Admin Portal:** [http://localhost:5000/admin.html](http://localhost:5000/admin.html)
   - **Transactions:** [http://localhost:5000/transactions.html](http://localhost:5000/transactions.html)
   - **Analytics:** [http://localhost:5000/analytics.html](http://localhost:5000/analytics.html)
   - **Financial Statement:** [http://localhost:5000/statements.html](http://localhost:5000/statements.html)
   - **Audit Ledger:** [http://localhost:5000/audit-logs.html](http://localhost:5000/audit-logs.html)
   - **Archived Trash:** [http://localhost:5000/trash.html](http://localhost:5000/trash.html)

---

## 🌐 REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Backend status & SQLite WAL connection check |
| `GET` | `/api/users` | Fetch multi-user corporate team roster |
| `POST` | `/api/users` | Add or update a team member |
| `GET` | `/api/admin/policy` | Get Immutable Policy status |
| `POST` | `/api/admin/policy/toggle` | Toggle Immutable Policy (Enable / Disable) |
| `GET` | `/api/transactions` | Retrieve active transactions (supports `?user_id=` & `?department=`) |
| `POST` | `/api/transactions` | Record transaction with user attribution |
| `DELETE` | `/api/transactions/<id>` | Soft-delete / Archive transaction |
| `DELETE` | `/api/admin/purge/<id>` | Permanently purge transaction from SQLite (allowed only when policy is OFF) |
| `POST` | `/api/admin/purge-all` | Permanently wipe all archived records (allowed only when policy is OFF) |
| `POST` | `/api/admin/restore/<id>` | Restore soft-deleted transaction |
| `GET` | `/api/admin/statement` | Generate P&L statement by date range |
| `GET` | `/api/admin/team-analytics` | Spending & revenue breakdown per user and department |
| `GET` | `/api/admin/audit-logs` | Retrieve chronological audit ledger |
| `GET` | `/api/admin/deleted` | Retrieve soft-deleted archive |
| `GET` / `POST` | `/api/business-profile` | Get or update legal company profile |
| `POST` | `/api/sample-data` | Seed multi-user sample dataset |

---

## 📄 License
MIT License — see the [LICENSE](LICENSE) file for details.
