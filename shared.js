/**
 * ==============================================================================
 * Apex Business Finance — Enterprise Security & Shared Engine
 * Web Crypto SHA-256 Password Security, Multi-Account Isolation & Dual-Mode Sync
 * ==============================================================================
 */

const API_BASE = window.location.origin.includes('5000') ? '' : 'http://localhost:5000';
const STORAGE_KEY_TRANSACTIONS = 'apex_transactions_v3';
const STORAGE_KEY_THEME = 'apex_theme_v3';
const STORAGE_KEY_SESSION = 'apex_session_v3';
const STORAGE_KEY_USERS = 'apex_users_v3';
const STORAGE_KEY_PROFILE = 'apex_profile_v3';
const STORAGE_KEY_POLICY = 'apex_policy_v3';
const STORAGE_KEY_ADMIN_FILTER = 'apex_admin_user_filter_v3';

const PASSWORD_SALT = 'apex_finance_secure_salt_v2';

// ------------------------------------------------------------------------------
// Default Seed Accounts (Hashed Credentials)
// ------------------------------------------------------------------------------
const DEFAULT_ACCOUNTS = [
  {
    id: 'usr_1',
    name: 'Elena Rostova',
    email: 'admin@apex.com',
    password_hash: '2283cb7d2ca8b1411516e8853bbf44747ebafcb6fca28faadba9ba25c6f376cf', // admin123
    role: 'admin',
    department: 'Management',
    avatar_color: '#8b5cf6'
  },
  {
    id: 'usr_2',
    name: 'Alex Rivera',
    email: 'alex@apex.com',
    password_hash: '3f4cbda37199c951950e32aa76451e06d917997aa771415df8a5a5bb1d65ca06', // user123
    role: 'user',
    department: 'Sales',
    avatar_color: '#3b82f6'
  },
  {
    id: 'usr_3',
    name: 'Priya Sharma',
    email: 'priya@apex.com',
    password_hash: '3f4cbda37199c951950e32aa76451e06d917997aa771415df8a5a5bb1d65ca06', // user123
    role: 'user',
    department: 'Engineering',
    avatar_color: '#10b981'
  },
  {
    id: 'usr_4',
    name: 'Marcus Vance',
    email: 'marcus@apex.com',
    password_hash: '3f4cbda37199c951950e32aa76451e06d917997aa771415df8a5a5bb1d65ca06', // user123
    role: 'user',
    department: 'Marketing',
    avatar_color: '#ec4899'
  },
  {
    id: 'usr_5',
    name: 'Sophia Chen',
    email: 'sophia@apex.com',
    password_hash: '3f4cbda37199c951950e32aa76451e06d917997aa771415df8a5a5bb1d65ca06', // user123
    role: 'user',
    department: 'Operations',
    avatar_color: '#f59e0b'
  }
];

const BUSINESS_CATEGORIES = {
  expense: [
    { name: 'Salaries & Payroll', icon: 'fa-users', color: '#6366f1' },
    { name: 'Office Rent & Facilities', icon: 'fa-building', color: '#f97316' },
    { name: 'Cloud & Software Tools', icon: 'fa-server', color: '#06b6d4' },
    { name: 'Marketing & Advertising', icon: 'fa-bullhorn', color: '#ec4899' },
    { name: 'Hardware & Equipment', icon: 'fa-laptop', color: '#84cc16' },
    { name: 'Travel & Logistics', icon: 'fa-plane-departure', color: '#14b8a6' },
    { name: 'Utilities & Internet', icon: 'fa-bolt', color: '#eab308' },
    { name: 'Legal, Taxes & Audit', icon: 'fa-scale-balanced', color: '#ef4444' },
    { name: 'Vendor & Contractor Pay', icon: 'fa-truck-fast', color: '#3b82f6' },
    { name: 'Other Operating Cost', icon: 'fa-shapes', color: '#64748b' }
  ],
  income: [
    { name: 'Client Invoices & Retainers', icon: 'fa-file-invoice-dollar', color: '#10b981' },
    { name: 'Consulting & Services', icon: 'fa-handshake', color: '#06b6d4' },
    { name: 'Product & SaaS Sales', icon: 'fa-boxes-stacked', color: '#3b82f6' },
    { name: 'Investments & Returns', icon: 'fa-arrow-trend-up', color: '#8b5cf6' },
    { name: 'Grants & Subsidies', icon: 'fa-award', color: '#ec4899' },
    { name: 'Other Business Revenue', icon: 'fa-coins', color: '#14b8a6' }
  ]
};

