# 💼 Apex Business Finance — Enterprise Expense Tracker & Admin Audit Platform

A modern, high-performance **Business Financial Management & Expense Tracking Platform** equipped with an embedded **SQLite Database**, an **Executive Admin Portal (`admin.html`)**, **Printable Financial Statement (P&L) Generator**, and an **Immutable Audit Ledger** that tracks and archives all changes without permanent purges.

![Expense Tracker Preview](assets/screenshot.png)

---

## 🌟 Key Business Features

### 1. 🏢 Commercial Expense & Revenue Tracker (`index.html`)
- **Business Categorization:** Track client invoices, SaaS subscriptions, consulting fees, payroll/salaries, office rent, AWS/cloud hosting, marketing ads, hardware, and legal/tax fees.
- **Real-Time Financial Dashboard:** Live KPI cards for Net Operating Balance, Gross Business Revenue, Total Operating Expenses, and Operating Margin %.
- **Interactive Visualizations (Chart.js):** Cost breakdown by category doughnut chart and monthly expenditure trend analysis.

### 2. 🔐 Dedicated Executive Admin Portal (`admin.html`)
- **Executive KPIs:** Live company-wide financial performance metrics.
- **📄 Official Financial Statement Generator (Profit & Loss / Income & Expense Statement):**
  - Generate statements by preset periods (*This Month*, *Last Month*, *This Quarter*, *All-Time*) or *Custom Date Ranges*.
  - View revenue stream breakdowns, operating expenditure breakdowns, net profit/loss, and margin calculations.
  - **Print / Save as PDF Layout:** Clean, black-and-white, high-contrast document format with company header (GSTIN / Tax ID), itemized ledger, and auditor signature lines.
  - **Export CSV:** One-click spreadsheet download.
- **📜 Tamper-Evident Audit Ledger:** Complete chronological timeline of every transaction recorded, modified, deleted, or restored.
- **🛡️ Immutable Deletion Archive:** Deleted transactions are **never permanently purged**. They are preserved in the audit ledger and can be restored back to active status at any time with one click.
- **⚙️ Business Profile Settings:** Configure Company Name and Tax ID / GSTIN for official statement generation.

### 3. 🗄️ Zero-Dependency SQLite Backend (`server.py`)
- Built using Python's standard library (`http.server`, `sqlite3`, `json`) — runs out-of-the-box on any system with zero external pip dependencies.
- **Dual-Mode Hybrid Engine:** Works with the SQLite backend API when running `py server.py` and gracefully falls back to in-browser `LocalStorage Mode` when deployed statically.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend API** | **Python Standard Library** (`http.server`, `sqlite3`) | Zero-dependency REST API and static file server |
| **Database** | **SQLite3** (`database.db`) | ACID-compliant persistent database with soft-deletes and audit logging |
| **Admin Portal** | **HTML5, CSS3 & JavaScript** (`admin.html`, `admin.css`, `admin.js`) | Executive dashboard, statement generator, and audit ledger |
| **Main Tracker** | **HTML5, CSS3 & JavaScript** (`index.html`, `style.css`, `script.js`) | Staff expense entry and real-time category charts |
| **Charts** | **[Chart.js](https://www.chartjs.org/) (CDN)** | Category breakdown and monthly trend charts |
| **Typography & Icons** | **Google Fonts & Font Awesome 6.5** | Plus Jakarta Sans & Inter corporate typography |

---

## 🚀 How to Run Locally

### 1. Full-Stack Mode with SQLite Backend & Admin Portal (Recommended)
1. Open PowerShell or Command Prompt in the project folder:
   ```powershell
   cd "C:\Users\R Hareeswar\.gemini\antigravity\scratch\expense-tracker"
   ```
2. Start the server:
   ```powershell
   py server.py
   ```
   *(or `python server.py`)*
3. Access the portals in your web browser:
   - **General Business Tracker:** [http://localhost:5000](http://localhost:5000)
   - **Executive Admin Portal:** [http://localhost:5000/admin.html](http://localhost:5000/admin.html)

### 2. Standalone Static Mode
- Double-click **`index.html`** or **`admin.html`** to run in offline LocalStorage mode.

---

## 🌐 REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/transactions` | Fetch all active transactions |
| `POST` | `/api/transactions` | Record a new transaction & write `CREATE` audit log |
| `DELETE` | `/api/transactions/<id>` | Archive a transaction (soft-delete) & write `DELETE` audit log |
| `GET` | `/api/admin/statement` | Generate filtered financial statement with revenue, expenses & profit metrics |
| `GET` | `/api/admin/audit-logs` | Fetch full tamper-evident audit ledger |
| `GET` | `/api/admin/deleted` | Fetch all archived/deleted transactions |
| `POST` | `/api/admin/restore/<id>` | Restore an archived transaction back to active status |
| `GET` / `POST` | `/api/business-profile` | Get or update company name & tax details |
| `GET` | `/api/health` | Service health status check |

---

## 📂 Repository File Structure

```text
expense-tracker/
├── server.py           # Python HTTP server & SQLite REST API backend
├── database.db         # Persistent SQLite database (transactions & audit logs)
├── index.html          # Main Business Expense & Revenue Tracker UI
├── style.css           # Corporate design system & responsive stylesheet
├── script.js           # Client-side tracker logic & dual-mode API connectors
├── admin.html          # Dedicated Executive Admin Portal UI
├── admin.css           # Admin portal styles & printable statement layout
├── admin.js            # Admin controller, statement generator & audit ledger
├── LICENSE             # MIT License
├── README.md           # Project documentation
└── assets/
    └── screenshot.png  # Application screenshot preview
```

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
