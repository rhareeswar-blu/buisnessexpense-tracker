/**
 * ==============================================================================
 * Expense Tracker — Main Application Script
 * Pure Vanilla JavaScript (ES6+), LocalStorage persistence, Chart.js Integration
 * ==============================================================================
 */

// ------------------------------------------------------------------------------
// 1. Constants & Category Configuration
// ------------------------------------------------------------------------------

/** LocalStorage storage keys */
const STORAGE_KEY_TRANSACTIONS = 'rupeewise_transactions_v1';
const STORAGE_KEY_THEME = 'rupeewise_theme_v1';

/** Category configurations with semantic icons & color codes */
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

/** High quality sample dataset for first time users */
const SAMPLE_TRANSACTIONS = [
  {
    id: 'tx_sample_1',
    description: 'Monthly Salary Credit',
    amount: 65000,
    type: 'income',
    category: 'Salary',
    date: getRelativeDateString(2)
  },
  {
    id: 'tx_sample_2',
    description: 'Apartment Rent Payment',
    amount: 18000,
    type: 'expense',
    category: 'Housing & Rent',
    date: getRelativeDateString(3)
  },
  {
    id: 'tx_sample_3',
    description: 'Freelance Web Design Project',
    amount: 22000,
    type: 'income',
    category: 'Freelance & Projects',
    date: getRelativeDateString(5)
  },
  {
    id: 'tx_sample_4',
    description: 'Supermarket Grocery Restock',
    amount: 3450,
    type: 'expense',
    category: 'Groceries',
    date: getRelativeDateString(6)
  },
  {
    id: 'tx_sample_5',
    description: 'Electricity & High-Speed WiFi Bill',
    amount: 2150,
    type: 'expense',
    category: 'Utilities & Bills',
    date: getRelativeDateString(8)
  },
  {
    id: 'tx_sample_6',
    description: 'Weekend Dining & Cafe',
    amount: 1680,
    type: 'expense',
    category: 'Food & Dining',
    date: getRelativeDateString(10)
  },
  {
    id: 'tx_sample_7',
    description: 'Stock Market Dividend',
    amount: 4500,
    type: 'income',
    category: 'Investments & Dividends',
    date: getRelativeDateString(14)
  },
  {
    id: 'tx_sample_8',
    description: 'Fuel & Metro Travel Pass',
    amount: 1950,
    type: 'expense',
    category: 'Transportation',
    date: getRelativeDateString(18)
  }
];

/** Helper function to generate sample dates relative to today */
function getRelativeDateString(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

// ------------------------------------------------------------------------------
// 2. Application State
// ------------------------------------------------------------------------------
let transactions = [];
let pendingDeleteId = null;
let categoryChartInstance = null;
let monthlyChartInstance = null;

const filterState = {
  search: '',
  type: 'all',
  category: 'all',
  sortBy: 'date-desc'
};

// ------------------------------------------------------------------------------
// 3. DOM Element References
// ------------------------------------------------------------------------------
const DOM = {
  // Theme & Header
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  currentDateText: document.getElementById('currentDateText'),
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

  // Modals
  deleteModal: document.getElementById('deleteModal'),
  deleteTargetName: document.getElementById('deleteTargetName'),
  cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
  confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
  clearAllModal: document.getElementById('clearAllModal'),
  cancelClearBtn: document.getElementById('cancelClearBtn'),
  confirmClearBtn: document.getElementById('confirmClearBtn'),

  // Toast Container
  toastContainer: document.getElementById('toastContainer')
};

// ------------------------------------------------------------------------------
// 4. Initialization & Setup
// ------------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initDateDisplay();
  populateCategorySelect('expense');
  loadTransactions();
  setupEventListeners();
  updateUI();
});

/** Formats and displays today's date in header and defaults form date */
function initDateDisplay() {
  const today = new Date();
  const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
  DOM.currentDateText.textContent = today.toLocaleDateString('en-IN', options);

  // Set default date input value to today (YYYY-MM-DD)
  DOM.dateInput.value = today.toISOString().split('T')[0];
}

/** Theme Initialization (LocalStorage + System Preference Detection) */
function initTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
  if (savedTheme) {
    applyTheme(savedTheme);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }
}

/** Applies theme attribute to document and triggers chart color refresh */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY_THEME, theme);
  if (categoryChartInstance && monthlyChartInstance) {
    updateCharts();
  }
}

/** Toggles between Light and Dark mode */
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(newTheme);
  showToast(`Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} Mode`, 'info');
}

// ------------------------------------------------------------------------------
// 5. LocalStorage Management
// ------------------------------------------------------------------------------

