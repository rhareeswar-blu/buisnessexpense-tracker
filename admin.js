/**
 * ==============================================================================
 * Apex Business Finance — Executive Admin Command Center Controller
 * Security Policy Management, Permanent Purge, Team Roster & Master Audit Engine
 * ==============================================================================
 */

let currentPolicy = { immutable_policy_enabled: true };
let currentAuditLogs = [];
let currentArchivedTxs = [];
let currentRoster = [];
let currentStatementData = null;

document.addEventListener('DOMContentLoaded', async () => {
  setupAdminTabs();
  setupAdminEventListeners();
  await refreshAdminDashboard();
});

async function refreshAdminDashboard() {
  await Promise.all([
    loadAdminKPIs(),
    loadSecurityPolicy(),
    loadArchivedTransactions(),
    loadTeamRoster(),
    loadMasterAuditLogs(),
    generateStatement('this-month')
  ]);
}

// ------------------------------------------------------------------------------
// Tabs & Layout
// ------------------------------------------------------------------------------
function setupAdminTabs() {
  const tabs = document.querySelectorAll('.admin-tab-btn');
  const panels = document.querySelectorAll('.admin-panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      panels.forEach((p) => p.classList.remove('active'));

      tab.classList.add('active');
      const targetId = tab.getAttribute('data-tab');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });
}