// ------------------------------------------------------------------------------
// Web Crypto SHA-256 Helper
// ------------------------------------------------------------------------------
async function sha256Hex(str) {
  const enc = new TextEncoder();
  const data = enc.encode(str + PASSWORD_SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ------------------------------------------------------------------------------
// Authentication Manager
// ------------------------------------------------------------------------------
const AuthManager = {
  getCurrentUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SESSION);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  },

  getAllUsers() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_USERS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [...DEFAULT_ACCOUNTS];
  },

  async login(email, password) {
    const cleanEmail = email.trim().toLowerCase();
    
    // 1. Try Backend API
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
        signal: AbortSignal.timeout(2000)
      });
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        const user = json.data;
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
        return user;
      }
    } catch (e) {
      // Fallback to local crypto store (GitHub Pages mode)
    }

    // 2. Standalone Web Crypto Validation (GitHub Pages)
    const users = this.getAllUsers();
    const hash = await sha256Hex(password);
    const found = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!found || (found.password_hash !== hash && found.password_hash !== password)) {
      throw new Error('Invalid email or password.');
    }

    const sessionUser = {
      id: found.id,
      name: found.name,
      email: found.email,
      role: found.role,
      department: found.department,
      avatar_color: found.avatar_color || '#6366f1',
      token: `sess_${found.id}_${Date.now()}`
    };

    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(sessionUser));
    return sessionUser;
  },

  async register(name, email, password, role = 'user', department = 'General', avatar_color = '#6366f1') {
    const cleanEmail = email.trim().toLowerCase();
    const hash = await sha256Hex(password);
    const newId = `usr_${Date.now()}`;

    // 1. Try Backend API
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: cleanEmail, password, role, department, avatar_color }),
        signal: AbortSignal.timeout(2000)
      });
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        const user = json.data;
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
        return user;
      }
    } catch (e) {
      // Fallback
    }

    // 2. Standalone Registration (GitHub Pages)
    const users = this.getAllUsers();
    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      throw new Error('An account with this email already exists.');
    }

    const newUser = {
      id: newId,
      name,
      email: cleanEmail,
      password_hash: hash,
      role,
      department,
      avatar_color
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));

    const sessionUser = {
      id: newId,
      name,
      email: cleanEmail,
      role,
      department,
      avatar_color,
      token: `sess_${newId}_${Date.now()}`
    };

    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(sessionUser));
    return sessionUser;
  },

  logout() {
    localStorage.removeItem(STORAGE_KEY_SESSION);
    showToast('Signed out successfully', 'info');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 300);
  },

  requireAuth() {
    const user = this.getCurrentUser();
    const page = window.location.pathname.split('/').pop() || 'index.html';
    if (!user && page !== 'login.html') {
      window.location.href = 'login.html';
      return false;
    }
    return user;
  },

  requireAdmin() {
    const user = this.requireAuth();
    if (!user) return false;
    if (user.role !== 'admin') {
      alert('Access Denied: The Executive Admin Command Center requires administrator privileges.');
      window.location.href = 'index.html';
      return false;
    }
    return user;
  }
};

// ------------------------------------------------------------------------------
// Global Initialization & Route Guards
// ------------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  if (currentPage !== 'login.html') {
    const currentUser = AuthManager.requireAuth();
    if (!currentUser) return;

    if (currentPage === 'admin.html') {
      if (!AuthManager.requireAdmin()) return;
    }

    initTheme();
    highlightActiveNav();
    setupSidebarToggle();
    updateSidebarUserProfile(currentUser);
    injectTopbarControls(currentUser);
    await checkBackendHealth();
    await loadGlobalBusinessProfile();
  }
});

