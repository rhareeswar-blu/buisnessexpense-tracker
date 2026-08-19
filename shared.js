/**
 * ==============================================================================
 * Apex Business Finance — Shared Client Engine
 * Robust Backend SQLite Synchronization, LocalStorage Fallback, Theme & Nav
 * ==============================================================================
 */

const API_BASE = window.location.origin.includes('5000') ? '' : 'http://localhost:5000';
const STORAGE_KEY_TRANSACTIONS = 'rupeewise_transactions_v1';
const STORAGE_KEY_THEME = 'rupeewise_theme_v1';
const STORAGE_KEY_AUDIT = 'rupeewise_audit_logs_v1';
const STORAGE_KEY_PROFILE = 'rupeewise_profile_v1';

const BUSINESS_CATEGORIES = {
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

const DEFAULT_SAMPLE_DATA = [
  { id: 'tx_b_1', description: 'Client Retainer — Enterprise Cloud Migration', amount: 185000, type: 'income', category: 'Client Invoices & Retainers', date: getRelativeDate(2) },
  { id: 'tx_b_2', description: 'Monthly Office Lease & Co-working Space', amount: 45000, type: 'expense', category: 'Office Rent & Facilities', date: getRelativeDate(3) },
  { id: 'tx_b_3', description: 'Core Engineering & Design Team Payroll', amount: 95000, type: 'expense', category: 'Salaries & Payroll', date: getRelativeDate(5) },
  { id: 'tx_b_4', description: 'SaaS Consulting & Custom API Integration', amount: 68000, type: 'income', category: 'Consulting & Services', date: getRelativeDate(7) },
  { id: 'tx_b_5', description: 'AWS Cloud Infrastructure & Server Hosting', amount: 12400, type: 'expense', category: 'Cloud & Software Tools', date: getRelativeDate(9) },
  { id: 'tx_b_6', description: 'Digital Marketing Campaign & Google Ads', amount: 16500, type: 'expense', category: 'Marketing & Advertising', date: getRelativeDate(12) },
  { id: 'tx_b_7', description: 'Quarterly High-Yield Corporate Deposit', amount: 8500, type: 'income', category: 'Investments & Returns', date: getRelativeDate(14) },
  { id: 'tx_b_8', description: 'Office Gigabit Internet & Power Utilities', amount: 4800, type: 'expense', category: 'Utilities & Internet', date: getRelativeDate(16) }
];

function getRelativeDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

let isBackendLive = false;
let backendCheckPromise = null;

// ------------------------------------------------------------------------------
// Global Initialization
// ------------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  highlightActiveNav();
  setupSidebarToggle();
  await checkBackendHealth();
  await loadGlobalBusinessProfile();
});

// ------------------------------------------------------------------------------
// Backend Health Check
// ------------------------------------------------------------------------------
async function checkBackendHealth() {
  if (backendCheckPromise) return backendCheckPromise;

  backendCheckPromise = (async () => {
    const badge = document.getElementById('backendStatusBadge');
    const badgeText = document.getElementById('backendStatusText');

    try {
      const res = await fetch(`${API_BASE}/api/health`, { method: 'GET', signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        isBackendLive = true;
        updateBackendBadge(true);
        return true;
      }
    } catch (err) {
      isBackendLive = false;
    }

    updateBackendBadge(false);
    return false;
  })();

  return backendCheckPromise;
}

function updateBackendBadge(online) {
  const badge = document.getElementById('backendStatusBadge');
  const badgeText = document.getElementById('backendStatusText');
  if (!badge || !badgeText) return;

  if (online) {
    badge.className = 'backend-badge connected';
    badgeText.textContent = 'SQLite Database Active';
  } else {
    badge.className = 'backend-badge local-mode';
    badgeText.textContent = 'LocalStorage Mode';
  }
}

// ------------------------------------------------------------------------------
// Load Transactions (Direct API Query with Seamless Fallback)
// ------------------------------------------------------------------------------
async function fetchTransactions() {
  // Try direct API call first
  try {
    const res = await fetch(`${API_BASE}/api/transactions`, { signal: AbortSignal.timeout(1800) });
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success') {
        isBackendLive = true;
        updateBackendBadge(true);
        return json.data;
      }
    }
  } catch (e) {
    isBackendLive = false;
    updateBackendBadge(false);
  }

  // Fallback to LocalStorage
  return getLocalTransactions();
}

function getLocalTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    // Seed default sample data if completely empty in offline mode
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(DEFAULT_SAMPLE_DATA));
    return [...DEFAULT_SAMPLE_DATA];
  } catch (e) {
    return [...DEFAULT_SAMPLE_DATA];
  }
}

async function saveTransactionRecord(tx) {
  try {
    const res = await fetch(`${API_BASE}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx),
      signal: AbortSignal.timeout(2000)
    });
    if (res.ok) {
      isBackendLive = true;
      updateBackendBadge(true);
      return true;
    }
  } catch (e) {
    isBackendLive = false;
    updateBackendBadge(false);
  }

  const list = getLocalTransactions();
  list.unshift(tx);
  localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(list));
  return true;
}

async function deleteTransactionRecord(id) {
  try {
    const res = await fetch(`${API_BASE}/api/transactions/${id}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(2000)
    });
    if (res.ok) {
      isBackendLive = true;
      updateBackendBadge(true);
      return true;
    }
  } catch (e) {
    isBackendLive = false;
    updateBackendBadge(false);
  }

  let list = getLocalTransactions();
  list = list.filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(list));
  return true;
}

// ------------------------------------------------------------------------------
// Business Profile Loader & Sync
// ------------------------------------------------------------------------------
async function loadGlobalBusinessProfile() {
  let profile = {
    company_name: 'Apex Business Solutions Pvt. Ltd.',
    tax_id: 'GSTIN: 27AABCU9603R1ZN',
    financial_year: '2026-2027'
  };

  try {
    const res = await fetch(`${API_BASE}/api/business-profile`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        profile = json.data;
        localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
      }
    }
  } catch (e) {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (cached) profile = JSON.parse(cached);
    } catch (err) {}
  }

  applyProfileToUI(profile);
  return profile;
}

function applyProfileToUI(p) {
  // Update sidebar
  document.querySelectorAll('.sidebar-company-name').forEach((el) => {
    el.textContent = p.company_name;
  });

  // Update Statement heading & metadata if present
  const stmtHeading = document.getElementById('stmtCompanyHeading');
  if (stmtHeading) stmtHeading.textContent = p.company_name;

  const stmtCompanyName = document.getElementById('stmtCompanyName');
  if (stmtCompanyName) stmtCompanyName.textContent = p.company_name;

  const stmtTaxMeta = document.getElementById('stmtTaxMeta');
  if (stmtTaxMeta) {
    const tax = p.tax_id ? p.tax_id : 'Tax ID: Registered';
    const fy = p.financial_year ? p.financial_year : '2026-2027';
    stmtTaxMeta.textContent = `${tax} • Financial Year: ${fy}`;
  }

  const stmtCompanyTaxId = document.getElementById('stmtCompanyTaxId');
  if (stmtCompanyTaxId) {
    const tax = p.tax_id ? p.tax_id : 'Tax ID: Registered';
    const fy = p.financial_year ? p.financial_year : '2026-2027';
    stmtCompanyTaxId.textContent = `${tax} • Financial Year: ${fy}`;
  }

  const headerCompanyName = document.getElementById('headerCompanyName');
  if (headerCompanyName) headerCompanyName.textContent = p.company_name;
}

// ------------------------------------------------------------------------------
// Navigation & Sidebar
// ------------------------------------------------------------------------------
function highlightActiveNav() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach((link) => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

function setupSidebarToggle() {
  const toggleBtn = document.getElementById('mobileMenuBtn');
  const sidebar = document.querySelector('.app-sidebar');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }
}

// ------------------------------------------------------------------------------
// Theme Management
// ------------------------------------------------------------------------------
function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY_THEME) || 'light';
  document.documentElement.setAttribute('data-theme', saved);

  const themeBtn = document.getElementById('themeToggleBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      const next = cur === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(STORAGE_KEY_THEME, next);
      showToast(`Switched to ${next === 'dark' ? 'Dark' : 'Light'} Mode`, 'info');
      if (typeof onThemeChanged === 'function') {
        onThemeChanged(next);
      }
    });
  }
}

// ------------------------------------------------------------------------------
// Formatters & UI Utilities
// ------------------------------------------------------------------------------
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(amount) || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info'}"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

function escapeHtml(string) {
  const div = document.createElement('div');
  div.textContent = string || '';
  return div.innerHTML;
}
