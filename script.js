/**
 * ==============================================================================
 * Expense Tracker — Full-Stack JavaScript Engine
 * Automatic Backend Detection (SQLite API) with graceful LocalStorage Fallback,
 * Audit History / Change Tracking, Chart.js Integration, and Light/Dark Modes
 * ==============================================================================
 */

// ------------------------------------------------------------------------------
// 1. Constants & Category Configuration
// ------------------------------------------------------------------------------

const STORAGE_KEY_TRANSACTIONS = 'rupeewise_transactions_v1';
const STORAGE_KEY_AUDIT_LOGS = 'rupeewise_audit_logs_v1';
const STORAGE_KEY_THEME = 'rupeewise_theme_v1';

// Server API base URL (relative for same-origin or localhost:5000)
const API_BASE = window.location.origin.includes('5000') ? '' : 'http://localhost:5000';

const CATEGORIES = {
  expense: [
    { name: 'Food & Dining', icon: 'fa-utensils', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' },
    { name: 'Groceries', icon: 'fa-basket-shopping', color: '#84cc16', bg: 'rgba(132, 204, 22, 0.15)' },
    { name: 'Shopping', icon: 'fa-bag-shopping', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
    { name: 'Housing & Rent', icon: 'fa-house', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' },
    { name: 'Transportation', icon: 'fa-car', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
    { name: 'Utilities & Bills', icon: 'fa-bolt', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' },
    { name: 'Entertainment', icon: 'fa-film', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' },
    { name: 'Healthcare', icon: 'fa-heart-pulse', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
    { name: 'Education', icon: 'fa-graduation-cap', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
    { name: 'Travel', icon: 'fa-plane', color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.15)' },
    { name: 'Personal Care', icon: 'fa-spa', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
    { name: 'Other Expense', icon: 'fa-shapes', color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' }
  ],
  income: [
    { name: 'Salary', icon: 'fa-building-columns', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
    { name: 'Freelance & Projects', icon: 'fa-laptop-code', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
    { name: 'Investments & Dividends', icon: 'fa-arrow-trend-up', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
    { name: 'Business', icon: 'fa-briefcase', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
    { name: 'Allowance & Gifts', icon: 'fa-gift', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
    { name: 'Rental Income', icon: 'fa-key', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
    { name: 'Other Income', icon: 'fa-coins', color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.15)' }
  ]
};

const SAMPLE_TRANSACTIONS = [
  { id: 'tx_sample_1', description: 'Monthly Salary Credit', amount: 65000, type: 'income', category: 'Salary', date: getRelativeDateString(2) },
  { id: 'tx_sample_2', description: 'Apartment Rent Payment', amount: 18000, type: 'expense', category: 'Housing & Rent', date: getRelativeDateString(3) },
  { id: 'tx_sample_3', description: 'Freelance Web Design Project', amount: 22000, type: 'income', category: 'Freelance & Projects', date: getRelativeDateString(5) },
  { id: 'tx_sample_4', description: 'Supermarket Grocery Restock', amount: 3450, type: 'expense', category: 'Groceries', date: getRelativeDateString(6) },
  { id: 'tx_sample_5', description: 'Electricity & High-Speed WiFi Bill', amount: 2150, type: 'expense', category: 'Utilities & Bills', date: getRelativeDateString(8) },
  { id: 'tx_sample_6', description: 'Weekend Dining & Cafe', amount: 1680, type: 'expense', category: 'Food & Dining', date: getRelativeDateString(10) },
  { id: 'tx_sample_7', description: 'Stock Market Dividend', amount: 4500, type: 'income', category: 'Investments & Dividends', date: getRelativeDateString(14) },
  { id: 'tx_sample_8', description: 'Fuel & Metro Travel Pass', amount: 1950, type: 'expense', category: 'Transportation', date: getRelativeDateString(18) }
];

function getRelativeDateString(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

// ------------------------------------------------------------------------------
// 2. State Variables
// ------------------------------------------------------------------------------
let transactions = [];
let auditLogs = [];
let isBackendConnected = false;
let pendingDeleteId = null;
let categoryChartInstance = null;
let monthlyChartInstance = null;
let activeAuditTab = 'all';

const filterState = {
  search: '',
  type: 'all',
  category: 'all',
  sortBy: 'date-desc'
};

// ------------------------------------------------------------------------------
// 3. DOM Elements
// ------------------------------------------------------------------------------
const DOM = {
  // Status & Header
  backendStatusBadge: document.getElementById('backendStatusBadge'),
  backendStatusText: document.getElementById('backendStatusText'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  currentDateText: document.getElementById('currentDateText'),
  auditLogBtn: document.getElementById('auditLogBtn'),
  sampleDataBtn: document.getElementById('sampleDataBtn'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),
  clearAllBtn: document.getElementById('clearAllBtn'),

  // Overview Stats
  totalBalance: document.getElementById('totalBalance'),
  balanceCard: document.getElementById('balanceCard'),
  balanceBadge: document.getElementById('balanceBadge'),
  balanceStatusText: document.getElementById('balanceStatusText'),
  totalIncome: document.getElementById('totalIncome'),
  incomeCount: document.getElementById('incomeCount'),
  totalExpenses: document.getElementById('totalExpenses'),
  expenseCount: document.getElementById('expenseCount'),
  savingsRate: document.getElementById('savingsRate'),
  monthlyExpenseText: document.getElementById('monthlyExpenseText'),

  // Form Elements
  form: document.getElementById('transactionForm'),
  typeExpenseRadio: document.getElementById('typeExpense'),
  typeIncomeRadio: document.getElementById('typeIncome'),
  expenseTypeLabel: document.getElementById('expenseTypeLabel'),
  incomeTypeLabel: document.getElementById('incomeTypeLabel'),
  descriptionInput: document.getElementById('descriptionInput'),
  amountInput: document.getElementById('amountInput'),
  categorySelect: document.getElementById('categorySelect'),
  dateInput: document.getElementById('dateInput'),
  descriptionError: document.getElementById('descriptionError'),
  amountError: document.getElementById('amountError'),
  categoryError: document.getElementById('categoryError'),
  dateError: document.getElementById('dateError'),

  // History & Filters
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  filterAllBtn: document.getElementById('filterAll'),
  filterIncomeBtn: document.getElementById('filterIncome'),
  filterExpenseBtn: document.getElementById('filterExpense'),
  categoryFilter: document.getElementById('categoryFilter'),
  sortBySelect: document.getElementById('sortBySelect'),
  transactionList: document.getElementById('transactionList'),
  transactionCountBadge: document.getElementById('transactionCountBadge'),
  filteredSummaryText: document.getElementById('filteredSummaryText'),
  emptyState: document.getElementById('emptyState'),
  emptyStateTitle: document.getElementById('emptyStateTitle'),
  emptyStateDesc: document.getElementById('emptyStateDesc'),
  emptyStateActionBtn: document.getElementById('emptyStateActionBtn'),
  resetFiltersBtn: document.getElementById('resetFiltersBtn'),

  // Charts
  categoryChart: document.getElementById('categoryChart'),
  categoryChartContainer: document.getElementById('categoryChartContainer'),
  categoryChartEmpty: document.getElementById('categoryChartEmpty'),
  monthlyChart: document.getElementById('monthlyChart'),
  monthlyChartContainer: document.getElementById('monthlyChartContainer'),
  monthlyChartEmpty: document.getElementById('monthlyChartEmpty'),

  // Delete & Clear Modals
  deleteModal: document.getElementById('deleteModal'),
  deleteTargetName: document.getElementById('deleteTargetName'),
  cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
  confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
  clearAllModal: document.getElementById('clearAllModal'),
  cancelClearBtn: document.getElementById('cancelClearBtn'),
  confirmClearBtn: document.getElementById('confirmClearBtn'),

  // Audit History Modal
  auditModal: document.getElementById('auditModal'),
  closeAuditModalBtn: document.getElementById('closeAuditModalBtn'),
  closeAuditBtn: document.getElementById('closeAuditBtn'),
  tabAllLogs: document.getElementById('tabAllLogs'),
  tabDeletedLogs: document.getElementById('tabDeletedLogs'),
  auditCountAll: document.getElementById('auditCountAll'),
  auditCountDeleted: document.getElementById('auditCountDeleted'),
  auditTimeline: document.getElementById('auditTimeline'),

  // Toast Container
  toastContainer: document.getElementById('toastContainer')
};

// ------------------------------------------------------------------------------
// 4. App Initialization & Backend Detection
// ------------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initDateDisplay();
  populateCategorySelect('expense');
  setupEventListeners();

  await checkBackendStatus();
  await loadTransactions();
  updateUI();
});

/** Detects if the Python SQLite Backend Server is active */
async function checkBackendStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { method: 'GET', signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      isBackendConnected = true;
      DOM.backendStatusBadge.className = 'backend-badge connected';
      DOM.backendStatusText.textContent = 'SQLite Database Active';
    } else {
      throw new Error('Backend responded with non-200 status');
    }
  } catch (err) {
    isBackendConnected = false;
    DOM.backendStatusBadge.className = 'backend-badge local-mode';
    DOM.backendStatusText.textContent = 'LocalStorage Mode';
  }
}

function initDateDisplay() {
  const today = new Date();
  const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
  DOM.currentDateText.textContent = today.toLocaleDateString('en-IN', options);
  DOM.dateInput.value = today.toISOString().split('T')[0];
}

function initTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
  if (savedTheme) {
    applyTheme(savedTheme);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY_THEME, theme);
  if (categoryChartInstance && monthlyChartInstance) {
    updateCharts();
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(newTheme);
  showToast(`Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} Mode`, 'info');
}

// ------------------------------------------------------------------------------
// 5. Data Layer (Dual Mode: SQLite Backend API + LocalStorage)
// ------------------------------------------------------------------------------

/** Loads transactions from API (if connected) or LocalStorage */
async function loadTransactions() {
  if (isBackendConnected) {
    try {
      const res = await fetch(`${API_BASE}/api/transactions`);
      const json = await res.json();
      if (json.status === 'success') {
        transactions = json.data;
        return;
      }
    } catch (e) {
      console.warn('API error, falling back to LocalStorage:', e);
    }
  }

  // Fallback to LocalStorage
  try {
    const rawData = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    if (rawData) {
      transactions = JSON.parse(rawData);
    } else {
      transactions = [...SAMPLE_TRANSACTIONS];
      saveLocalTransactions();
    }
  } catch (error) {
    transactions = [];
  }
}

/** LocalStorage sync helper */
function saveLocalTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
  } catch (e) {
    console.error('LocalStorage write failed:', e);
  }
}

/** Logs local audit entry if in LocalStorage mode */
function logLocalAudit(action, transactionId, details) {
  try {
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEY_AUDIT_LOGS) || '[]');
    logs.unshift({
      id: Date.now(),
      action,
      transaction_id: transactionId,
      details,
      timestamp: new Date().toLocaleString('en-IN')
    });
    localStorage.setItem(STORAGE_KEY_AUDIT_LOGS, JSON.stringify(logs.slice(0, 100)));
  } catch (e) {
    console.error('Audit logging failed:', e);
  }
}

// ------------------------------------------------------------------------------
// 6. UI Calculations & Rendering
// ------------------------------------------------------------------------------

function updateUI() {
  calculateAndRenderOverview();
  renderCategoryFilterOptions();
  renderTransactionList();
  updateCharts();
}

function calculateAndRenderOverview() {
  let incomeTotal = 0;
  let expenseTotal = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  let currentMonthExpense = 0;

  transactions.forEach((tx) => {
    const amt = Number(tx.amount);
    if (tx.type === 'income') {
      incomeTotal += amt;
      incomeCount++;
    } else {
      expenseTotal += amt;
      expenseCount++;
      if (tx.date && tx.date.startsWith(currentMonthKey)) {
        currentMonthExpense += amt;
      }
    }
  });

  const netBalance = incomeTotal - expenseTotal;
  const savingsRate = incomeTotal > 0 ? Math.max(0, Math.round(((incomeTotal - expenseTotal) / incomeTotal) * 100)) : 0;

  DOM.totalBalance.textContent = formatCurrency(netBalance);
  DOM.totalIncome.textContent = formatCurrency(incomeTotal);
  DOM.totalExpenses.textContent = formatCurrency(expenseTotal);
  DOM.savingsRate.textContent = `${savingsRate}%`;

  DOM.incomeCount.textContent = `${incomeCount} transaction${incomeCount === 1 ? '' : 's'}`;
  DOM.expenseCount.textContent = `${expenseCount} transaction${expenseCount === 1 ? '' : 's'}`;
  DOM.monthlyExpenseText.textContent = `This month: ${formatCurrency(currentMonthExpense)}`;

  if (netBalance >= 0) {
    DOM.balanceBadge.className = 'stat-badge';
    DOM.balanceBadge.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i> <span>Net Positive</span>';
  } else {
    DOM.balanceBadge.className = 'stat-badge negative';
    DOM.balanceBadge.innerHTML = '<i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i> <span>Deficit</span>';
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const dateObj = new Date(dateStr + 'T00:00:00');
  return dateObj.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// ------------------------------------------------------------------------------
// 7. Form Operations (Add Transaction)
// ------------------------------------------------------------------------------

function populateCategorySelect(type) {
  const categories = CATEGORIES[type] || [];
  DOM.categorySelect.innerHTML = '';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Select Category';
  defaultOption.disabled = true;
  defaultOption.selected = true;
  DOM.categorySelect.appendChild(defaultOption);

  categories.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat.name;
    opt.textContent = cat.name;
    DOM.categorySelect.appendChild(opt);
  });
}

function setTransactionType(type) {
  if (type === 'expense') {
    DOM.typeExpenseRadio.checked = true;
    DOM.expenseTypeLabel.classList.add('active');
    DOM.incomeTypeLabel.classList.remove('active');
    populateCategorySelect('expense');
  } else {
    DOM.typeIncomeRadio.checked = true;
    DOM.incomeTypeLabel.classList.add('active');
    DOM.expenseTypeLabel.classList.remove('active');
    populateCategorySelect('income');
  }
  clearValidationErrors();
}

async function handleFormSubmit(e) {
  e.preventDefault();
  clearValidationErrors();

  const description = DOM.descriptionInput.value.trim();
  const amount = parseFloat(DOM.amountInput.value);
  const type = DOM.typeExpenseRadio.checked ? 'expense' : 'income';
  const category = DOM.categorySelect.value;
  const date = DOM.dateInput.value;

  let isValid = true;

  if (!description) {
    showFieldError(DOM.descriptionInput, DOM.descriptionError, 'Please enter a description.');
    isValid = false;
  } else if (description.length > 60) {
    showFieldError(DOM.descriptionInput, DOM.descriptionError, 'Description must be under 60 characters.');
    isValid = false;
  }

  if (isNaN(amount) || amount <= 0) {
    showFieldError(DOM.amountInput, DOM.amountError, 'Please enter a valid amount greater than ₹0.');
    isValid = false;
  } else if (amount > 100000000) {
    showFieldError(DOM.amountInput, DOM.amountError, 'Amount exceeds maximum limit.');
    isValid = false;
  }

  if (!category) {
    showFieldError(DOM.categorySelect, DOM.categoryError, 'Please select a category.');
    isValid = false;
  }

  if (!date) {
    showFieldError(DOM.dateInput, DOM.dateError, 'Please select a date.');
    isValid = false;
  }

  if (!isValid) return;

  const newTx = {
    id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    description,
    amount,
    type,
    category,
    date
  };

  if (isBackendConnected) {
    try {
      const res = await fetch(`${API_BASE}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTx)
      });
      if (res.ok) {
        await loadTransactions();
      } else {
        throw new Error('API save failed');
      }
    } catch (err) {
      console.warn('Backend save error, using LocalStorage:', err);
      transactions.unshift(newTx);
      saveLocalTransactions();
      logLocalAudit('CREATE', newTx.id, newTx);
    }
  } else {
    transactions.unshift(newTx);
    saveLocalTransactions();
    logLocalAudit('CREATE', newTx.id, newTx);
  }

  DOM.descriptionInput.value = '';
  DOM.amountInput.value = '';
  DOM.categorySelect.selectedIndex = 0;
  DOM.descriptionInput.focus();

  updateUI();
  showToast(`Added ${type}: "${description}" (${formatCurrency(amount)})`, 'success');
}

function showFieldError(inputEl, errorEl, message) {
  inputEl.classList.add('input-error');
  errorEl.textContent = message;
  errorEl.classList.add('visible');
}

function clearValidationErrors() {
  [DOM.descriptionInput, DOM.amountInput, DOM.categorySelect, DOM.dateInput].forEach((el) => {
    el.classList.remove('input-error');
  });
  [DOM.descriptionError, DOM.amountError, DOM.categoryError, DOM.dateError].forEach((el) => {
    el.textContent = '';
    el.classList.remove('visible');
  });
}

// ------------------------------------------------------------------------------
// 8. Transaction List & Filtering
// ------------------------------------------------------------------------------

function renderCategoryFilterOptions() {
  const currentSelection = DOM.categoryFilter.value;
  DOM.categoryFilter.innerHTML = '<option value="all">All Categories</option>';

  const allCategories = [...CATEGORIES.expense, ...CATEGORIES.income];
  const uniqueCategories = Array.from(new Set(allCategories.map((c) => c.name)));

  uniqueCategories.forEach((catName) => {
    const opt = document.createElement('option');
    opt.value = catName;
    opt.textContent = catName;
    DOM.categoryFilter.appendChild(opt);
  });

  if (uniqueCategories.includes(currentSelection)) {
    DOM.categoryFilter.value = currentSelection;
  } else {
    DOM.categoryFilter.value = 'all';
  }
}

function renderTransactionList() {
  const filtered = getFilteredTransactions();

  DOM.transactionCountBadge.textContent = `${transactions.length} Record${transactions.length === 1 ? '' : 's'}`;
  DOM.filteredSummaryText.textContent = `Showing ${filtered.length} of ${transactions.length} transaction${transactions.length === 1 ? '' : 's'}`;

  DOM.transactionList.innerHTML = '';

  if (filtered.length === 0) {
    DOM.emptyState.style.display = 'flex';
    DOM.transactionList.style.display = 'none';

    if (transactions.length === 0) {
      DOM.emptyStateTitle.textContent = 'No Transactions Yet';
      DOM.emptyStateDesc.textContent = 'Start by adding your first income or expense transaction on the left!';
      DOM.emptyStateActionBtn.style.display = 'inline-flex';
      DOM.resetFiltersBtn.style.display = 'none';
    } else {
      DOM.emptyStateTitle.textContent = 'No Matches Found';
      DOM.emptyStateDesc.textContent = 'No transactions match your active search or filter criteria.';
      DOM.emptyStateActionBtn.style.display = 'none';
      DOM.resetFiltersBtn.style.display = 'inline-flex';
    }
    return;
  }

  DOM.emptyState.style.display = 'none';
  DOM.transactionList.style.display = 'flex';

  filtered.forEach((tx) => {
    const li = createTransactionElement(tx);
    DOM.transactionList.appendChild(li);
  });
}

function createTransactionElement(tx) {
  const li = document.createElement('li');
  li.className = 'transaction-item';
  li.setAttribute('data-id', tx.id);

  const catConfig = getCategoryConfig(tx.type, tx.category);
  const isIncome = tx.type === 'income';

  li.innerHTML = `
    <div class="item-left">
      <div class="category-icon-badge" style="background-color: ${catConfig.bg}; color: ${catConfig.color};" aria-hidden="true">
        <i class="fa-solid ${catConfig.icon}"></i>
      </div>
      <div class="item-details">
        <span class="item-description" title="${escapeHtml(tx.description)}">${escapeHtml(tx.description)}</span>
        <div class="item-meta">
          <span class="category-tag">${escapeHtml(tx.category)}</span>
          <span class="date-text">&bull; ${formatDate(tx.date)}</span>
        </div>
      </div>
    </div>
    <div class="item-right">
      <span class="item-amount ${isIncome ? 'income' : 'expense'}">
        ${isIncome ? '+' : '-'}${formatCurrency(tx.amount)}
      </span>
      <button class="delete-btn" data-id="${tx.id}" title="Delete transaction" aria-label="Delete ${escapeHtml(tx.description)}">
        <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
      </button>
    </div>
  `;

  const deleteBtn = li.querySelector('.delete-btn');
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    promptDeleteTransaction(tx.id);
  });

  return li;
}

function getCategoryConfig(type, categoryName) {
  const list = CATEGORIES[type] || [];
  const found = list.find((c) => c.name.toLowerCase() === (categoryName || '').toLowerCase());
  if (found) return found;

  return type === 'income'
    ? { icon: 'fa-coins', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' }
    : { icon: 'fa-shapes', color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' };
}

function getFilteredTransactions() {
  let result = [...transactions];

  if (filterState.search) {
    const query = filterState.search.toLowerCase();
    result = result.filter((tx) => {
      return (
        tx.description.toLowerCase().includes(query) ||
        tx.category.toLowerCase().includes(query)
      );
    });
  }

  if (filterState.type !== 'all') {
    result = result.filter((tx) => tx.type === filterState.type);
  }

  if (filterState.category !== 'all') {
    result = result.filter((tx) => tx.category === filterState.category);
  }

  switch (filterState.sortBy) {
    case 'date-desc':
      result.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
    case 'date-asc':
      result.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case 'amount-desc':
      result.sort((a, b) => Number(b.amount) - Number(a.amount));
      break;
    case 'amount-asc':
      result.sort((a, b) => Number(a.amount) - Number(b.amount));
      break;
    default:
      result.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  return result;
}

// ------------------------------------------------------------------------------
// 9. Chart Analytics
// ------------------------------------------------------------------------------

function updateCharts() {
  updateCategoryChart();
  updateMonthlyChart();
}

function updateCategoryChart() {
  const expenseTransactions = transactions.filter((tx) => tx.type === 'expense');

  if (expenseTransactions.length === 0) {
    DOM.categoryChartContainer.style.display = 'none';
    DOM.categoryChartEmpty.style.display = 'flex';
    if (categoryChartInstance) {
      categoryChartInstance.destroy();
      categoryChartInstance = null;
    }
    return;
  }

  DOM.categoryChartContainer.style.display = 'block';
  DOM.categoryChartEmpty.style.display = 'none';

  const categoryTotals = {};
  expenseTransactions.forEach((tx) => {
    const cat = tx.category || 'Other Expense';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(tx.amount);
  });

  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);
  const backgroundColors = labels.map((label) => getCategoryConfig('expense', label).color);

  const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDarkMode ? '#f8fafc' : '#0f172a';

  if (categoryChartInstance) {
    categoryChartInstance.data.labels = labels;
    categoryChartInstance.data.datasets[0].data = data;
    categoryChartInstance.data.datasets[0].backgroundColor = backgroundColors;
    categoryChartInstance.options.plugins.legend.labels.color = textColor;
    categoryChartInstance.update();
  } else {
    const ctx = DOM.categoryChart.getContext('2d');
    categoryChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: backgroundColors, borderWidth: 2, borderColor: isDarkMode ? '#131b26' : '#ffffff', hoverOffset: 6 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, padding: 14, font: { family: "'Inter', sans-serif", size: 11, weight: '500' }, color: textColor }
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const percent = Math.round(((ctx.raw || 0) / total) * 100);
                return ` ${ctx.label}: ${formatCurrency(ctx.raw)} (${percent}%)`;
              }
            }
          }
        }
      }
    });
  }
}

function updateMonthlyChart() {
  const expenseTransactions = transactions.filter((tx) => tx.type === 'expense');

  if (expenseTransactions.length === 0) {
    DOM.monthlyChartContainer.style.display = 'none';
    DOM.monthlyChartEmpty.style.display = 'flex';
    if (monthlyChartInstance) {
      monthlyChartInstance.destroy();
      monthlyChartInstance = null;
    }
    return;
  }

  DOM.monthlyChartContainer.style.display = 'block';
  DOM.monthlyChartEmpty.style.display = 'none';

  const monthlyData = {};
  expenseTransactions.forEach((tx) => {
    if (!tx.date) return;
    const monthKey = tx.date.slice(0, 7);
    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + Number(tx.amount);
  });

  const sortedMonthKeys = Object.keys(monthlyData).sort();
  const labels = sortedMonthKeys.map((key) => {
    const [year, month] = key.split('-');
    const dateObj = new Date(year, parseInt(month, 10) - 1, 1);
    return dateObj.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  });

  const data = sortedMonthKeys.map((key) => monthlyData[key]);

  const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDarkMode ? '#94a3b8' : '#64748b';
  const gridColor = isDarkMode ? '#263346' : '#e2e8f0';

  if (monthlyChartInstance) {
    monthlyChartInstance.data.labels = labels;
    monthlyChartInstance.data.datasets[0].data = data;
    monthlyChartInstance.options.scales.x.ticks.color = textColor;
    monthlyChartInstance.options.scales.y.ticks.color = textColor;
    monthlyChartInstance.options.scales.x.grid.color = gridColor;
    monthlyChartInstance.options.scales.y.grid.color = gridColor;
    monthlyChartInstance.update();
  } else {
    const ctx = DOM.monthlyChart.getContext('2d');
    monthlyChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Monthly Expense', data, backgroundColor: '#0d9488', borderRadius: 6, maxBarThickness: 36 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor, font: { family: "'Inter', sans-serif", size: 11 } } },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: "'Inter', sans-serif", size: 11 },
              callback: (val) => '₹' + (val >= 1000 ? val / 1000 + 'k' : val)
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => ` Total Expense: ${formatCurrency(ctx.raw)}` } }
        }
      }
    });
  }
}

// ------------------------------------------------------------------------------
// 10. Deletions, Reset & Audit Trail
// ------------------------------------------------------------------------------

function promptDeleteTransaction(id) {
  const targetTx = transactions.find((t) => t.id === id);
  if (!targetTx) return;

  pendingDeleteId = id;
  DOM.deleteTargetName.textContent = `"${targetTx.description}" (${formatCurrency(targetTx.amount)})`;
  DOM.deleteModal.style.display = 'flex';
  DOM.confirmDeleteBtn.focus();
}

function closeDeleteModal() {
  pendingDeleteId = null;
  DOM.deleteModal.style.display = 'none';
}

async function confirmDeleteTransaction() {
  if (!pendingDeleteId) return;

  const targetTx = transactions.find((t) => t.id === pendingDeleteId);
  const deletedId = pendingDeleteId;

  if (isBackendConnected) {
    try {
      const res = await fetch(`${API_BASE}/api/transactions/${deletedId}`, { method: 'DELETE' });
      if (res.ok) {
        await loadTransactions();
      } else {
        throw new Error('API delete failed');
      }
    } catch (e) {
      console.warn('Backend delete error, falling back locally:', e);
      transactions = transactions.filter((t) => t.id !== deletedId);
      saveLocalTransactions();
      if (targetTx) logLocalAudit('DELETE', deletedId, targetTx);
    }
  } else {
    transactions = transactions.filter((t) => t.id !== deletedId);
    saveLocalTransactions();
    if (targetTx) logLocalAudit('DELETE', deletedId, targetTx);
  }

  closeDeleteModal();
  updateUI();
  showToast(`Deleted & archived: "${targetTx ? targetTx.description : ''}"`, 'info');
}

function promptClearAll() {
  if (transactions.length === 0) {
    showToast('No active transactions to reset.', 'info');
    return;
  }
  DOM.clearAllModal.style.display = 'flex';
  DOM.confirmClearBtn.focus();
}

function closeClearModal() {
  DOM.clearAllModal.style.display = 'none';
}

async function confirmClearAll() {
  if (isBackendConnected) {
    try {
      await fetch(`${API_BASE}/api/reset`, { method: 'POST' });
      await loadTransactions();
    } catch (e) {
      transactions = [];
      saveLocalTransactions();
      logLocalAudit('RESET', null, { count: transactions.length });
    }
  } else {
    transactions = [];
    saveLocalTransactions();
    logLocalAudit('RESET', null, { count: transactions.length });
  }

  closeClearModal();
  updateUI();
  showToast('All transactions archived into change history.', 'info');
}

// ------------------------------------------------------------------------------
// 11. Activity History & Audit Log Modal
// ------------------------------------------------------------------------------

async function openAuditModal() {
  DOM.auditModal.style.display = 'flex';
  await refreshAuditLogs();
}

function closeAuditModal() {
  DOM.auditModal.style.display = 'none';
}

async function refreshAuditLogs() {
  let logs = [];

  if (isBackendConnected) {
    try {
      const res = await fetch(`${API_BASE}/api/audit-logs`);
      const json = await res.json();
      if (json.status === 'success') {
        logs = json.data;
      }
    } catch (e) {
      logs = JSON.parse(localStorage.getItem(STORAGE_KEY_AUDIT_LOGS) || '[]');
    }
  } else {
    logs = JSON.parse(localStorage.getItem(STORAGE_KEY_AUDIT_LOGS) || '[]');
  }

  auditLogs = logs;
  const deletedCount = logs.filter((l) => l.action === 'DELETE').length;

  DOM.auditCountAll.textContent = logs.length;
  DOM.auditCountDeleted.textContent = deletedCount;

  renderAuditTimeline();
}

function renderAuditTimeline() {
  DOM.auditTimeline.innerHTML = '';

  const displayLogs = activeAuditTab === 'deleted'
    ? auditLogs.filter((l) => l.action === 'DELETE')
    : auditLogs;

  if (displayLogs.length === 0) {
    DOM.auditTimeline.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        <i class="fa-solid fa-clock-rotate-left" style="font-size: 2rem; opacity: 0.5; margin-bottom: 0.5rem;"></i>
        <p>No ${activeAuditTab === 'deleted' ? 'deleted transactions' : 'audit logs'} recorded yet.</p>
      </div>
    `;
    return;
  }

  displayLogs.forEach((log) => {
    const item = document.createElement('div');
    item.className = 'audit-item';

    const actionBadgeClass =
      log.action === 'CREATE'
        ? 'badge-create'
        : log.action === 'DELETE'
        ? 'badge-delete'
        : log.action === 'RESTORE'
        ? 'badge-restore'
        : 'badge-reset';

    const details = typeof log.details === 'object' ? log.details : {};
    const desc = details.description || (log.action === 'RESET' ? 'Reset All Transactions' : 'Transaction Entry');
    const amtStr = details.amount ? ` • ${formatCurrency(details.amount)}` : '';
    const catStr = details.category ? ` (${details.category})` : '';

    item.innerHTML = `
      <div class="audit-left">
        <span class="audit-badge ${actionBadgeClass}">${log.action}</span>
        <div class="audit-info">
          <span class="audit-desc">${escapeHtml(desc)}${catStr}${amtStr}</span>
          <span class="audit-time">${escapeHtml(log.timestamp || '')}</span>
        </div>
      </div>
      ${
        log.action === 'DELETE' && isBackendConnected && log.transaction_id
          ? `<button class="restore-btn" data-id="${log.transaction_id}" title="Restore transaction">
              <i class="fa-solid fa-rotate-left"></i> Restore
             </button>`
          : ''
      }
    `;

    const restoreBtn = item.querySelector('.restore-btn');
    if (restoreBtn) {
      restoreBtn.addEventListener('click', async () => {
        await restoreDeletedTransaction(log.transaction_id);
      });
    }

    DOM.auditTimeline.appendChild(item);
  });
}

async function restoreDeletedTransaction(id) {
  try {
    const res = await fetch(`${API_BASE}/api/transactions/restore/${id}`, { method: 'POST' });
    if (res.ok) {
      showToast('Transaction restored successfully!', 'success');
      await loadTransactions();
      await refreshAuditLogs();
      updateUI();
    }
  } catch (e) {
    showToast('Failed to restore transaction.', 'error');
  }
}

// ------------------------------------------------------------------------------
// 12. CSV Export & Toast
// ------------------------------------------------------------------------------

function exportTransactionsCSV() {
  if (transactions.length === 0) {
    showToast('No transactions available to export.', 'info');
    return;
  }

  const headers = ['Transaction ID', 'Date', 'Type', 'Category', 'Description', 'Amount (INR)'];
  const rows = transactions.map((tx) => [
    `"${tx.id}"`,
    `"${tx.date}"`,
    `"${tx.type.toUpperCase()}"`,
    `"${tx.category}"`,
    `"${tx.description.replace(/"/g, '""')}"`,
    tx.amount
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csvContent));
  link.setAttribute('download', `Expense_Tracker_Export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('Exported transactions to CSV successfully!', 'success');
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const iconClass = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info';

  toast.innerHTML = `
    <i class="fa-solid ${iconClass} toast-icon" aria-hidden="true"></i>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  DOM.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-hide');
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 250);
  }, 3200);
}

function escapeHtml(string) {
  const div = document.createElement('div');
  div.textContent = string;
  return div.innerHTML;
}

// ------------------------------------------------------------------------------
// 13. Event Listeners
// ------------------------------------------------------------------------------

function setupEventListeners() {
  DOM.themeToggleBtn.addEventListener('click', toggleTheme);

  DOM.typeExpenseRadio.addEventListener('change', () => setTransactionType('expense'));
  DOM.typeIncomeRadio.addEventListener('change', () => setTransactionType('income'));
  DOM.expenseTypeLabel.addEventListener('click', () => setTransactionType('expense'));
  DOM.incomeTypeLabel.addEventListener('click', () => setTransactionType('income'));

  DOM.form.addEventListener('submit', handleFormSubmit);

  [DOM.descriptionInput, DOM.amountInput, DOM.categorySelect, DOM.dateInput].forEach((input) => {
    input.addEventListener('input', () => input.classList.remove('input-error'));
  });

  DOM.searchInput.addEventListener('input', (e) => {
    filterState.search = e.target.value.trim();
    DOM.clearSearchBtn.style.display = filterState.search ? 'block' : 'none';
    renderTransactionList();
  });

  DOM.clearSearchBtn.addEventListener('click', () => {
    DOM.searchInput.value = '';
    filterState.search = '';
    DOM.clearSearchBtn.style.display = 'none';
    renderTransactionList();
    DOM.searchInput.focus();
  });

  [
    { btn: DOM.filterAllBtn, type: 'all' },
    { btn: DOM.filterIncomeBtn, type: 'income' },
    { btn: DOM.filterExpenseBtn, type: 'expense' }
  ].forEach(({ btn, type }) => {
    btn.addEventListener('click', () => {
      [DOM.filterAllBtn, DOM.filterIncomeBtn, DOM.filterExpenseBtn].forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      filterState.type = type;
      renderTransactionList();
    });
  });

  DOM.categoryFilter.addEventListener('change', (e) => {
    filterState.category = e.target.value;
    renderTransactionList();
  });

  DOM.sortBySelect.addEventListener('change', (e) => {
    filterState.sortBy = e.target.value;
    renderTransactionList();
  });

  DOM.emptyStateActionBtn.addEventListener('click', () => DOM.descriptionInput.focus());

  DOM.resetFiltersBtn.addEventListener('click', () => {
    DOM.searchInput.value = '';
    DOM.clearSearchBtn.style.display = 'none';
    filterState.search = '';
    filterState.type = 'all';
    filterState.category = 'all';
    filterState.sortBy = 'date-desc';

    [DOM.filterAllBtn, DOM.filterIncomeBtn, DOM.filterExpenseBtn].forEach((b) => b.classList.remove('active'));
    DOM.filterAllBtn.classList.add('active');
    DOM.categoryFilter.value = 'all';
    DOM.sortBySelect.value = 'date-desc';

    renderTransactionList();
  });

  DOM.sampleDataBtn.addEventListener('click', async () => {
    if (isBackendConnected) {
      await fetch(`${API_BASE}/api/sample-data`, { method: 'POST' });
      await loadTransactions();
    } else {
      transactions = [...SAMPLE_TRANSACTIONS];
      saveLocalTransactions();
      logLocalAudit('SAMPLE_DATA', null, { count: transactions.length });
    }
    updateUI();
    showToast('Loaded demo sample transactions!', 'success');
  });

  DOM.exportCsvBtn.addEventListener('click', exportTransactionsCSV);
  DOM.clearAllBtn.addEventListener('click', promptClearAll);

  DOM.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
  DOM.confirmDeleteBtn.addEventListener('click', confirmDeleteTransaction);
  DOM.cancelClearBtn.addEventListener('click', closeClearModal);
  DOM.confirmClearBtn.addEventListener('click', confirmClearAll);

  // Audit History Modal Listeners
  DOM.auditLogBtn.addEventListener('click', openAuditModal);
  DOM.closeAuditModalBtn.addEventListener('click', closeAuditModal);
  DOM.closeAuditBtn.addEventListener('click', closeAuditModal);

  DOM.tabAllLogs.addEventListener('click', () => {
    DOM.tabAllLogs.classList.add('active');
    DOM.tabDeletedLogs.classList.remove('active');
    activeAuditTab = 'all';
    renderAuditTimeline();
  });

  DOM.tabDeletedLogs.addEventListener('click', () => {
    DOM.tabDeletedLogs.classList.add('active');
    DOM.tabAllLogs.classList.remove('active');
    activeAuditTab = 'deleted';
    renderAuditTimeline();
  });

  [DOM.deleteModal, DOM.clearAllModal, DOM.auditModal].forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDeleteModal();
      closeClearModal();
      closeAuditModal();
    }
  });
}