// ------------------------------------------------------------------------------
// Topbar User Menu & Admin Inspection Banner
// ------------------------------------------------------------------------------
function updateSidebarUserProfile(user) {
  const sidebarAvatar = document.querySelector('.sidebar-user .user-avatar');
  const sidebarName = document.querySelector('.sidebar-user .user-name');
  const sidebarRole = document.querySelector('.sidebar-user .user-role');

  if (sidebarAvatar) {
    sidebarAvatar.textContent = getInitials(user.name);
    sidebarAvatar.style.backgroundColor = user.avatar_color || '#8b5cf6';
  }
  if (sidebarName) sidebarName.textContent = user.name;
  if (sidebarRole) sidebarRole.textContent = `${user.role.toUpperCase()} • ${user.department}`;
}

function injectTopbarControls(user) {
  const actions = document.querySelector('.topbar-actions');
  if (!actions || document.getElementById('userProfileMenuWrap')) return;

  const wrap = document.createElement('div');
  wrap.className = 'user-profile-menu-wrap';
  wrap.id = 'userProfileMenuWrap';

  const isAdmin = user.role === 'admin';
  const currentFilter = getSelectedUserFilter();

  wrap.innerHTML = `
    ${isAdmin ? `
      <div class="admin-tracking-pill" title="Administrator View Filter">
        <i class="fa-solid fa-filter" style="font-size: 0.7rem; color: var(--purple);"></i>
        <select id="adminUserFilterSelect" class="admin-filter-dropdown" aria-label="Filter user data">
          <option value="all" ${currentFilter === 'all' ? 'selected' : ''}>👁️ All Team Data</option>
        </select>
      </div>
    ` : ''}

    <div class="user-pill-btn" id="userPillBtn" title="Current Account Profile">
      <span class="user-pill-avatar" style="background-color: ${user.avatar_color || '#6366f1'}">
        ${getInitials(user.name)}
      </span>
      <div class="user-pill-info">
        <span class="user-pill-name">${escapeHtml(user.name.split(' ')[0])}</span>
        <span class="user-pill-badge ${isAdmin ? 'admin' : 'staff'}">${isAdmin ? 'Admin' : 'Staff'}</span>
      </div>
      <button class="logout-mini-btn" id="topbarLogoutBtn" title="Sign Out">
        <i class="fa-solid fa-right-from-bracket"></i>
      </button>
    </div>
  `;

  // Insert before theme toggle
  const themeToggle = document.getElementById('themeToggleBtn');
  if (themeToggle) {
    actions.insertBefore(wrap, themeToggle);
  } else {
    actions.prepend(wrap);
  }

  // Bind logout
  document.getElementById('topbarLogoutBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to log out of your workspace?')) {
      AuthManager.logout();
    }
  });

  // Populate Admin User Selector
  if (isAdmin) {
    populateAdminUserFilterOptions();
  }
}

function getSelectedUserFilter() {
  return localStorage.getItem(STORAGE_KEY_ADMIN_FILTER) || 'all';
}

function setSelectedUserFilter(val) {
  localStorage.setItem(STORAGE_KEY_ADMIN_FILTER, val);
  if (typeof onFilterChanged === 'function') {
    onFilterChanged(val);
  }
}

