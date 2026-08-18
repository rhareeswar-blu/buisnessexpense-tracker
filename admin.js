/**
 * ==============================================================================
 * Admin Portal Controller — Financial Statement Generator & Audit Ledger
 * ==============================================================================
 */

const API_BASE = window.location.origin.includes('5000') ? '' : 'http://localhost:5000';

let allAuditLogs = [];
let currentStatementData = null;

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  setupNavigation();
  setupEventListeners();

  await loadBusinessProfile();
  await loadKPIs();
  await generateFinancialStatement('this-month');
  await loadAuditLedger();
  await loadDeletedArchive();
});

// ------------------------------------------------------------------------------
// Theme Setup
// ------------------------------------------------------------------------------
function initTheme() {
  const saved = localStorage.getItem('rupeewise_theme_v1') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || 'light';
  const next = cur === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('rupeewise_theme_v1', next);
}

// ------------------------------------------------------------------------------
// Navigation Tabs
// ------------------------------------------------------------------------------
function setupNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  const panels = document.querySelectorAll('.admin-view-panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      panels.forEach((p) => (p.style.display = 'none'));

      tab.classList.add('active');
      const viewId = tab.getAttribute('data-view');
      const targetPanel = document.getElementById(viewId);
      if (targetPanel) targetPanel.style.display = 'flex';
    });
  });
}

// ------------------------------------------------------------------------------
// Business Profile & KPIs
// ------------------------------------------------------------------------------
async function loadBusinessProfile() {
  try {
    const res = await fetch(`${API_BASE}/api/business-profile`);
    const json = await res.json();
    if (json.status === 'success') {
      const p = json.data;
      document.getElementById('headerCompanyName').textContent = p.company_name;
      document.getElementById('stmtCompanyName').textContent = p.company_name;
      document.getElementById('stmtCompanyTaxId').textContent = `${p.tax_id || 'Tax ID: Registered'} • FY: ${p.financial_year || '2026-2027'}`;
      document.getElementById('settingCompanyName').value = p.company_name;
      document.getElementById('settingTaxId').value = p.tax_id || '';
    }
  } catch (e) {
    console.warn('Backend not available, using default profile');
  }
}

async function loadKPIs() {
  try {
    const res = await fetch(`${API_BASE}/api/transactions`);
    const json = await res.json();
    if (json.status === 'success') {
      const txs = json.data;
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

      document.getElementById('kpiRevenue').textContent = formatINR(rev);
      document.getElementById('kpiExpense').textContent = formatINR(exp);
      document.getElementById('kpiNetProfit').textContent = formatINR(net);
      document.getElementById('kpiIncomeCount').textContent = `${revCount} revenue streams`;
      document.getElementById('kpiExpenseCount').textContent = `${expCount} expense records`;
      document.getElementById('kpiMargin').textContent = `Operating Margin: ${margin}%`;
    }
  } catch (e) {
    console.warn('KPI load error:', e);
  }
}

// ------------------------------------------------------------------------------
// Statement Generator
// ------------------------------------------------------------------------------
async function generateFinancialStatement(preset) {
  let startDate = '';
  let endDate = '';
  const now = new Date();

  if (preset === 'this-month') {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    startDate = `${year}-${month}-01`;
    endDate = new Date(year, now.getMonth() + 1, 0).toISOString().split('T')[0];
    document.getElementById('stmtPeriodText').textContent = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  } else if (preset === 'last-month') {
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = lastMonthDate.getFullYear();
    const month = String(lastMonthDate.getMonth() + 1).padStart(2, '0');
    startDate = `${year}-${month}-01`;
    endDate = new Date(year, lastMonthDate.getMonth() + 1, 0).toISOString().split('T')[0];
    document.getElementById('stmtPeriodText').textContent = lastMonthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  } else if (preset === 'this-quarter') {
    const qMonth = Math.floor(now.getMonth() / 3) * 3;
    startDate = new Date(now.getFullYear(), qMonth, 1).toISOString().split('T')[0];
    endDate = new Date(now.getFullYear(), qMonth + 3, 0).toISOString().split('T')[0];
    document.getElementById('stmtPeriodText').textContent = `Q${Math.floor(now.getMonth() / 3) + 1} (${startDate} to ${endDate})`;
  } else if (preset === 'custom') {
    startDate = document.getElementById('stmtStartDate').value;
    endDate = document.getElementById('stmtEndDate').value;
    document.getElementById('stmtPeriodText').textContent = `${startDate || 'Start'} to ${endDate || 'Present'}`;
  } else {
    document.getElementById('stmtPeriodText').textContent = 'All-Time Financial History';
  }

  document.getElementById('stmtGeneratedDate').textContent = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  try {
    let url = `${API_BASE}/api/admin/statement`;
    const params = [];
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);
    if (params.length) url += `?${params.join('&')}`;

    const res = await fetch(url);
    const json = await res.json();
    if (json.status === 'success') {
      currentStatementData = json.data;
      renderStatementDocument(json.data);
    }
  } catch (e) {
    showAdminToast('Failed to fetch statement from server.', 'error');
  }
}