/** Loads transactions from LocalStorage or sets default sample data */
function loadTransactions() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    if (rawData) {
      transactions = JSON.parse(rawData);
    } else {
      // First visit: provide rich sample data for immediate visual engagement
      transactions = [...SAMPLE_TRANSACTIONS];
      saveTransactions();
    }
  } catch (error) {
    console.error('Failed to parse transactions from LocalStorage:', error);
    transactions = [];
  }
}

/** Persists current transactions array into LocalStorage */
function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
  } catch (error) {
    console.error('Failed to save transactions to LocalStorage:', error);
    showToast('Failed to save transaction to storage.', 'error');
  }
}

// ------------------------------------------------------------------------------
// 6. UI Updates & Overview Calculation
// ------------------------------------------------------------------------------

/** Central function to refresh all UI components */
function updateUI() {
  calculateAndRenderOverview();
  renderCategoryFilterOptions();
  renderTransactionList();
  updateCharts();
}

/** Calculates total balance, income, expenses, and savings rate */
function calculateAndRenderOverview() {
  let incomeTotal = 0;
  let expenseTotal = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  const currentMonthKey = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
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

  // Render Stats Cards
  DOM.totalBalance.textContent = formatCurrency(netBalance);
  DOM.totalIncome.textContent = formatCurrency(incomeTotal);
  DOM.totalExpenses.textContent = formatCurrency(expenseTotal);
  DOM.savingsRate.textContent = `${savingsRate}%`;

  DOM.incomeCount.textContent = `${incomeCount} transaction${incomeCount === 1 ? '' : 's'}`;
  DOM.expenseCount.textContent = `${expenseCount} transaction${expenseCount === 1 ? '' : 's'}`;
  DOM.monthlyExpenseText.textContent = `This month: ${formatCurrency(currentMonthExpense)}`;

  // Update Balance Status Badge
  if (netBalance >= 0) {
    DOM.balanceBadge.className = 'stat-badge';
    DOM.balanceBadge.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i> <span>Net Positive</span>';
  } else {
    DOM.balanceBadge.className = 'stat-badge negative';
    DOM.balanceBadge.innerHTML = '<i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i> <span>Deficit</span>';
  }
}

/** Formats a numeric value into standard Indian Rupee currency string */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/** Formats YYYY-MM-DD date string to readable Indian date (e.g. 15 Aug 2024) */
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
// 7. Transaction Form Handling & Validation
// ------------------------------------------------------------------------------

/** Switches category select dropdown options based on selected Type */
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

/** Handles type segment toggle (Expense vs Income) */
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