async function populateAdminUserFilterOptions() {
  const select = document.getElementById('adminUserFilterSelect');
  if (!select) return;

  const users = AuthManager.getAllUsers();
  const current = getSelectedUserFilter();

  let html = `<option value="all" ${current === 'all' ? 'selected' : ''}>👁️ All Team Data (Consolidated)</option>`;
  users.forEach(u => {
    html += `<option value="${u.id}" ${current === u.id ? 'selected' : ''}>👤 ${escapeHtml(u.name)} (${escapeHtml(u.department)})</option>`;
  });
  select.innerHTML = html;

  select.addEventListener('change', (e) => {
    setSelectedUserFilter(e.target.value);
    showToast(`Display filtered to: ${select.options[select.selectedIndex].text}`, 'info');
    if (typeof refreshCurrentPageData === 'function') {
      refreshCurrentPageData();
    } else {
      window.location.reload();
    }
  });
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
    const res = await fetch(`${API_BASE}/api/admin/policy`, { signal: AbortSignal.timeout(1500) });
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
  const user = AuthManager.getCurrentUser() || { name: 'Admin' };
  try {
    const res = await fetch(`${API_BASE}/api/admin/policy/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Name': user.name },
      body: JSON.stringify({ operator_user: user.name })
    });
    const json = await res.json();
    if (json.status === 'success') {
      localStorage.setItem(STORAGE_KEY_POLICY, JSON.stringify(json.data));
      return json.data;
    }
  } catch (e) {}

  // Fallback
  const cur = await fetchPolicy();
  const next = !cur.immutable_policy_enabled;
  const data = { immutable_policy_enabled: next, message: `Immutable Policy is now ${next ? 'ENABLED' : 'DISABLED'}` };
  localStorage.setItem(STORAGE_KEY_POLICY, JSON.stringify(data));
  return data;
}

async function permanentPurgeTransaction(txId) {
  const user = AuthManager.getCurrentUser() || { name: 'Admin' };
  try {
    const res = await fetch(`${API_BASE}/api/admin/purge/${txId}`, {
      method: 'DELETE',
      headers: { 'X-User-Name': user.name }
    });
    const json = await res.json();
    if (res.ok) return json;
    throw new Error(json.message || 'Purge failed');
  } catch (e) {
    if (e.message && e.message.includes('ACTIVE')) throw e;
  }

  // Fallback
  let list = getLocalTransactions();
  list = list.filter(t => t.id !== txId);
  localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(list));
  return { status: 'success', message: 'Record permanently purged.' };
}

async function permanentPurgeAll() {
  const user = AuthManager.getCurrentUser() || { name: 'Admin' };
  try {
    const res = await fetch(`${API_BASE}/api/admin/purge-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Name': user.name },
      body: JSON.stringify({ operator_user: user.name })
    });
    const json = await res.json();
    if (res.ok) return json;
    throw new Error(json.message || 'Purge all failed');
  } catch (e) {
    if (e.message && e.message.includes('ACTIVE')) throw e;
  }

  // Fallback
  let list = getLocalTransactions();
  list = list.filter(t => !t.is_deleted);
  localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(list));
  return { status: 'success', message: 'All archived records permanently purged.' };
}