function renderStatementDocument(stmt) {
  const sum = stmt.summary;

  document.getElementById('stmtGrossRevenue').textContent = formatINR(sum.total_revenue);
  document.getElementById('stmtTotalExpenses').textContent = formatINR(sum.total_expense);
  document.getElementById('stmtNetProfit').textContent = formatINR(sum.net_profit);
  document.getElementById('stmtProfitMargin').textContent = `${sum.profit_margin_percent}%`;

  // Render Revenue Rows
  const revTbody = document.getElementById('stmtRevenueRows');
  revTbody.innerHTML = '';
  const revEntries = Object.entries(stmt.revenue_breakdown);
  if (revEntries.length === 0) {
    revTbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:#94a3b8;">No revenue recorded</td></tr>';
  } else {
    revEntries.forEach(([cat, amt]) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><strong>${escapeHtml(cat)}</strong></td><td class="text-right">${formatINR(amt)}</td>`;
      revTbody.appendChild(tr);
    });
  }

  // Render Expense Rows
  const expTbody = document.getElementById('stmtExpenseRows');
  expTbody.innerHTML = '';
  const expEntries = Object.entries(stmt.expense_breakdown);
  if (expEntries.length === 0) {
    expTbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:#94a3b8;">No expenses recorded</td></tr>';
  } else {
    expEntries.forEach(([cat, amt]) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><strong>${escapeHtml(cat)}</strong></td><td class="text-right">${formatINR(amt)}</td>`;
      expTbody.appendChild(tr);
    });
  }

  // Render Full Ledger
  const ledgerTbody = document.getElementById('stmtLedgerRows');
  ledgerTbody.innerHTML = '';
  if (stmt.transactions.length === 0) {
    ledgerTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">No transactions found in period</td></tr>';
  } else {
    stmt.transactions.forEach((tx) => {
      const tr = document.createElement('tr');
      const isInc = tx.type === 'income';
      tr.innerHTML = `
        <td>${escapeHtml(tx.date)}</td>
        <td><strong>${escapeHtml(tx.description)}</strong></td>
        <td>${escapeHtml(tx.category)}</td>
        <td><span class="badge-action ${isInc ? 'CREATE' : 'DELETE'}">${tx.type.toUpperCase()}</span></td>
        <td class="text-right" style="color: ${isInc ? '#059669' : '#dc2626'}; font-weight:700;">
          ${isInc ? '+' : '-'}${formatINR(tx.amount)}
        </td>
      `;
      ledgerTbody.appendChild(tr);
    });
  }
}

// ------------------------------------------------------------------------------
// Audit & Change Ledger
// ------------------------------------------------------------------------------
async function loadAuditLedger() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/audit-logs`);
    const json = await res.json();
    if (json.status === 'success') {
      allAuditLogs = json.data;
      document.getElementById('kpiAuditCount').textContent = `${allAuditLogs.length} Logs`;
      renderAuditTable('ALL');
    }
  } catch (e) {
    console.warn('Audit ledger fetch error:', e);
  }
}

function renderAuditTable(filterAction) {
  const tbody = document.getElementById('auditLedgerTableBody');
  tbody.innerHTML = '';

  const logs = filterAction === 'ALL'
    ? allAuditLogs
    : allAuditLogs.filter((l) => l.action === filterAction);

  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem; color:#94a3b8;">No audit records found</td></tr>';
    return;
  }

  logs.forEach((l) => {
    const tr = document.createElement('tr');
    const d = l.details || {};
    const desc = d.description || (l.action === 'RESET' ? 'Full Data Reset' : 'System Action');
    const cat = d.category || '—';
    const amt = d.amount ? formatINR(d.amount) : '—';

    tr.innerHTML = `
      <td style="white-space:nowrap; font-size:0.8rem; color:#94a3b8;">${escapeHtml(l.timestamp || '')}</td>
      <td><span class="badge-action ${l.action}">${escapeHtml(l.action)}</span></td>
      <td style="font-family:monospace; font-size:0.75rem; color:#64748b;">${escapeHtml(l.transaction_id || 'SYSTEM')}</td>
      <td><strong>${escapeHtml(desc)}</strong></td>
      <td>${escapeHtml(cat)}</td>
      <td class="text-right" style="font-weight:700;">${amt}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ------------------------------------------------------------------------------
