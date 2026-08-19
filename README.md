# 💼 Apex Business Finance — Modular Enterprise Accounting & Audit Platform

A complete, modern **Multi-Page Business Finance Platform** built with an embedded **SQLite Database**, **Interactive Sidebar Navigation**, **Printable Financial Statement Generator**, and an **Immutable Audit Ledger**.

![Expense Tracker Preview](assets/screenshot.png)

---

## 🌟 Modular Multi-Page Architecture

The platform has been organized into dedicated, high-performance individual pages:

| Page | File | Purpose |
| :--- | :--- | :--- |
| **📊 Dashboard** | [`index.html`](index.html) | Executive KPIs (Gross Revenue, Operating Expenses, Net Profit, Margin %), Category Doughnut Chart, Monthly Trends, Recent Ledger |
| **💳 Transactions** | [`transactions.html`](transactions.html) | Add Transaction Modal, Advanced Live Search, Filters (Revenue vs Expense, Category, Date Sort), Itemized Ledger |
| **📈 Analytics & Costs** | [`analytics.html`](analytics.html) | Deep Cost Intelligence, Capital Flow Line Chart, Departmental Spending Distribution Table, Key Highlights |
| **📄 Financial Statement** | [`statements.html`](statements.html) | Official Profit & Loss (P&L) Generator by Period (*This Month*, *Quarter*, *Custom Range*), Printable Executive PDF Sheet with Auditor Signature Lines, CSV Export |
| **📜 Audit Ledger** | [`audit-logs.html`](audit-logs.html) | Chronological tamper-evident log of all creations, soft-deletions, restorations, and resets with server timestamps |
| **🗄️ Archived / Trash** | [`trash.html`](trash.html) | Permanent archive of soft-deleted transactions with instant one-click **"Restore to Active"** capability (no permanent purge policy) |
| **⚙️ Settings** | [`settings.html`](settings.html) | Configure Company Profile (Legal Name, GSTIN / Tax ID, Financial Year), Sample Dataset Seeder, System Data Reset |

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Backend API** | **Python Standard Library** (`http.server`, `sqlite3`, `json`) — Zero external pip dependencies |
| **Database** | **SQLite3** (`database.db`) — ACID-compliant local database with soft-deletes and immutable audit trail |
| **Frontend Core** | **HTML5 & Vanilla JavaScript ES6+** (`shared.js`) — Multi-page client engine with hybrid LocalStorage fallback |
| **Design System** | **CSS3 Custom Properties & Grid** (`shared.css`) — Corporate dark/light theme tokens, responsive sidebar |
| **Charts** | **[Chart.js 4.4.1](https://www.chartjs.org/)** — Canvas-based analytics and growth trends |
| **Typography & Icons** | **Google Fonts (Plus Jakarta Sans & Inter)** & **Font Awesome 6.5** |

---

## 🚀 How to Run the Application

### Option 1: Full-Stack Mode with SQLite Backend (Recommended)

1. Open PowerShell or Terminal in the project folder:
   ```powershell
   cd "C:\Users\R Hareeswar\.gemini\antigravity\scratch\expense-tracker"
   ```
2. Start the backend server:
   ```powershell
   py server.py
   ```
   *(or `python server.py`)*
3. Open your browser and navigate to:
   - **Dashboard:** [http://localhost:5000](http://localhost:5000)
   - **Transactions:** [http://localhost:5000/transactions.html](http://localhost:5000/transactions.html)
   - **Analytics:** [http://localhost:5000/analytics.html](http://localhost:5000/analytics.html)
   - **Financial Statement:** [http://localhost:5000/statements.html](http://localhost:5000/statements.html)
   - **Audit Ledger:** [http://localhost:5000/audit-logs.html](http://localhost:5000/audit-logs.html)
   - **Archived Trash:** [http://localhost:5000/trash.html](http://localhost:5000/trash.html)
   - **Settings:** [http://localhost:5000/settings.html](http://localhost:5000/settings.html)

---

### Option 2: Standalone Static Mode (GitHub Pages / Offline)

- Double-click **`index.html`** or open any `.html` page in your browser.
- The platform automatically detects static hosting and switches smoothly to **`💾 LocalStorage Mode`**.

---

## 🌐 REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/transactions` | Retrieve all active transactions |
| `POST` | `/api/transactions` | Record transaction & log `CREATE` event |
| `DELETE` | `/api/transactions/<id>` | Soft-delete transaction & log `DELETE` event |
| `POST` | `/api/admin/restore/<id>` | Restore soft-deleted transaction & log `RESTORE` event |
| `GET` | `/api/admin/statement` | Generate filtered P&L financial statement |
| `GET` | `/api/admin/audit-logs` | Retrieve full chronological audit ledger |
| `GET` | `/api/admin/deleted` | Retrieve soft-deleted records |
| `GET` / `POST` | `/api/business-profile` | Get or update company profile and tax details |
| `POST` | `/api/sample-data` | Seed demo business transactions into SQLite |
| `POST` | `/api/reset` | Archive all active records into audit ledger |
| `GET` | `/api/health` | Backend health status |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