/** Form submission handler with field validation */
function handleFormSubmit(e) {
  e.preventDefault();

  clearValidationErrors();

  const description = DOM.descriptionInput.value.trim();
  const amount = parseFloat(DOM.amountInput.value);
  const type = DOM.typeExpenseRadio.checked ? 'expense' : 'income';
  const category = DOM.categorySelect.value;
  const date = DOM.dateInput.value;

  let isValid = true;

  // Validation: Description
  if (!description) {
    showFieldError(DOM.descriptionInput, DOM.descriptionError, 'Please enter a description.');
    isValid = false;
  } else if (description.length > 60) {
    showFieldError(DOM.descriptionInput, DOM.descriptionError, 'Description must be under 60 characters.');
    isValid = false;
  }

  // Validation: Amount
  if (isNaN(amount) || amount <= 0) {
    showFieldError(DOM.amountInput, DOM.amountError, 'Please enter a valid amount greater than ₹0.');
    isValid = false;
  } else if (amount > 100000000) {
    showFieldError(DOM.amountInput, DOM.amountError, 'Amount exceeds maximum limit.');
    isValid = false;
  }

  // Validation: Category
  if (!category) {
    showFieldError(DOM.categorySelect, DOM.categoryError, 'Please select a category.');
    isValid = false;
  }

  // Validation: Date
  if (!date) {
    showFieldError(DOM.dateInput, DOM.dateError, 'Please select a date.');
    isValid = false;
  }

  if (!isValid) return;

  // Create new transaction object
  const newTransaction = {
    id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    description,
    amount,
    type,
    category,
    date
  };

  // Add to state and save
  transactions.unshift(newTransaction);
  saveTransactions();

  // Reset form inputs except date & type
  DOM.descriptionInput.value = '';
  DOM.amountInput.value = '';
  DOM.categorySelect.selectedIndex = 0;
  DOM.descriptionInput.focus();

  updateUI();
  showToast(`Added ${type === 'income' ? 'income' : 'expense'}: "${description}" (${formatCurrency(amount)})`, 'success');
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
// 8. Filter, Search & Transaction Rendering
// ------------------------------------------------------------------------------

/** Populates the category filter dropdown dynamically with available categories */
function renderCategoryFilterOptions() {
  const currentSelection = DOM.categoryFilter.value;
  DOM.categoryFilter.innerHTML = '<option value="all">All Categories</option>';

  const allAvailableCategories = [...CATEGORIES.expense, ...CATEGORIES.income];
  const uniqueCategories = Array.from(new Set(allAvailableCategories.map((c) => c.name)));

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

/** Filters, sorts, and renders the transaction list */
function renderTransactionList() {
  const filtered = getFilteredTransactions();

  DOM.transactionCountBadge.textContent = `${transactions.length} Record${transactions.length === 1 ? '' : 's'}`;
  DOM.filteredSummaryText.textContent = `Showing ${filtered.length} of ${transactions.length} transaction${transactions.length === 1 ? '' : 's'}`;

  // Clear list
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

/** Generates DOM item for a single transaction */
function createTransactionElement(tx) {
  const li = document.createElement('li');
  li.className = 'transaction-item';
  li.setAttribute('data-id', tx.id);

  // Retrieve category style metadata
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

  // Bind delete button
  const deleteBtn = li.querySelector('.delete-btn');
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    promptDeleteTransaction(tx.id);
  });

  return li;
}

/** Looks up icon and color definitions for category */
function getCategoryConfig(type, categoryName) {
  const list = CATEGORIES[type] || [];
  const found = list.find((c) => c.name.toLowerCase() === (categoryName || '').toLowerCase());
  if (found) return found;

  return type === 'income'
    ? { icon: 'fa-coins', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' }
    : { icon: 'fa-shapes', color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' };
}

/** Filters and sorts transactions array based on active filter state */
function getFilteredTransactions() {
  let result = [...transactions];

  // 1. Search Query Filter
  if (filterState.search) {
    const query = filterState.search.toLowerCase();
    result = result.filter((tx) => {
      return (
        tx.description.toLowerCase().includes(query) ||
        tx.category.toLowerCase().includes(query)
      );
    });
  }

  // 2. Type Filter (All / Income / Expense)
  if (filterState.type !== 'all') {
    result = result.filter((tx) => tx.type === filterState.type);
  }

  // 3. Category Filter
  if (filterState.category !== 'all') {
    result = result.filter((tx) => tx.category === filterState.category);
  }

  // 4. Sorting
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
// 9. Chart.js Analytics Visualization
// ------------------------------------------------------------------------------

/** Updates both Category and Monthly charts */
function updateCharts() {
  updateCategoryChart();
  updateMonthlyChart();
}

/** Renders or updates Spending by Category doughnut chart */
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

  // Aggregate expenses per category
  const categoryTotals = {};
  expenseTransactions.forEach((tx) => {
    const cat = tx.category || 'Other Expense';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(tx.amount);
  });

  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);
  const backgroundColors = labels.map((label) => {
    const config = getCategoryConfig('expense', label);
    return config.color;
  });

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
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: backgroundColors,
            borderWidth: 2,
            borderColor: isDarkMode ? '#131b26' : '#ffffff',
            hoverOffset: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 14,
              font: {
                family: "'Inter', sans-serif",
                size: 11,
                weight: '500'
              },
              color: textColor
            }
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percent = Math.round((value / total) * 100);
                return ` ${context.label}: ${formatCurrency(value)} (${percent}%)`;
              }
            }
          }
        }
      }
    });
  }
}

/** Renders or updates Monthly expense summary bar chart */
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

  // Group by Month (e.g., '2024-08')
  const monthlyData = {};
  expenseTransactions.forEach((tx) => {
    if (!tx.date) return;
    const monthKey = tx.date.slice(0, 7); // YYYY-MM
    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + Number(tx.amount);
  });

  // Sort months chronologically
  const sortedMonthKeys = Object.keys(monthlyData).sort();

  // Format month labels (e.g. 'Aug 2024')
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
        labels: labels,
        datasets: [
          {
            label: 'Monthly Expense',
            data: data,
            backgroundColor: '#0d9488',
            borderRadius: 6,
            maxBarThickness: 36
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: textColor,
              font: { family: "'Inter', sans-serif", size: 11 }
            }
          },
          y: {
            grid: {
              color: gridColor
            },
            ticks: {
              color: textColor,
              font: { family: "'Inter', sans-serif", size: 11 },
              callback: function (val) {
                return '₹' + (val >= 1000 ? val / 1000 + 'k' : val);
              }
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return ` Total Expense: ${formatCurrency(context.raw)}`;
              }
            }
          }
        }
      }
    });
  }
}

// ------------------------------------------------------------------------------
// 10. Confirmation Modals & Delete Handling
// ------------------------------------------------------------------------------

/** Opens the custom delete confirmation modal */
function promptDeleteTransaction(id) {
  const targetTx = transactions.find((t) => t.id === id);
  if (!targetTx) return;

  pendingDeleteId = id;
  DOM.deleteTargetName.textContent = `"${targetTx.description}" (${formatCurrency(targetTx.amount)})`;
  DOM.deleteModal.style.display = 'flex';
  DOM.confirmDeleteBtn.focus();
}