// Archived / Deleted Transactions
// ------------------------------------------------------------------------------
async function loadDeletedArchive() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/deleted`);
    const json = await res.json();
    if (json.status === 'success') {
      const deletedTxs = json.data;
      document.getElementById('kpiDeletedCount').textContent = `${deletedTxs.length} archived items`;
      renderDeletedTable(deletedTxs);
    }
  } catch (e) {
    console.warn('Deleted archive fetch error:', e);
  }
}

function renderDeletedTable(txs) {
  const tbody = document.getElementById('deletedArchiveTableBody');
  tbody.innerHTML = '';

  if (txs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2.5rem; color:#94a3b8;">No deleted transactions. All records are active.</td></tr>';
    return;
  }

  txs.forEach((t) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:#ef4444; font-weight:600; font-size:0.8rem;">${escapeHtml(t.deleted_at || 'Recently')}</td>
      <td>${escapeHtml(t.date)}</td>
      <td><strong>${escapeHtml(t.description)}</strong></td>
      <td>${escapeHtml(t.category)}</td>
      <td><span class="badge-action ${t.type === 'income' ? 'CREATE' : 'DELETE'}">${t.type.toUpperCase()}</span></td>
      <td class="text-right" style="font-weight:700;">${formatINR(t.amount)}</td>
      <td class="text-center">
        <button class="btn-restore-table" data-id="${t.id}">
          <i class="fa-solid fa-rotate-left"></i> Restore
        </button>
      </td>
    `;

    tr.querySelector('.btn-restore-table').addEventListener('click', async () => {
      await restoreTransaction(t.id, t.description);
    });

    tbody.appendChild(tr);
  });
}

async function restoreTransaction(id, name) {
  try {
    const res = await fetch(`${API_BASE}/api/admin/restore/${id}`, { method: 'POST' });
    if (res.ok) {
      showAdminToast(`Successfully restored "${name}" to active records.`, 'success');
      await loadKPIs();
      await loadDeletedArchive();
      await loadAuditLedger();
      await generateFinancialStatement('this-month');
    }
  } catch (e) {
    showAdminToast('Failed to restore transaction.', 'error');
  }
}

// ------------------------------------------------------------------------------
// Export CSV Statement
// ------------------------------------------------------------------------------
function exportStatementCSV() {
  if (!currentStatementData || !currentStatementData.transactions.length) {
    showAdminToast('No statement data to export.', 'info');
    return;
  }

  const txs = currentStatementData.transactions;
  const headers = ['Transaction ID', 'Date', 'Type', 'Category', 'Description', 'Amount (INR)'];
  const rows = txs.map((t) => [
    `"${t.id}"`,
    `"${t.date}"`,
    `"${t.type.toUpperCase()}"`,
    `"${t.category}"`,
    `"${t.description.replace(/"/g, '""')}"`,
    t.amount
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csvContent));
  link.setAttribute('download', `Financial_Statement_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showAdminToast('Statement exported to CSV successfully.', 'success');
}

// ------------------------------------------------------------------------------
// Toast & Helpers
// ------------------------------------------------------------------------------
function showAdminToast(msg, type = 'info') {
  const container = document.getElementById('adminToastContainer');
  const toast = document.createElement('div');
  toast.style.cssText = `
    padding: 0.85rem 1.25rem;
    background: #1e293b;
    color: #ffffff;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    border-left: 4px solid ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    font-size: 0.875rem;
    font-weight: 500;
  `;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

function formatINR(val) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(Number(val) || 0);
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ------------------------------------------------------------------------------
// Event Listeners
// ------------------------------------------------------------------------------
function setupEventListeners() {
  document.getElementById('adminThemeToggle').addEventListener('click', toggleTheme);

  document.getElementById('refreshAdminBtn').addEventListener('click', async () => {
    await loadKPIs();
    await loadAuditLedger();
    await loadDeletedArchive();
    await generateFinancialStatement(document.getElementById('periodPreset').value);
    showAdminToast('Admin data refreshed from SQLite database.', 'success');
  });

  const periodPreset = document.getElementById('periodPreset');
  const customFields = document.getElementById('customDateRange');

  periodPreset.addEventListener('change', () => {
    if (periodPreset.value === 'custom') {
      customFields.style.display = 'flex';
    } else {
      customFields.style.display = 'none';
      generateFinancialStatement(periodPreset.value);
    }
  });

  document.getElementById('generateStmtBtn').addEventListener('click', () => {
    generateFinancialStatement(periodPreset.value);
  });

  document.getElementById('printStmtBtn').addEventListener('click', () => {
    window.print();
  });

  document.getElementById('exportStmtCsvBtn').addEventListener('click', exportStatementCSV);

  // Audit filter pills
  document.querySelectorAll('.audit-filter-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.audit-filter-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      renderAuditTable(pill.getAttribute('data-action'));
    });
  });

  // Business profile form
  document.getElementById('businessProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const company_name = document.getElementById('settingCompanyName').value.trim();
    const tax_id = document.getElementById('settingTaxId').value.trim();

    try {
      const res = await fetch(`${API_BASE}/api/business-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name, tax_id })
      });
      if (res.ok) {
        showAdminToast('Business profile updated successfully.', 'success');
        await loadBusinessProfile();
      }
    } catch (err) {
      showAdminToast('Error updating business profile.', 'error');
    }
  });
}
