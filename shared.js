/**
 * ==============================================================================
 * Apex Business Finance — Enterprise Multi-User Shared Client Engine
 * Robust SQLite Sync, Multi-User Session State, Policy Controls & UI Injection
 * ==============================================================================
 */

const API_BASE = window.location.origin.includes('5000') ? '' : 'http://localhost:5000';
const STORAGE_KEY_TRANSACTIONS = 'apex_transactions_v2';
const STORAGE_KEY_THEME = 'apex_theme_v2';
const STORAGE_KEY_ACTIVE_USER = 'apex_active_user_v2';
const STORAGE_KEY_PROFILE = 'apex_profile_v2';
const STORAGE_KEY_POLICY = 'apex_policy_v2';

const DEFAULT_TEAM_USERS = [
  { id: 'usr_1', name: 'Elena Rostova', email: 'elena.rostova@apexsolutions.com', role: 'Finance Director (Admin)', department: 'Management', avatar_color: '#8b5cf6' },
  { id: 'usr_2', name: 'Alex Rivera', email: 'alex.rivera@apexsolutions.com', role: 'Enterprise Sales Lead', department: 'Sales', avatar_color: '#3b82f6' },
  { id: 'usr_3', name: 'Priya Sharma', email: 'priya.sharma@apexsolutions.com', role: 'Principal Cloud Architect', department: 'Engineering', avatar_color: '#10b981' },
  { id: 'usr_4', name: 'Marcus Vance', email: 'marcus.vance@apexsolutions.com', role: 'Marketing Director', department: 'Marketing', avatar_color: '#ec4899' },
  { id: 'usr_5', name: 'Sophia Chen', email: 'sophia.chen@apexsolutions.com', role: 'Operations Specialist', department: 'Operations', avatar_color: '#f59e0b' }
];

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

let isBackendLive = false;
let currentTeamUsers = [...DEFAULT_TEAM_USERS];
let currentActiveUser = DEFAULT_TEAM_USERS[0];

// ------------------------------------------------------------------------------
// Global Initialization
// ------------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  highlightActiveNav();
  setupSidebarToggle();
  await checkBackendHealth();
  await loadTeamUsers();
  initUserSession();
  await loadGlobalBusinessProfile();
});

// ------------------------------------------------------------------------------
// User Session & Switcher
// ------------------------------------------------------------------------------
async function loadTeamUsers() {
  try {
    const res = await fetch(`${API_BASE}/api/users`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
        currentTeamUsers = json.data;
      }
    }
  } catch (e) {
    // Keep default roster
  }
}

function initUserSession() {
  const savedUserId = localStorage.getItem(STORAGE_KEY_ACTIVE_USER);
  if (savedUserId) {
    const found = currentTeamUsers.find(u => u.id === savedUserId);
    if (found) currentActiveUser = found;
  }
  updateUserUI();
  injectUserSwitcher();
}

function getActiveUser() {
  return currentActiveUser;
}

function setActiveUser(userId) {
  const user = currentTeamUsers.find(u => u.id === userId);
  if (user) {
    currentActiveUser = user;
    localStorage.setItem(STORAGE_KEY_ACTIVE_USER, user.id);
    updateUserUI();
    showToast(`Switched active profile to ${user.name} (${user.department})`, 'info');
    if (typeof onActiveUserChanged === 'function') {
      onActiveUserChanged(user);
    }
  }
}

function updateUserUI() {
  // Update sidebar user widget
  const sidebarAvatar = document.querySelector('.sidebar-user .user-avatar');
  const sidebarName = document.querySelector('.sidebar-user .user-name');
  const sidebarRole = document.querySelector('.sidebar-user .user-role');

  if (sidebarAvatar) {
    sidebarAvatar.textContent = getInitials(currentActiveUser.name);
    sidebarAvatar.style.backgroundColor = currentActiveUser.avatar_color || '#8b5cf6';
  }
  if (sidebarName) sidebarName.textContent = currentActiveUser.name;
  if (sidebarRole) sidebarRole.textContent = `${currentActiveUser.role} • ${currentActiveUser.department}`;

  // Update topbar button text if present
  const topbarName = document.getElementById('activeUserBtnName');
  const topbarAvatar = document.getElementById('activeUserBtnAvatar');
  if (topbarName) topbarName.textContent = currentActiveUser.name.split(' ')[0];
  if (topbarAvatar) {
    topbarAvatar.textContent = getInitials(currentActiveUser.name);
    topbarAvatar.style.backgroundColor = currentActiveUser.avatar_color || '#8b5cf6';
  }
}

