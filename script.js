/**
 * ==============================================================================
 * Apex Business Finance — Client JavaScript Engine
 * Real-Time SQLite Database Synchronization with LocalStorage Fallback,
 * Business Categorization, Interactive Charts, and Navigation
 * ==============================================================================
 */

const STORAGE_KEY_TRANSACTIONS = 'rupeewise_transactions_v1';
const STORAGE_KEY_THEME = 'rupeewise_theme_v1';
const API_BASE = window.location.origin.includes('5000') ? '' : 'http://localhost:5000';

const CATEGORIES = {
  expense: [
    { name: 'Salaries & Payroll', icon: 'fa-users', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' },
    { name: 'Office Rent & Facilities', icon: 'fa-building', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' },
    { name: 'Cloud & Software Tools', icon: 'fa-server', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
    { name: 'Marketing & Advertising', icon: 'fa-bullhorn', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
    { name: 'Hardware & Equipment', icon: 'fa-laptop', color: '#84cc16', bg: 'rgba(132, 204, 22, 0.15)' },
    { name: 'Travel & Logistics', icon: 'fa-plane-departure', color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.15)' },
    { name: 'Utilities & Internet', icon: 'fa-bolt', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' },
    { name: 'Legal, Taxes & Audit', icon: 'fa-scale-balanced', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
    { name: 'Vendor & Contractor Pay', icon: 'fa-truck-fast', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
    { name: 'Other Operating Cost', icon: 'fa-shapes', color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' }
  ],
  income: [
    { name: 'Client Invoices & Retainers', icon: 'fa-file-invoice-dollar', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
    { name: 'Consulting & Services', icon: 'fa-handshake', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
    { name: 'Product & SaaS Sales', icon: 'fa-boxes-stacked', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
    { name: 'Investments & Returns', icon: 'fa-arrow-trend-up', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
    { name: 'Grants & Subsidies', icon: 'fa-award', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
    { name: 'Other Business Revenue', icon: 'fa-coins', color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.15)' }
  ]
};

const SAMPLE_TRANSACTIONS = [
  { id: 'tx_b_1', description: 'Client Retainer — Enterprise Cloud Migration', amount: 185000, type: 'income', category: 'Client Invoices & Retainers', date: getRelativeDateString(2) },
  { id: 'tx_b_2', description: 'Monthly Office Lease & Co-working Space', amount: 45000, type: 'expense', category: 'Office Rent & Facilities', date: getRelativeDateString(3) },
  { id: 'tx_b_3', description: 'Core Engineering & Design Team Payroll', amount: 95000, type: 'expense', category: 'Salaries & Payroll', date: getRelativeDateString(5) },
  { id: 'tx_b_4', description: 'SaaS Consulting & Custom API Integration', amount: 68000, type: 'income', category: 'Consulting & Services', date: getRelativeDateString(7) },
  { id: 'tx_b_5', description: 'AWS Cloud Infrastructure & Server Hosting', amount: 12400, type: 'expense', category: 'Cloud & Software Tools', date: getRelativeDateString(9) },
  { id: 'tx_b_6', description: 'Digital Marketing Campaign & Google Ads', amount: 16500, type: 'expense', category: 'Marketing & Advertising', date: getRelativeDateString(12) },
  { id: 'tx_b_7', description: 'Quarterly High-Yield Corporate Deposit', amount: 8500, type: 'income', category: 'Investments & Returns', date: getRelativeDateString(14) },
  { id: 'tx_b_8', description: 'Office Gigabit Internet & Power Utilities', amount: 4800, type: 'expense', category: 'Utilities & Internet', date: getRelativeDateString(16) }
];

function getRelativeDateString(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

// ------------------------------------------------------------------------------
// State & References
// ------------------------------------------------------------------------------
let transactions = [];
let isBackendConnected = false;
let pendingDeleteId = null;
let categoryChartInstance = null;
let monthlyChartInstance = null;

const filterState = {
  search: '',
  type: 'all',
  category: 'all',
  sortBy: 'date-desc'
};

const DOM = {
  backendStatusBadge: document.getElementById('backendStatusBadge'),
  backendStatusText: document.getElementById('backendStatusText'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  currentDateText: document.getElementById('currentDateText'),
  sampleDataBtn: document.getElementById('sampleDataBtn'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),
  clearAllBtn: document.getElementById('clearAllBtn'),

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

  categoryChart: document.getElementById('categoryChart'),
  categoryChartContainer: document.getElementById('categoryChartContainer'),
  categoryChartEmpty: document.getElementById('categoryChartEmpty'),
  monthlyChart: document.getElementById('monthlyChart'),
  monthlyChartContainer: document.getElementById('monthlyChartContainer'),
  monthlyChartEmpty: document.getElementById('monthlyChartEmpty'),

  deleteModal: document.getElementById('deleteModal'),
  deleteTargetName: document.getElementById('deleteTargetName'),
  cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
  confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
  clearAllModal: document.getElementById('clearAllModal'),
  cancelClearBtn: document.getElementById('cancelClearBtn'),
  confirmClearBtn: document.getElementById('confirmClearBtn'),

  toastContainer: document.getElementById('toastContainer')
};

// ------------------------------------------------------------------------------
// Initialization
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

async function checkBackendStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { method: 'GET', signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      isBackendConnected = true;
      DOM.backendStatusBadge.className = 'backend-badge connected';
      DOM.backendStatusText.textContent = 'SQLite Database Active';
    } else {
      throw new Error();
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
  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem(STORAGE_KEY_THEME, newTheme);
  if (categoryChartInstance && monthlyChartInstance) {
    updateCharts();
  }
  showToast(`Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} Mode`, 'info');
}

// ------------------------------------------------------------------------------
// Data Handling
// ------------------------------------------------------------------------------
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
      console.warn('API error, falling back locally:', e);
    }
  }

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

function saveLocalTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
  } catch (e) {
    console.error('Local save error:', e);
  }
}

// ------------------------------------------------------------------------------
// UI & Calculations
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
  const margin = incomeTotal > 0 ? Math.round(((incomeTotal - expenseTotal) / incomeTotal) * 100) : 0;

  DOM.totalBalance.textContent = formatCurrency(netBalance);
  DOM.totalIncome.textContent = formatCurrency(incomeTotal);
  DOM.totalExpenses.textContent = formatCurrency(expenseTotal);
  DOM.savingsRate.textContent = `${margin}%`;

  DOM.incomeCount.textContent = `${incomeCount} revenue stream${incomeCount === 1 ? '' : 's'}`;
  DOM.expenseCount.textContent = `${expenseCount} expense record${expenseCount === 1 ? '' : 's'}`;
  DOM.monthlyExpenseText.textContent = `This month costs: ${formatCurrency(currentMonthExpense)}`;

  if (netBalance >= 0) {
    DOM.balanceBadge.className = 'stat-badge';
    DOM.balanceBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> <span>Profitable</span>';
  } else {
    DOM.balanceBadge.className = 'stat-badge negative';
    DOM.balanceBadge.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> <span>Operating Deficit</span>';
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
// Form Handling
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
    showFieldError(DOM.descriptionInput, DOM.descriptionError, 'Please enter a description or invoice reference.');
    isValid = false;
  }

  if (isNaN(amount) || amount <= 0) {
    showFieldError(DOM.amountInput, DOM.amountError, 'Please enter a valid amount.');
    isValid = false;
  }

  if (!category) {
    showFieldError(DOM.categorySelect, DOM.categoryError, 'Please select a business category.');
    isValid = false;
  }

  if (!date) {
    showFieldError(DOM.dateInput, DOM.dateError, 'Please select a date.');
    isValid = false;
  }

  if (!isValid) return;

  const newTx = {
    id: 'tx_b_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
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
      }
    } catch (err) {
      transactions.unshift(newTx);
      saveLocalTransactions();
    }
  } else {
    transactions.unshift(newTx);
    saveLocalTransactions();
  }

  DOM.descriptionInput.value = '';
  DOM.amountInput.value = '';
  DOM.categorySelect.selectedIndex = 0;
  DOM.descriptionInput.focus();

  updateUI();
  showToast(`Recorded ${type}: "${description}" (${formatCurrency(amount)})`, 'success');
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
// Ledger & Filter Section
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
  DOM.filteredSummaryText.textContent = `Showing ${filtered.length} of ${transactions.length} record${transactions.length === 1 ? '' : 's'}`;

  DOM.transactionList.innerHTML = '';

  if (filtered.length === 0) {
    DOM.emptyState.style.display = 'flex';
    DOM.transactionList.style.display = 'none';
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
      <button class="delete-btn" data-id="${tx.id}" title="Archive transaction" aria-label="Archive ${escapeHtml(tx.description)}">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `;

  li.querySelector('.delete-btn').addEventListener('click', (e) => {
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
    result = result.filter((tx) => tx.description.toLowerCase().includes(query) || tx.category.toLowerCase().includes(query));
  }

  if (filterState.type !== 'all') {
    result = result.filter((tx) => tx.type === filterState.type);
  }

  if (filterState.category !== 'all') {
    result = result.filter((tx) => tx.category === filterState.category);
  }

  switch (filterState.sortBy) {
    case 'date-desc': result.sort((a, b) => new Date(b.date) - new Date(a.date)); break;
    case 'date-asc': result.sort((a, b) => new Date(a.date) - new Date(b.date)); break;
    case 'amount-desc': result.sort((a, b) => Number(b.amount) - Number(a.amount)); break;
    case 'amount-asc': result.sort((a, b) => Number(a.amount) - Number(b.amount)); break;
    default: result.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  return result;
}

// ------------------------------------------------------------------------------
// Charts
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
    const cat = tx.category || 'Other Operating Cost';
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
      data: { labels, datasets: [{ data, backgroundColor: backgroundColors, borderWidth: 2, borderColor: isDarkMode ? '#111827' : '#ffffff', hoverOffset: 6 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14, font: { family: "'Inter', sans-serif", size: 11, weight: '500' }, color: textColor } },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = Math.round(((ctx.raw || 0) / total) * 100);
                return ` ${ctx.label}: ${formatCurrency(ctx.raw)} (${pct}%)`;
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
  const gridColor = isDarkMode ? '#334155' : '#e2e8f0';

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
      data: { labels, datasets: [{ label: 'Operating Costs', data, backgroundColor: '#2563eb', borderRadius: 6, maxBarThickness: 36 }] },
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
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` Total Cost: ${formatCurrency(ctx.raw)}` } } }
      }
    });
  }
}

// ------------------------------------------------------------------------------
// Deletions & Archive
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
      await fetch(`${API_BASE}/api/transactions/${deletedId}`, { method: 'DELETE' });
      await loadTransactions();
    } catch (e) {
      transactions = transactions.filter((t) => t.id !== deletedId);
      saveLocalTransactions();
    }
  } else {
    transactions = transactions.filter((t) => t.id !== deletedId);
    saveLocalTransactions();
  }

  closeDeleteModal();
  updateUI();
  showToast(`Archived transaction "${targetTx ? targetTx.description : ''}" to audit ledger.`, 'info');
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
    }
  } else {
    transactions = [];
    saveLocalTransactions();
  }

  closeClearModal();
  updateUI();
  showToast('All active transactions archived in corporate ledger.', 'info');
}

// ------------------------------------------------------------------------------
// Export CSV & Toast
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
  link.setAttribute('download', `Apex_Business_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('Exported business transactions to CSV successfully!', 'success');
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
    toast.remove();
  }, 3200);
}

function escapeHtml(string) {
  const div = document.createElement('div');
  div.textContent = string;
  return div.innerHTML;
}

// ------------------------------------------------------------------------------
// Event Listeners
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
    }
    updateUI();
    showToast('Loaded demo business transactions!', 'success');
  });

  DOM.exportCsvBtn.addEventListener('click', exportTransactionsCSV);
  DOM.clearAllBtn.addEventListener('click', promptClearAll);

  DOM.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
  DOM.confirmDeleteBtn.addEventListener('click', confirmDeleteTransaction);
  DOM.cancelClearBtn.addEventListener('click', closeClearModal);
  DOM.confirmClearBtn.addEventListener('click', confirmClearAll);

  [DOM.deleteModal, DOM.clearAllModal].forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDeleteModal();
      closeClearModal();
    }
  });
}