// ------------------------------------------------------------------------------
// Data Operations with Per-User Isolation
// ------------------------------------------------------------------------------
async function fetchTransactions(filters = {}) {
  const curUser = AuthManager.getCurrentUser();
  const isAdmin = curUser && curUser.role === 'admin';
  const selectedFilter = getSelectedUserFilter();

  let targetUserId = '';
  if (!isAdmin && curUser) {
    targetUserId = curUser.id;
  } else if (isAdmin && selectedFilter !== 'all') {
    targetUserId = selectedFilter;
  }

  try {
    let url = `${API_BASE}/api/transactions`;
    const params = new URLSearchParams();
    if (targetUserId) params.append('user_id', targetUserId);
    if (filters.department) params.append('department', filters.department);
    if ([...params.keys()].length > 0) url += `?${params.toString()}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success') {
        updateBackendBadge(true);
        return json.data;
      }
    }
  } catch (e) {
    updateBackendBadge(false);
  }

  // Standalone fallback filtering
  let localList = getLocalTransactions().filter(t => !t.is_deleted);
  if (targetUserId) {
    localList = localList.filter(t => t.user_id === targetUserId || (curUser && t.user_email === curUser.email));
  }
  return localList;
}

function getLocalTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  
  // Seed sample transactions into local store for standalone mode
  const sample = [
    { id: 'tx_b_1', description: 'Client Retainer — Cloud Migration', amount: 185000.0, type: 'income', category: 'Client Invoices & Retainers', date: '2026-08-02', user_id: 'usr_2', user_name: 'Alex Rivera', user_email: 'alex@apex.com', department: 'Sales', avatar_color: '#3b82f6', is_deleted: 0 },
    { id: 'tx_b_2', description: 'Office Rent & Facilities Lease', amount: 45000.0, type: 'expense', category: 'Office Rent & Facilities', date: '2026-08-03', user_id: 'usr_5', user_name: 'Sophia Chen', user_email: 'sophia@apex.com', department: 'Operations', avatar_color: '#f59e0b', is_deleted: 0 },
    { id: 'tx_b_3', description: 'Design & Engineering Payroll', amount: 95000.0, type: 'expense', category: 'Salaries & Payroll', date: '2026-08-05', user_id: 'usr_1', user_name: 'Elena Rostova', user_email: 'admin@apex.com', department: 'Management', avatar_color: '#8b5cf6', is_deleted: 0 },
    { id: 'tx_b_4', description: 'AWS Infrastructure & Server Hosting', amount: 12400.0, type: 'expense', category: 'Cloud & Software Tools', date: '2026-08-09', user_id: 'usr_3', user_name: 'Priya Sharma', user_email: 'priya@apex.com', department: 'Engineering', avatar_color: '#10b981', is_deleted: 0 }
  ];
  localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(sample));
  return sample;
}

async function saveTransactionRecord(tx) {
  const curUser = AuthManager.getCurrentUser() || { id: 'usr_1', name: 'Staff', email: 'staff@apex.com', department: 'General', avatar_color: '#6366f1' };
  
  const payload = {
    ...tx,
    user_id: tx.user_id || curUser.id,
    user_name: tx.user_name || curUser.name,
    user_email: tx.user_email || curUser.email,
    department: tx.department || curUser.department,
    avatar_color: tx.avatar_color || curUser.avatar_color
  };

  try {
    const res = await fetch(`${API_BASE}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Name': curUser.name },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(2000)
    });
    if (res.ok) {
      updateBackendBadge(true);
      return true;
    }
  } catch (e) {
    updateBackendBadge(false);
  }

  const list = getLocalTransactions();
  list.unshift(payload);
  localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(list));
  return true;
}

async function deleteTransactionRecord(id) {
  const curUser = AuthManager.getCurrentUser() || { name: 'Staff' };
  try {
    const res = await fetch(`${API_BASE}/api/transactions/${id}`, {
      method: 'DELETE',
      headers: { 'X-User-Name': curUser.name },
      signal: AbortSignal.timeout(2000)
    });
    if (res.ok) {
      updateBackendBadge(true);
      return true;
    }
  } catch (e) {
    updateBackendBadge(false);
  }

  let list = getLocalTransactions();
  list = list.map(t => t.id === id ? { ...t, is_deleted: 1, deleted_at: new Date().toISOString() } : t);
  localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(list));
  return true;
}

// ------------------------------------------------------------------------------
// Business Profile & System Status
// ------------------------------------------------------------------------------
async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { method: 'GET', signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      updateBackendBadge(true);
      return true;
    }
  } catch (err) {}
  updateBackendBadge(false);
  return false;
}

function updateBackendBadge(online) {
  const badge = document.getElementById('backendStatusBadge');
  const text = document.getElementById('backendStatusText');
  if (!badge || !text) return;

  if (online) {
    badge.className = 'backend-badge connected';
    text.textContent = 'SQLite Active (WAL)';
  } else {
    badge.className = 'backend-badge local-mode';
    text.textContent = 'GitHub Pages / Offline';
  }
}

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

  document.querySelectorAll('.sidebar-company-name').forEach(el => el.textContent = profile.company_name);
  return profile;
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

function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY_THEME) || 'dark';
  document.documentElement.setAttribute('data-theme', saved);

  const themeBtn = document.getElementById('themeToggleBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(STORAGE_KEY_THEME, next);
      showToast(`Switched to ${next === 'dark' ? 'Dark' : 'Light'} Mode`, 'info');
    });
  }
}

// ------------------------------------------------------------------------------
// Formatters & Toasts
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