function injectUserSwitcher() {
  const actionsContainer = document.querySelector('.topbar-actions');
  if (!actionsContainer || document.getElementById('userSwitcherWrap')) return;

  const switcher = document.createElement('div');
  switcher.className = 'user-switcher-wrap';
  switcher.id = 'userSwitcherWrap';

  switcher.innerHTML = `
    <button class="user-switcher-btn" id="userSwitcherBtn" title="Switch Team Member Account" aria-label="Switch User">
      <span class="user-badge-avatar" id="activeUserBtnAvatar" style="background-color: ${currentActiveUser.avatar_color || '#8b5cf6'}">
        ${getInitials(currentActiveUser.name)}
      </span>
      <span id="activeUserBtnName">${escapeHtml(currentActiveUser.name.split(' ')[0])}</span>
      <i class="fa-solid fa-chevron-down" style="font-size: 0.7rem; color: var(--text-muted);"></i>
    </button>
    <div class="user-switcher-menu" id="userSwitcherMenu">
      <div class="user-menu-header">Active Team Member</div>
      <div id="userSwitcherOptions"></div>
    </div>
  `;

  // Insert before theme toggle
  const themeToggle = document.getElementById('themeToggleBtn');
  if (themeToggle) {
    actionsContainer.insertBefore(switcher, themeToggle);
  } else {
    actionsContainer.prepend(switcher);
  }

  // Populate options
  renderUserSwitcherOptions();

  // Toggle handler
  const btn = document.getElementById('userSwitcherBtn');
  const menu = document.getElementById('userSwitcherMenu');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    menu.classList.remove('show');
  });
}

function renderUserSwitcherOptions() {
  const container = document.getElementById('userSwitcherOptions');
  if (!container) return;

  container.innerHTML = currentTeamUsers.map(u => `
    <button class="user-option ${u.id === currentActiveUser.id ? 'active' : ''}" onclick="setActiveUser('${u.id}')">
      <span class="user-badge-avatar" style="background-color: ${u.avatar_color || '#6366f1'}">
        ${getInitials(u.name)}
      </span>
      <div class="user-option-info">
        <span class="user-option-name">${escapeHtml(u.name)}</span>
        <span class="user-option-role">${escapeHtml(u.role)} • ${escapeHtml(u.department)}</span>
      </div>
    </button>
  `).join('');
}

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ------------------------------------------------------------------------------
// Policy & Purge Controls
// ------------------------------------------------------------------------------
async function fetchPolicy() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/policy`, { signal: AbortSignal.timeout(1800) });
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success') {
        localStorage.setItem(STORAGE_KEY_POLICY, JSON.stringify(json.data));
        return json.data;
      }
    }
  } catch (e) {}

  try {
    const cached = localStorage.getItem(STORAGE_KEY_POLICY);
    if (cached) return JSON.parse(cached);
  } catch (e) {}

  return { immutable_policy_enabled: true };
}

async function togglePolicy() {
  const active = getActiveUser();
  const res = await fetch(`${API_BASE}/api/admin/policy/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Name': active.name },
    body: JSON.stringify({ operator_user: active.name })
  });
  const json = await res.json();
  if (json.status === 'success') {
    localStorage.setItem(STORAGE_KEY_POLICY, JSON.stringify(json.data));
    return json.data;
  }
  throw new Error(json.message || 'Failed to toggle policy');
}

async function permanentPurgeTransaction(txId) {
  const active = getActiveUser();
  const res = await fetch(`${API_BASE}/api/admin/purge/${txId}`, {
    method: 'DELETE',
    headers: { 'X-User-Name': active.name }
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Purge failed');
  }
  return json;
}

async function permanentPurgeAll() {
  const active = getActiveUser();
  const res = await fetch(`${API_BASE}/api/admin/purge-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Name': active.name },
    body: JSON.stringify({ operator_user: active.name })
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Purge all failed');
  }
  return json;
}

// ------------------------------------------------------------------------------
// Backend Health Check
// ------------------------------------------------------------------------------
async function checkBackendHealth() {
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
}

function updateBackendBadge(online) {
  const badge = document.getElementById('backendStatusBadge');
  const badgeText = document.getElementById('backendStatusText');
  if (!badge || !badgeText) return;

  if (online) {
    badge.className = 'backend-badge connected';
    badgeText.textContent = 'SQLite Active (WAL)';
  } else {
    badge.className = 'backend-badge local-mode';
    badgeText.textContent = 'Offline Mode';
  }
}

// ------------------------------------------------------------------------------
// Transaction Data Operations
// ------------------------------------------------------------------------------
async function fetchTransactions(filters = {}) {
  try {
    let url = `${API_BASE}/api/transactions`;
    const params = new URLSearchParams();
    if (filters.user_id) params.append('user_id', filters.user_id);
    if (filters.department) params.append('department', filters.department);
    if ([...params.keys()].length > 0) url += `?${params.toString()}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
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

  return getLocalTransactions();
}

function getLocalTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return [];
}

async function saveTransactionRecord(tx) {
  const active = getActiveUser();
  const payload = {
    ...tx,
    user_id: tx.user_id || active.id,
    user_name: tx.user_name || active.name,
    department: tx.department || active.department,
    avatar_color: tx.avatar_color || active.avatar_color
  };

  try {
    const res = await fetch(`${API_BASE}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Name': active.name },
      body: JSON.stringify(payload),
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
  list.unshift(payload);
  localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(list));
  return true;
}

async function deleteTransactionRecord(id) {
  const active = getActiveUser();
  try {
    const res = await fetch(`${API_BASE}/api/transactions/${id}`, {
      method: 'DELETE',
      headers: { 'X-User-Name': active.name },
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
// Business Profile
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
  document.querySelectorAll('.sidebar-company-name').forEach((el) => {
    el.textContent = p.company_name;
  });

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
// UI Utilities
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