// ------------------------------------------------------------------------------
// Event Listeners & Modals
// ------------------------------------------------------------------------------
function setupAdminEventListeners() {
  document.getElementById('refreshAdminBtn')?.addEventListener('click', async () => {
    await refreshAdminDashboard();
    showToast('Admin data synchronized with SQLite', 'success');
  });

  // Policy Toggle
  document.getElementById('togglePolicyBtn')?.addEventListener('click', () => {
    const isEnforced = currentPolicy.immutable_policy_enabled;
    const msg = isEnforced
      ? '⚠️ WARNING: Disabling the Immutable Policy will allow administrators to PERMANENTLY PURGE and destroy deleted transactions from the database. Are you sure you want to permit permanent deletion?'
      : 'Enabling the Immutable Policy will strictly prevent all permanent deletions and enforce soft-deletes and full audit retention.';

    document.getElementById('policyModalMessage').innerHTML = msg;
    document.getElementById('policyWarningModal').classList.add('active');
  });

  document.getElementById('cancelPolicyModalBtn')?.addEventListener('click', () => {
    document.getElementById('policyWarningModal').classList.remove('active');
  });

  document.getElementById('closePolicyModalBtn')?.addEventListener('click', () => {
    document.getElementById('policyWarningModal').classList.remove('active');
  });

  document.getElementById('confirmPolicyToggleBtn')?.addEventListener('click', async () => {
    document.getElementById('policyWarningModal').classList.remove('active');
    try {
      const res = await togglePolicy();
      currentPolicy = res;
      applyPolicyToUI(res.immutable_policy_enabled);
      await loadArchivedTransactions();
      await loadMasterAuditLogs();
      showToast(res.message, 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  });

  // Empty Trash (Bulk Purge)
  document.getElementById('emptyTrashBtn')?.addEventListener('click', async () => {
    if (currentPolicy.immutable_policy_enabled) {
      showToast('Action blocked: Immutable Policy is active.', 'error');
      return;
    }

    if (!confirm('🚨 PERMANENT ACTION: Are you sure you want to permanently purge all archived records from the database? This cannot be undone.')) {
      return;
    }

    try {
      const res = await permanentPurgeAll();
      showToast(res.message, 'success');
      await loadArchivedTransactions();
      await loadMasterAuditLogs();
    } catch (e) {
      showToast(e.message, 'error');
    }
  });

  // Add User Modal
  const addUserModal = document.getElementById('addUserModal');
  document.getElementById('openAddUserModalBtn')?.addEventListener('click', () => {
    addUserModal.classList.add('active');
  });
  document.getElementById('closeAddUserModalBtn')?.addEventListener('click', () => {
    addUserModal.classList.remove('active');
  });
  document.getElementById('cancelAddUserBtn')?.addEventListener('click', () => {
    addUserModal.classList.remove('active');
  });

  document.getElementById('addUserForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('newUserName').value.trim();
    const email = document.getElementById('newUserEmail').value.trim();
    const role = document.getElementById('newUserRole').value.trim();
    const dept = document.getElementById('newUserDept').value;
    const password = document.getElementById('newUserPassword').value;
    const color = document.getElementById('newUserColor').value;

    try {
      await AuthManager.register(name, email, password, role, dept, color);
      showToast(`Team member "${name}" created with password.`, 'success');
      addUserModal.classList.remove('active');
      document.getElementById('addUserForm').reset();
      await loadTeamRoster();
    } catch (err) {
      showToast(err.message || 'Failed to add user', 'error');
    }
  });

  // Statement Preset
  document.getElementById('stmtPeriodPreset')?.addEventListener('change', (e) => {
    const customDiv = document.getElementById('stmtCustomDates');
    if (e.target.value === 'custom') {
      customDiv.style.display = 'flex';
    } else {
      customDiv.style.display = 'none';
      generateStatement(e.target.value);
    }
  });

  document.getElementById('generateStmtBtn')?.addEventListener('click', () => {
    const preset = document.getElementById('stmtPeriodPreset').value;
    generateStatement(preset);
  });

  document.getElementById('printStatementBtn')?.addEventListener('click', () => {
    window.print();
  });

  document.getElementById('exportStatementCsvBtn')?.addEventListener('click', exportStatementCSV);

  // Search Audit Logs
  document.getElementById('auditSearchInput')?.addEventListener('input', (e) => {
    filterAuditLogs(e.target.value);
  });

  // Company Profile Form
  document.getElementById('adminProfileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const company_name = document.getElementById('settingCompanyName').value.trim();
    const tax_id = document.getElementById('settingTaxId').value.trim();
    const financial_year = document.getElementById('settingFY').value.trim();
    const active = getActiveUser();

    try {
      const res = await fetch(`${API_BASE}/api/business-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Name': active.name },
        body: JSON.stringify({ company_name, tax_id, financial_year, operator_user: active.name })
      });
      if (res.ok) {
        showToast('Company profile settings saved.', 'success');
        await loadGlobalBusinessProfile();
      }
    } catch (err) {
      showToast('Error saving profile', 'error');
    }
  });

  // Sample Data & Reset Buttons
  document.getElementById('seedDataBtn')?.addEventListener('click', async () => {
    if (confirm('Reload demo transactions into SQLite?')) {
      await fetch(`${API_BASE}/api/sample-data`, { method: 'POST' });
      showToast('Sample dataset reloaded', 'success');
      await refreshAdminDashboard();
    }
  });

  document.getElementById('resetDataBtn')?.addEventListener('click', async () => {
    if (confirm('Archive all active records to trash?')) {
      await fetch(`${API_BASE}/api/reset`, { method: 'POST' });
      showToast('All active records archived to trash', 'info');
      await refreshAdminDashboard();
    }
  });
}

// ------------------------------------------------------------------------------
// KPIs
// ------------------------------------------------------------------------------
async function loadAdminKPIs() {
  const txs = await fetchTransactions();
  let rev = 0;
  let exp = 0;
  let revCount = 0;
  let expCount = 0;

  txs.forEach((t) => {
    if (t.type === 'income') {
      rev += Number(t.amount);
      revCount++;
    } else {
      exp += Number(t.amount);
      expCount++;
    }
  });

  const net = rev - exp;
  const margin = rev > 0 ? Math.round((net / rev) * 100) : 0;

  document.getElementById('kpiRevenue').textContent = formatCurrency(rev);
  document.getElementById('kpiExpense').textContent = formatCurrency(exp);
  document.getElementById('kpiNetProfit').textContent = formatCurrency(net);
  document.getElementById('kpiIncomeCount').textContent = `${revCount} revenue transactions`;
  document.getElementById('kpiExpenseCount').textContent = `${expCount} expense records`;
  document.getElementById('kpiMargin').textContent = `Operating Margin: ${margin}%`;
}

// ------------------------------------------------------------------------------
// Policy Center
// ------------------------------------------------------------------------------
async function loadSecurityPolicy() {
  currentPolicy = await fetchPolicy();
  applyPolicyToUI(currentPolicy.immutable_policy_enabled);
}

function applyPolicyToUI(isEnabled) {
  const heroCard = document.getElementById('policyHeroCard');
  const badge = document.getElementById('policyStatusBadge');
  const icon = document.getElementById('policyShieldIcon');
  const toggleBtnText = document.getElementById('policyToggleBtnText');
  const kpiText = document.getElementById('kpiPolicyText');
  const kpiSub = document.getElementById('kpiPolicySub');
  const kpiIcon = document.getElementById('kpiPolicyIcon');
  const emptyTrashBtn = document.getElementById('emptyTrashBtn');

  if (isEnabled) {
    heroCard.className = 'policy-card-hero locked';
    badge.textContent = 'ACTIVE (STRICT IMMUTABILITY)';
    badge.style.color = '#059669';
    icon.innerHTML = '<i class="fa-solid fa-lock"></i>';
    toggleBtnText.textContent = 'Disable Immutable Policy (Allow Purge)';
    kpiText.textContent = 'IMMUTABLE';
    kpiText.style.color = '#059669';
    kpiSub.textContent = 'Soft-Deletes Enforced';
    kpiIcon.innerHTML = '<i class="fa-solid fa-lock" style="color: #059669;"></i>';
    if (emptyTrashBtn) emptyTrashBtn.style.display = 'none';
  } else {
    heroCard.className = 'policy-card-hero unlocked';
    badge.textContent = 'DISABLED (PURGE PERMITTED)';
    badge.style.color = '#d97706';
    icon.innerHTML = '<i class="fa-solid fa-unlock-keyhole"></i>';
    toggleBtnText.textContent = 'Enable Immutable Policy (Strict Audit)';
    kpiText.textContent = 'PURGE ENABLED';
    kpiText.style.color = '#d97706';
    kpiSub.textContent = 'Permanent Deletion Permitted';
    kpiIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color: #d97706;"></i>';
    if (emptyTrashBtn) emptyTrashBtn.style.display = 'inline-flex';
  }
}

// ------------------------------------------------------------------------------
// Archived Trash Ledger
// ------------------------------------------------------------------------------
async function loadArchivedTransactions() {
  const tbody = document.getElementById('archivedTableBody');
  if (!tbody) return;

  try {
    const res = await fetch(`${API_BASE}/api/admin/deleted`);
    const json = await res.json();
    currentArchivedTxs = json.data || [];

    if (currentArchivedTxs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 3rem; color: var(--text-muted);">
            <i class="fa-solid fa-box-open" style="font-size: 2rem; margin-bottom: 0.75rem; display: block; opacity: 0.5;"></i>
            No archived or soft-deleted transactions found.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = currentArchivedTxs.map(t => {
      const isIncome = t.type === 'income';
      const initials = getInitials(t.user_name || 'Staff');
      const avatarColor = t.avatar_color || '#8b5cf6';
      const isPolicyLocked = currentPolicy.immutable_policy_enabled;

      return `
        <tr>
          <td>
            <div style="font-weight: 600; color: var(--text-primary);">${escapeHtml(t.description)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(t.category)}</div>
          </td>
          <td>
            <div class="user-tag">
              <span class="user-mini-avatar" style="background-color: ${avatarColor};">${initials}</span>
              <span>${escapeHtml(t.user_name || 'Elena Rostova')}</span>
            </div>
          </td>
          <td>
            <span class="dept-pill">${escapeHtml(t.department || 'Management')}</span>
          </td>
          <td>
            <span class="badge-amount ${isIncome ? 'income' : 'expense'}">
              ${isIncome ? '+' : '-'}${formatCurrency(t.amount)}
            </span>
          </td>
          <td style="font-size: 0.8rem; color: var(--text-muted);">
            ${t.deleted_at || 'Recently'}
          </td>
          <td>
            <span style="font-size: 0.75rem; color: var(--text-secondary); background: var(--bg-card-subtle); padding: 0.2rem 0.5rem; border-radius: 4px;">
              ${escapeHtml(t.deleted_reason || 'Deleted by user')}
            </span>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn btn-secondary btn-sm" onclick="handleRestore('${t.id}')" title="Restore back to active ledger">
              <i class="fa-solid fa-rotate-left"></i> Restore
            </button>
            ${!isPolicyLocked ? `
              <button class="btn btn-danger-outline btn-sm" onclick="handlePurge('${t.id}')" title="Permanently delete from database">
                <i class="fa-solid fa-trash-can"></i> Purge
              </button>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--expense);">Error loading archive: ${e.message}</td></tr>`;
  }
}

async function handleRestore(txId) {
  const active = getActiveUser();
  try {
    const res = await fetch(`${API_BASE}/api/admin/restore/${txId}`, {
      method: 'POST',
      headers: { 'X-User-Name': active.name }
    });
    const json = await res.json();
    if (res.ok) {
      showToast(json.message, 'success');
      await loadArchivedTransactions();
      await loadAdminKPIs();
      await loadMasterAuditLogs();
    }
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function handlePurge(txId) {
  if (!confirm('Are you sure you want to permanently delete this record from the database?')) return;
  try {
    const res = await permanentPurgeTransaction(txId);
    showToast(res.message, 'success');
    await loadArchivedTransactions();
    await loadMasterAuditLogs();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ------------------------------------------------------------------------------
// Team Roster
// ------------------------------------------------------------------------------
async function loadTeamRoster() {
  const tbody = document.getElementById('teamTableBody');
  if (!tbody) return;

  try {
    const [usersRes, analyticsRes] = await Promise.all([
      fetch(`${API_BASE}/api/users`),
      fetch(`${API_BASE}/api/admin/team-analytics`)
    ]);

    const usersJson = await usersRes.json();
    const analyticsJson = await analyticsRes.json();

    const users = usersJson.data || [];
    const spendingMap = {};

    if (analyticsJson.data && analyticsJson.data.by_user) {
      analyticsJson.data.by_user.forEach(u => {
        spendingMap[u.user_id] = u;
      });
    }

    currentRoster = users;

    tbody.innerHTML = users.map(u => {
      const stats = spendingMap[u.id] || { tx_count: 0, total_spent: 0 };
      const initials = getInitials(u.name);

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span class="avatar-badge-lg" style="background-color: ${u.avatar_color || '#6366f1'};">${initials}</span>
              <div>
                <div style="font-weight: 700; color: var(--text-primary);">${escapeHtml(u.name)}</div>
                <div style="font-size: 0.725rem; color: var(--text-muted);">ID: ${escapeHtml(u.id)}</div>
              </div>
            </div>
          </td>
          <td style="color: var(--text-secondary);">${escapeHtml(u.email || 'N/A')}</td>
          <td><span style="font-weight: 600;">${escapeHtml(u.role)}</span></td>
          <td><span class="dept-pill">${escapeHtml(u.department)}</span></td>
          <td>${stats.tx_count} transactions</td>
          <td style="font-weight: 700; font-family: var(--font-heading); color: var(--expense);">
            ${formatCurrency(stats.total_spent)}
          </td>
          <td>
            <span style="display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; font-weight: 700; color: #10b981;">
              <span style="width: 6px; height: 6px; border-radius: 50%; background-color: #10b981;"></span> Active
            </span>
          </td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--expense);">Error loading team roster</td></tr>`;
  }
}

// ------------------------------------------------------------------------------
// Statement Generator
// ------------------------------------------------------------------------------
async function generateStatement(preset) {
  let startDate = '';
  let endDate = '';
  const now = new Date();

  if (preset === 'this-month') {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    startDate = `${year}-${month}-01`;
    endDate = new Date(year, now.getMonth() + 1, 0).toISOString().split('T')[0];
    document.getElementById('stmtDocPeriod').textContent = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  } else if (preset === 'last-month') {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = lastMonth.getFullYear();
    const month = String(lastMonth.getMonth() + 1).padStart(2, '0');
    startDate = `${year}-${month}-01`;
    endDate = new Date(year, lastMonth.getMonth() + 1, 0).toISOString().split('T')[0];
    document.getElementById('stmtDocPeriod').textContent = lastMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  } else if (preset === 'this-quarter') {
    const qMonth = Math.floor(now.getMonth() / 3) * 3;
    startDate = new Date(now.getFullYear(), qMonth, 1).toISOString().split('T')[0];
    endDate = new Date(now.getFullYear(), qMonth + 3, 0).toISOString().split('T')[0];
    document.getElementById('stmtDocPeriod').textContent = `Q${Math.floor(now.getMonth() / 3) + 1} (${startDate} to ${endDate})`;
  } else if (preset === 'custom') {
    startDate = document.getElementById('stmtStartDate').value;
    endDate = document.getElementById('stmtEndDate').value;
    document.getElementById('stmtDocPeriod').textContent = `${startDate || 'Start'} to ${endDate || 'Present'}`;
  } else {
    document.getElementById('stmtDocPeriod').textContent = 'All-Time Financial History';
  }

  document.getElementById('stmtDocGeneratedAt').textContent = `Generated: ${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  try {
    let url = `${API_BASE}/api/admin/statement`;
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if ([...params.keys()].length > 0) url += `?${params.toString()}`;

    const res = await fetch(url);
    const json = await res.json();
    if (json.status === 'success') {
      const data = json.data;
      currentStatementData = data;

      document.getElementById('stmtSheetRevenue').textContent = formatCurrency(data.summary.total_revenue);
      document.getElementById('stmtSheetExpense').textContent = formatCurrency(data.summary.total_expense);
      document.getElementById('stmtSheetNetProfit').textContent = formatCurrency(data.summary.net_profit);
      document.getElementById('stmtSheetMargin').textContent = `${data.summary.profit_margin_percent}%`;

      const revBox = document.getElementById('stmtRevenueRows');
      const expBox = document.getElementById('stmtExpenseRows');

      const revEntries = Object.entries(data.revenue_breakdown || {});
      revBox.innerHTML = revEntries.length > 0
        ? revEntries.map(([cat, amt]) => `
          <div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid #f1f5f9; font-size: 0.85rem;">
            <span>${escapeHtml(cat)}</span>
            <strong style="color: #059669;">${formatCurrency(amt)}</strong>
          </div>
        `).join('')
        : '<p style="color: #64748b; font-size: 0.85rem;">No revenue recorded</p>';

      const expEntries = Object.entries(data.expense_breakdown || {});
      expBox.innerHTML = expEntries.length > 0
        ? expEntries.map(([cat, amt]) => `
          <div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid #f1f5f9; font-size: 0.85rem;">
            <span>${escapeHtml(cat)}</span>
            <strong style="color: #e11d48;">${formatCurrency(amt)}</strong>
          </div>
        `).join('')
        : '<p style="color: #64748b; font-size: 0.85rem;">No expenses recorded</p>';
    }
  } catch (e) {
    console.warn('Statement generate error:', e);
  }
}

function exportStatementCSV() {
  if (!currentStatementData || !currentStatementData.transactions) {
    showToast('No statement data to export', 'error');
    return;
  }

  const txs = currentStatementData.transactions;
  const headers = ['Transaction ID', 'Date', 'Description', 'Type', 'Category', 'User', 'Department', 'Amount (INR)'];
  const rows = txs.map(t => [
    `"${t.id}"`,
    `"${t.date}"`,
    `"${t.description.replace(/"/g, '""')}"`,
    `"${t.type}"`,
    `"${t.category}"`,
    `"${t.user_name || 'Staff'}"`,
    `"${t.department || 'General'}"`,
    t.amount
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Financial_Statement_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ------------------------------------------------------------------------------
// Master Audit Ledger
// ------------------------------------------------------------------------------
async function loadMasterAuditLogs() {
  const tbody = document.getElementById('auditTableBody');
  if (!tbody) return;

  try {
    const res = await fetch(`${API_BASE}/api/admin/audit-logs`);
    const json = await res.json();
    currentAuditLogs = json.data || [];
    renderAuditLogs(currentAuditLogs);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--expense);">Error loading audit ledger</td></tr>`;
  }
}

function renderAuditLogs(logs) {
  const tbody = document.getElementById('auditTableBody');
  if (!tbody) return;

  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">No audit logs recorded.</td></tr>`;
    return;
  }

  tbody.innerHTML = logs.map(l => {
    let actionBadgeColor = 'var(--primary)';
    if (l.action === 'CREATE') actionBadgeColor = '#059669';
    else if (l.action === 'DELETE') actionBadgeColor = '#e11d48';
    else if (l.action === 'RESTORE') actionBadgeColor = '#8b5cf6';
    else if (l.action === 'PERMANENT_PURGE' || l.action === 'PERMANENT_PURGE_ALL') actionBadgeColor = '#dc2626';
    else if (l.action === 'POLICY_TOGGLE') actionBadgeColor = '#f59e0b';

    return `
      <tr>
        <td style="font-size: 0.78rem; color: var(--text-muted); font-family: var(--font-mono, monospace);">${l.timestamp}</td>
        <td>
          <span style="font-size: 0.7rem; font-weight: 800; padding: 0.2rem 0.5rem; border-radius: 4px; background: rgba(0,0,0,0.05); color: ${actionBadgeColor}; border: 1px solid ${actionBadgeColor};">
            ${escapeHtml(l.action)}
          </span>
        </td>
        <td style="font-weight: 600; font-size: 0.825rem;">${escapeHtml(l.user_name || 'Executive Admin')}</td>
        <td style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(l.transaction_id || 'System')}</td>
        <td style="font-size: 0.8rem; color: var(--text-secondary); max-width: 400px; word-break: break-word;">
          ${escapeHtml(JSON.stringify(l.details))}
        </td>
      </tr>
    `;
  }).join('');
}

function filterAuditLogs(query) {
  if (!query) {
    renderAuditLogs(currentAuditLogs);
    return;
  }
  const q = query.toLowerCase();
  const filtered = currentAuditLogs.filter(l =>
    l.action.toLowerCase().includes(q) ||
    (l.user_name && l.user_name.toLowerCase().includes(q)) ||
    (l.transaction_id && l.transaction_id.toLowerCase().includes(q)) ||
    JSON.stringify(l.details).toLowerCase().includes(q)
  );
  renderAuditLogs(filtered);
}