/** Closes the delete confirmation modal */
function closeDeleteModal() {
  pendingDeleteId = null;
  DOM.deleteModal.style.display = 'none';
}

/** Executes deletion of the target transaction */
function confirmDeleteTransaction() {
  if (!pendingDeleteId) return;

  const targetTx = transactions.find((t) => t.id === pendingDeleteId);
  transactions = transactions.filter((t) => t.id !== pendingDeleteId);
  saveTransactions();
  closeDeleteModal();
  updateUI();

  showToast(`Deleted transaction "${targetTx ? targetTx.description : ''}"`, 'info');
}

/** Opens clear all confirmation modal */
function promptClearAll() {
  if (transactions.length === 0) {
    showToast('No transactions to clear.', 'info');
    return;
  }
  DOM.clearAllModal.style.display = 'flex';
  DOM.confirmClearBtn.focus();
}

/** Closes clear all modal */
function closeClearModal() {
  DOM.clearAllModal.style.display = 'none';
}

/** Resets all transaction data */
function confirmClearAll() {
  transactions = [];
  saveTransactions();
  closeClearModal();
  updateUI();
  showToast('All transaction records have been reset.', 'info');
}

// ------------------------------------------------------------------------------
// 11. CSV Export Feature
// ------------------------------------------------------------------------------

/** Exports all transactions to a downloadable CSV file */
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
  const encodedUri = encodeURI(csvContent);

  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Expense_Tracker_Export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('Exported transactions to CSV successfully!', 'success');
}

// ------------------------------------------------------------------------------
// 12. Toast Notification Feedback System
// ------------------------------------------------------------------------------

/** Displays accessible non-intrusive toast alert */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconClass =
    type === 'success'
      ? 'fa-circle-check'
      : type === 'error'
      ? 'fa-circle-exclamation'
      : 'fa-circle-info';

  toast.innerHTML = `
    <i class="fa-solid ${iconClass} toast-icon" aria-hidden="true"></i>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-hide');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 250);
  }, 3200);
}

/** Escapes HTML characters to prevent XSS injection */
function escapeHtml(string) {
  const div = document.createElement('div');
  div.textContent = string;
  return div.innerHTML;
}

// ------------------------------------------------------------------------------
// 13. Event Listeners Setup
// ------------------------------------------------------------------------------
function setupEventListeners() {
  // Theme Toggle
  DOM.themeToggleBtn.addEventListener('click', toggleTheme);

  // Type Selector Toggle
  DOM.typeExpenseRadio.addEventListener('change', () => setTransactionType('expense'));
  DOM.typeIncomeRadio.addEventListener('change', () => setTransactionType('income'));
  DOM.expenseTypeLabel.addEventListener('click', () => setTransactionType('expense'));
  DOM.incomeTypeLabel.addEventListener('click', () => setTransactionType('income'));

  // Form Submit
  DOM.form.addEventListener('submit', handleFormSubmit);

  // Clear Form Validation on Input
  [DOM.descriptionInput, DOM.amountInput, DOM.categorySelect, DOM.dateInput].forEach((input) => {
    input.addEventListener('input', () => {
      input.classList.remove('input-error');
    });
  });

  // Search Input
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

  // Type Filter Pills
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

  // Category Filter Select
  DOM.categoryFilter.addEventListener('change', (e) => {
    filterState.category = e.target.value;
    renderTransactionList();
  });

  // Sort Select
  DOM.sortBySelect.addEventListener('change', (e) => {
    filterState.sortBy = e.target.value;
    renderTransactionList();
  });

  // Empty state buttons
  DOM.emptyStateActionBtn.addEventListener('click', () => {
    DOM.descriptionInput.focus();
  });

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

  // Header Actions
  DOM.sampleDataBtn.addEventListener('click', () => {
    transactions = [...SAMPLE_TRANSACTIONS];
    saveTransactions();
    updateUI();
    showToast('Loaded demo sample transactions!', 'success');
  });

  DOM.exportCsvBtn.addEventListener('click', exportTransactionsCSV);
  DOM.clearAllBtn.addEventListener('click', promptClearAll);

  // Modals Actions
  DOM.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
  DOM.confirmDeleteBtn.addEventListener('click', confirmDeleteTransaction);
  DOM.cancelClearBtn.addEventListener('click', closeClearModal);
  DOM.confirmClearBtn.addEventListener('click', confirmClearAll);

  // Close modals on backdrop click
  [DOM.deleteModal, DOM.clearAllModal].forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  });

  // Keyboard accessibility for modals (Escape key)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDeleteModal();
      closeClearModal();
    }
  });
}
