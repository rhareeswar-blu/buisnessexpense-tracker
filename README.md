# 💰 Expense Tracker — Personal Finance & Budget Manager

A modern, responsive, and privacy-focused **Expense Tracker** web application built with pure Vanilla JavaScript, HTML5, CSS3, and LocalStorage. Track income, monitor expenses, visualize spending distributions with interactive charts, and gain actionable financial insights with zero server setup or external database dependencies.

![Expense Tracker Preview](assets/screenshot.png)

---

## ✨ Features

- **💵 Complete Income & Expense Logging:**
  - Track both Income and Expense transactions with description, amount, category, and date.
  - Automatically formats numbers into standard Indian Rupee currency (`₹`).
- **📊 Real-time Financial Overview:**
  - Instant balance calculation (`Total Balance = Total Income - Total Expenses`).
  - Total Income and Total Expenses breakdown cards.
  - Savings Rate percentage and monthly expenditure indicators.
- **📈 Interactive Data Visualizations (Chart.js):**
  - **Spending by Category:** Interactive Doughnut chart showing percentage and amount per expense category with hover tooltips.
  - **Monthly Expense Trends:** Chronological bar chart showing monthly spending history.
- **🔍 Search, Filter & Sort:**
  - Live instant search across transaction descriptions and categories.
  - Quick filter buttons for **All**, **Income**, and **Expense**.
  - Dropdown filter by specific category.
  - Flexible sorting: Newest First, Oldest First, Highest Amount, and Lowest Amount.
- **💾 100% Client-Side LocalStorage Persistence:**
  - All transactions and user theme preferences are saved locally in the browser.
  - No database or backend required — your financial data remains completely private on your device.
- **🌓 Light & Dark Theme:**
  - Smooth theme switching with automatic system preference detection and LocalStorage persistence.
  - Theme-aware Chart.js components.
- **🛡️ Custom Confirmation Modals:**
  - Accessible, keyboard-friendly delete confirmation dialog (with `Escape` key support) to prevent accidental deletions.
  - Data reset modal with quick reset capabilities.
- **📥 CSV Data Export:**
  - One-click export of all transactions into a standard `.csv` spreadsheet file.
- **✨ Sample Data Loader:**
  - Instant demo data loader for testing and previewing the application without manual entry.
- **📱 Fully Responsive Design:**
  - Fluid mobile, tablet, and desktop layouts built with CSS Grid and Flexbox.
- **♿ Accessible & Keyboard-Friendly:**
  - ARIA attributes, semantic HTML elements, accessible form focus rings, and screen-reader consideration.

---

## 🛠️ Technologies Used

| Technology | Purpose |
| :--- | :--- |
| **HTML5** | Semantic structure, accessible dialogs, and clean document layout. |
| **CSS3** | Modern CSS custom properties (variables), Grid, Flexbox, smooth animations, and responsive media queries. |
| **Vanilla JavaScript (ES6+)** | State management, DOM manipulation, input validation, and data calculations. |
| **LocalStorage API** | Browser-level persistence for transaction records and theme preferences. |
| **[Chart.js](https://www.chartjs.org/) (CDN)** | Lightweight, interactive canvas-based charting for category and monthly analytics. |
| **[Font Awesome](https://fontawesome.com/) (CDN)** | High quality vector icons for categories and UI controls. |
| **[Google Fonts](https://fonts.google.com/)** | Clean, modern typography using *Inter* & *Plus Jakarta Sans*. |

---

## 📸 Screenshots

### 🖥️ Dashboard Overview (Desktop & Tablet)
![Expense Tracker Dashboard](assets/screenshot.png)

---

## 🚀 How to Run Locally

Because this application is built entirely with pure client-side web technologies, you do **not** need Node.js, Python, or any web server to run it.

### Method 1: Open Directly in Browser
1. Clone or download the repository:
   ```bash
   git clone https://github.com/your-username/expense-tracker.git
   cd expense-tracker
   ```
2. Double click the `index.html` file or right-click and choose **Open With > Google Chrome** (or any modern web browser like Edge, Firefox, Safari).

### Method 2: Using VS Code Live Server (Optional)
1. Open the project folder in **Visual Studio Code**.
2. Install the **Live Server** extension (by Ritwick Dey).
3. Click **"Go Live"** in the bottom status bar or right-click `index.html` and select **"Open with Live Server"**.
4. The application will open automatically at `http://127.0.0.1:5500/index.html`.

---

## 📂 Project Structure

```text
expense-tracker/
├── index.html          # Main HTML5 semantic structure & modal overlays
├── style.css           # Design tokens, light/dark themes, and responsive styles
├── script.js           # Core business logic, LocalStorage handlers, and Chart.js setup
├── README.md           # Project documentation and setup guide
└── assets/
    └── screenshot.png  # Application screenshot preview
```

---

## 💡 How LocalStorage Works in This App

This project uses the web browser's native **Web Storage API (`localStorage`)**:

1. **Saving Data:** Every time a transaction is added, deleted, or reset, the JavaScript array is converted to a JSON string using `JSON.stringify()` and stored under the key `'rupeewise_transactions_v1'`.
   ```javascript
   localStorage.setItem('rupeewise_transactions_v1', JSON.stringify(transactions));
   ```
2. **Retrieving Data:** When the page loads, `localStorage.getItem()` retrieves the stored JSON string, which is deserialized back into a JavaScript object array using `JSON.parse()`.
3. **Theme Preference:** The user's active theme (`'light'` or `'dark'`) is saved under `'rupeewise_theme_v1'`, ensuring the theme persists across browser restarts.
4. **Privacy Benefit:** No data is sent over the internet or stored on external servers.

---

## 🔮 Future Improvements

- [ ] Recurring transactions (e.g., monthly subscriptions or rent).
- [ ] Custom category creation with custom colors and icons.
- [ ] Date range picker filter (e.g., custom date intervals).
- [ ] Monthly budget limit goals with progress bars and alerts.
- [ ] PDF summary report generation.
- [ ] Multi-currency support (USD `$`, EUR `€`, GBP `£`, etc.).

---

## 👤 Author

- **GitHub:** [@your-username](https://github.com/your-username)
- **LinkedIn:** [Your Name](https://linkedin.com/in/your-profile)

---

## 📄 License

This project is licensed under the **MIT License** — you are free to use, modify, and distribute it for personal or commercial projects. See the [LICENSE](LICENSE) file for details.
