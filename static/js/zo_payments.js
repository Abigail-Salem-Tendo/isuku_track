/**
 * Zone Operator Payment Management
 * Handles: payment listing (table), approval/rejection,
 *          proof-of-payment image lightbox, and chart data.
 */

// ── State ─────────────────────────────────────────────────────────────────────
let allPayments = [];
let currentPaymentElement = null;   // The .pi card being acted on (list view)
let currentTablePaymentId = null;   // The payment ID being acted on (table view)

// ── Shared helpers ────────────────────────────────────────────────────────────
function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function statusBadge(status) {
  if (status === 'approved') return '<span class="b ok">Approved</span>';
  if (status === 'rejected') return '<span class="b op">Rejected</span>';
  return '<span class="b pe" style="font-size:.7rem;">Tap to review</span>';
}

function formatMethod(method) {
  const map = { mobile_money: 'Mobile Money', bank_transfer: 'Bank Transfer', cash: 'Cash' };
  return map[method] || method || '—';
}

function getMonthName(n) {
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][(n || 1) - 1] || '';
}

// ── Load & bootstrap ──────────────────────────────────────────────────────────
async function loadPayments() {
  try {
    await loadUserProfile();
    const payments = await API.get('/payments/');
    allPayments = Array.isArray(payments) ? payments : [];
    updateStatistics();
    renderPayments(allPayments);       // card list (existing)
    renderPaymentsTable(allPayments);  // NEW: full table
    initializeCharts();
  } catch (err) {
    console.error('Error loading payments:', err);
    const list = document.getElementById('paymentsList');
    if (list) list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--txt-l);">Failed to load payments.</div>';
    const tbody = document.getElementById('paymentsTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--txt-l);">Failed to load payments.</td></tr>';
  }
}

// ── User profile ──────────────────────────────────────────────────────────────
async function loadUserProfile() {
  try {
    let user = null;
    try { user = await API.get('/auth/me'); } catch (e1) {
      try { user = await API.get('/auth/profile'); } catch (e2) {}
    }
    const name = (user && (user.full_name || user.username)) || localStorage.getItem('userFullName') || 'Zone Operator';
    updateProfileUI(name);
  } catch (err) {
    updateProfileUI(localStorage.getItem('userFullName') || 'Zone Operator');
  }
}

function updateProfileUI(fullName) {
  const ini = (fullName || 'ZO').split(' ').map(n => n.charAt(0).toUpperCase()).join('').slice(0, 2);
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('sidebarProfileName', fullName);
  set('sidebarProfileAvatar', ini);
  set('sidebarProfileRole', 'Zone Operator');
  set('topbarProfileAvatar', ini);
  set('ddUserAvatar', ini);
  set('ddUserName', fullName);
  set('ddUserRole', 'Zone Operator');
  localStorage.setItem('userFullName', fullName);
  localStorage.setItem('userInitials', ini);
}

// ── Statistics cards ──────────────────────────────────────────────────────────
function updateStatistics() {
  const pending  = allPayments.filter(p => p.status === 'pending');
  const approved = allPayments.filter(p => p.status === 'approved');
  const totalAmt = approved.reduce((s, p) => s + (p.amount || 0), 0);
  const rate     = allPayments.length ? Math.round(approved.length / allPayments.length * 100) : 0;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('totalPayments',  allPayments.length);
  set('pendingPayments', pending.length);
  set('totalCollected', `RWF ${totalAmt.toLocaleString()}`);
  set('approvalRate', rate + '%');

  const badge = document.querySelector('.sb-badge.am');
  if (badge) { badge.textContent = pending.length; badge.style.display = pending.length > 0 ? 'inline' : 'none'; }
}

// ── Card list renderer (existing style, kept intact) ─────────────────────────
function renderPayments(payments) {
  const list  = document.getElementById('paymentsList');
  const badge = document.getElementById('pendingBadge');
  if (!list) return;

  if (!payments || payments.length === 0) {
    list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--txt-l);">No payments found.</div>';
    if (badge) { badge.textContent = '0 pending'; badge.className = 'b ok'; }
    return;
  }

  const pendingN = payments.filter(p => p.status === 'pending').length;
  if (badge) {
    badge.textContent = pendingN + ' pending';
    badge.className   = pendingN > 0 ? 'b pe' : 'b ok';
    badge.style.fontSize = '.73rem';
  }

  list.innerHTML = payments.map(p => {
    const name       = p.resident_name || 'Resident';
    const monthLabel = getMonthName(p.payment_month) + ' ' + p.payment_year;
    const ago        = p.submitted_at ? timeAgo(p.submitted_at) : '';
    const amt        = `${parseInt(p.amount || 0).toLocaleString()} ${p.currency || 'RWF'}`;

    return `
      <div class="pi" onclick="viewPaymentDetails(this)" style="cursor:pointer;"
        data-name="${name}"
        data-amount="${amt}"
        data-month="${monthLabel}"
        data-date="${ago}"
        data-status="${p.status}"
        data-payment-id="${p.id}"
        data-method="${p.payment_method || ''}"
        data-txn="${p.transaction_reference || ''}"
        data-proof="${p.proof_url || ''}"
        data-rejection="${p.rejection_reason || ''}">
        <div class="pi-av">${initials(name)}</div>
        <div>
          <div class="pi-name">${name}</div>
          <div class="pi-meta">Submitted ${ago} · ${monthLabel} · ${amt}</div>
        </div>
        <div class="pi-amt">${amt}</div>
        ${statusBadge(p.status)}
      </div>`;
  }).join('');

  applyActiveFilter();
}

// ── TABLE renderer (NEW) ─────────────────────────────────────────────────────
function renderPaymentsTable(payments) {
  const tbody = document.getElementById('paymentsTableBody');
  if (!tbody) return;

  if (!payments || payments.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:32px;color:var(--txt-l);">
          No payments found.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = payments.map(p => {
    const name       = p.resident_name || 'Resident';
    const email      = p.resident_email ? `<div style="font-size:.75rem;color:var(--txt-l);">${p.resident_email}</div>` : '';
    const monthLabel = getMonthName(p.payment_month) + ' ' + p.payment_year;
    const dateStr    = p.submitted_at
      ? new Date(p.submitted_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'2-digit' })
      : '—';
    const amt        = `${parseInt(p.amount || 0).toLocaleString()} ${p.currency || 'RWF'}`;
    const method     = formatMethod(p.payment_method);
    const txn        = p.transaction_reference || '—';

    // Status badge
    const statusCls  = p.status === 'approved' ? 'tbl-badge ok' : p.status === 'rejected' ? 'tbl-badge rej' : 'tbl-badge pend';
    const statusLbl  = p.status.charAt(0).toUpperCase() + p.status.slice(1);

    // Proof thumbnail or placeholder
    const proofCell  = p.proof_url
      ? `<img src="${p.proof_url}" alt="proof"
            class="tbl-proof-thumb"
            onclick="openProofLightbox('${p.proof_url}', '${name}'); event.stopPropagation();"
            title="Click to view full image">`
      : `<span class="tbl-no-proof">No proof</span>`;

    // Action button
    const actionBtn  = p.status === 'pending'
      ? `<button class="tbl-btn-view" onclick="openTablePaymentModal(${p.id}); event.stopPropagation();">Review</button>`
      : `<button class="tbl-btn-view secondary" onclick="openTablePaymentModal(${p.id}); event.stopPropagation();">View</button>`;

    return `
      <tr class="tbl-row" onclick="openTablePaymentModal(${p.id})" data-id="${p.id}" data-status="${p.status}">
        <td>
          <div class="tbl-resident">
            <div class="tbl-av">${initials(name)}</div>
            <div>
              <div class="tbl-name">${name}</div>
              ${email}
            </div>
          </div>
        </td>
        <td class="tbl-amount">${amt}</td>
        <td><span class="${statusCls}">${statusLbl}</span></td>
        <td class="tbl-method">${method}</td>
        <td class="tbl-month">${monthLabel}</td>
        <td class="tbl-txn">${txn}</td>
        <td class="tbl-proof-cell">${proofCell}</td>
        <td class="tbl-actions">${actionBtn}</td>
      </tr>`;
  }).join('');

  applyTableFilter();
}

// ── Table filter (mirrors card filter) ───────────────────────────────────────
function applyTableFilter() {
  const activeBtn  = document.querySelector('.ftab.on');
  const filterType = (activeBtn?.textContent || 'all').toLowerCase();
  document.querySelectorAll('#paymentsTableBody tr[data-status]').forEach(row => {
    if (filterType === 'all' || row.dataset.status === filterType) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

// ── TABLE: Payment detail modal ───────────────────────────────────────────────
function openTablePaymentModal(paymentId) {
  const p = allPayments.find(x => x.id === paymentId);
  if (!p) return;
  currentTablePaymentId = paymentId;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const monthLabel = getMonthName(p.payment_month) + ' ' + p.payment_year;
  const dateStr    = p.submitted_at ? new Date(p.submitted_at).toLocaleString() : '—';

  set('tblDetailName',   p.resident_name  || '—');
  set('tblDetailEmail',  p.resident_email || '—');
  set('tblDetailPhone',  p.resident_phone || '—');
  set('tblDetailAmount', `${parseInt(p.amount || 0).toLocaleString()} ${p.currency || 'RWF'}`);
  set('tblDetailMonth',  monthLabel);
  set('tblDetailDate',   dateStr);
  set('tblDetailMethod', formatMethod(p.payment_method));
  set('tblDetailTxn',    p.transaction_reference || 'N/A');

  // Status badge
  const statusEl = document.getElementById('tblDetailStatus');
  if (statusEl) {
    statusEl.textContent = p.status.charAt(0).toUpperCase() + p.status.slice(1);
    statusEl.className   = `tbl-detail-status-badge ${p.status}`;
  }

  // Rejection reason
  const rejRow = document.getElementById('tblDetailRejRow');
  const rejEl  = document.getElementById('tblDetailRejReason');
  if (rejRow) rejRow.style.display = p.rejection_reason ? '' : 'none';
  if (rejEl && p.rejection_reason) rejEl.textContent = p.rejection_reason;

  // Proof image
  const proofImg    = document.getElementById('tblDetailProofImg');
  const noProofEl   = document.getElementById('tblDetailNoProof');
  const proofBtn    = document.getElementById('tblDetailProofBtn');
  if (p.proof_url) {
    if (proofImg)  { proofImg.src = p.proof_url; proofImg.style.display = 'block'; }
    if (noProofEl)   noProofEl.style.display = 'none';
    if (proofBtn)  { proofBtn.style.display = 'inline-flex'; proofBtn.onclick = () => openProofLightbox(p.proof_url, p.resident_name); }
  } else {
    if (proofImg)  proofImg.style.display = 'none';
    if (noProofEl) noProofEl.style.display = 'flex';
    if (proofBtn)  proofBtn.style.display = 'none';
  }

  // Action buttons
  const approveBtn = document.getElementById('tblDetailApproveBtn');
  const rejectBtn  = document.getElementById('tblDetailRejectBtn');
  const isPending  = p.status === 'pending';
  if (approveBtn) approveBtn.style.display = isPending ? 'inline-flex' : 'none';
  if (rejectBtn)  rejectBtn.style.display  = isPending ? 'inline-flex' : 'none';

  document.getElementById('tablePaymentModal').classList.add('show');
}

function closeTablePaymentModal() {
  document.getElementById('tablePaymentModal').classList.remove('show');
  currentTablePaymentId = null;
}

// ── Proof image lightbox ──────────────────────────────────────────────────────
function openProofLightbox(url, residentName) {
  const lb       = document.getElementById('proofLightbox');
  const lbImg    = document.getElementById('lbProofImg');
  const lbTitle  = document.getElementById('lbTitle');
  const lbLoader = document.getElementById('lbLoader');

  if (!lb || !lbImg) return;

  if (lbTitle)  lbTitle.textContent = `Payment Proof — ${residentName || 'Resident'}`;
  if (lbLoader) lbLoader.style.display = 'flex';
  lbImg.style.display = 'none';

  lbImg.onload = () => {
    if (lbLoader) lbLoader.style.display = 'none';
    lbImg.style.display = 'block';
  };
  lbImg.onerror = () => {
    if (lbLoader) lbLoader.style.display = 'none';
    lbImg.style.display = 'block';
    lbImg.alt = 'Image could not be loaded';
  };
  lbImg.src = url;
  lb.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeProofLightbox() {
  const lb = document.getElementById('proofLightbox');
  if (lb) lb.classList.remove('show');
  document.body.style.overflow = '';
}

// ── Approve from table modal ──────────────────────────────────────────────────
async function approveFromTableModal() {
  if (!currentTablePaymentId) return;
  const btn = document.getElementById('tblDetailApproveBtn');
  if (btn) { btn.textContent = 'Approving…'; btn.disabled = true; }

  try {
    await API.put(`/payments/${currentTablePaymentId}/approve`, {});
    const p = allPayments.find(x => x.id === currentTablePaymentId);
    if (p) p.status = 'approved';
    if (typeof showToast === 'function') showToast('Payment approved successfully!', 0);
    closeTablePaymentModal();
    renderPaymentsTable(allPayments);
    renderPayments(allPayments);
    updateStatistics();
    initializeCharts();
  } catch (err) {
    alert(err.message || 'Failed to approve payment.');
  } finally {
    if (btn) { btn.textContent = '✓ Approve'; btn.disabled = false; }
  }
}

// ── Reject from table modal ───────────────────────────────────────────────────
function openRejectFromTableModal() {
  const modal = document.getElementById('rejectModal');
  if (!modal) return;
  document.getElementById('rejectReason').value = '';
  document.getElementById('rejectDetails').value = '';
  closeTablePaymentModal();
  // Temporarily bind to table flow
  modal._fromTable = true;
  modal.style.display = 'flex';
}

// ── Existing card-list modal ──────────────────────────────────────────────────
function viewPaymentDetails(el) {
  currentPaymentElement = el;

  document.getElementById('payDetailName').textContent   = el.dataset.name   || '—';
  document.getElementById('payDetailAmount').textContent = el.dataset.amount || '—';
  document.getElementById('payDetailDate').textContent   =
    el.dataset.month ? el.dataset.month + ' · ' + el.dataset.date : el.dataset.date || '—';

  const methodMap = { mobile_money: 'Mobile Money', bank_transfer: 'Bank Transfer', cash: 'Cash' };
  document.getElementById('payDetailMethod').textContent = methodMap[el.dataset.method] || el.dataset.method || '—';
  document.getElementById('payDetailTxn').textContent    = el.dataset.txn || 'N/A';

  const proof    = el.dataset.proof;
  const proofImg = document.getElementById('payDetailProof');
  const noProof  = document.getElementById('noProofText');
  if (proof) {
    proofImg.src          = proof;
    proofImg.style.display = 'block';
    noProof.style.display  = 'none';
    // Make thumbnail clickable to open lightbox
    proofImg.style.cursor  = 'zoom-in';
    proofImg.onclick       = () => openProofLightbox(proof, el.dataset.name);
  } else {
    proofImg.style.display = 'none';
    noProof.style.display  = 'block';
    proofImg.onclick       = null;
  }

  const isPending = el.dataset.status === 'pending';
  document.getElementById('payDetailApproveBtn').style.display = isPending ? 'inline-block' : 'none';
  document.getElementById('payDetailRejectBtn').style.display  = isPending ? 'inline-block' : 'none';

  document.getElementById('paymentDetailsModal').classList.add('show');
}

function closePaymentDetailsModal() {
  document.getElementById('paymentDetailsModal').classList.remove('show');
  currentPaymentElement = null;
}

// ── Approve from card modal ───────────────────────────────────────────────────
async function approveFromPayDetails() {
  if (!currentPaymentElement) return;
  const paymentId = currentPaymentElement.dataset.paymentId;
  const name      = currentPaymentElement.dataset.name || 'Resident';
  const btn       = document.getElementById('payDetailApproveBtn');
  btn.textContent = 'Approving…'; btn.disabled = true;

  try {
    await API.put(`/payments/${paymentId}/approve`, {});
    // Update local state
    const p = allPayments.find(x => x.id === parseInt(paymentId));
    if (p) p.status = 'approved';
    currentPaymentElement.dataset.status = 'approved';
    const badge = currentPaymentElement.querySelector('.b');
    if (badge) { badge.className = 'b ok'; badge.textContent = 'Approved'; }
    if (typeof showToast === 'function') showToast(`Payment from ${name} approved!`, 0);
    closePaymentDetailsModal();
    applyActiveFilter();
    renderPaymentsTable(allPayments);
    updateStatistics();
    initializeCharts();
  } catch (err) {
    alert(err.message || 'Failed to approve payment.');
  } finally {
    btn.textContent = 'Approve'; btn.disabled = false;
  }
}

// ── Reject modal shared ───────────────────────────────────────────────────────
function openRejectFromPayDetails() {
  if (!currentPaymentElement) return;
  const el = currentPaymentElement;
  closePaymentDetailsModal();
  openRejectModal(el);
}

function openRejectModal(el) {
  const modal = document.getElementById('rejectModal');
  modal.style.display = 'flex';
  modal._fromTable = false;
  currentPaymentElement = el;
  document.getElementById('rejectReason').value  = '';
  document.getElementById('rejectDetails').value = '';
}

function closeRejectModal() {
  document.getElementById('rejectModal').style.display = 'none';
  document.getElementById('rejectReason').value  = '';
  document.getElementById('rejectDetails').value = '';
}

async function confirmReject() {
  const reason  = document.getElementById('rejectReason').value.trim();
  const details = document.getElementById('rejectDetails').value.trim();

  if (!reason) { alert('Please select a rejection reason.'); return; }

  let reasonText = reason === 'other'
    ? (details || 'Other')
    : (document.querySelector(`#rejectReason option[value="${reason}"]`)?.textContent || reason);

  const btn = document.querySelector('#rejectModal .modal-btn:last-child');
  btn.textContent = 'Rejecting…'; btn.disabled = true;

  // Determine which payment is being rejected
  const modal     = document.getElementById('rejectModal');
  const fromTable = modal._fromTable;
  const paymentId = fromTable ? currentTablePaymentId : currentPaymentElement?.dataset.paymentId;
  const name      = fromTable
    ? (allPayments.find(x => x.id === currentTablePaymentId)?.resident_name || 'Resident')
    : (currentPaymentElement?.dataset.name || 'Resident');

  try {
    await API.put(`/payments/${paymentId}/reject`, { rejection_reason: reasonText });
    const p = allPayments.find(x => x.id === parseInt(paymentId));
    if (p) { p.status = 'rejected'; p.rejection_reason = reasonText; }

    if (!fromTable && currentPaymentElement) {
      currentPaymentElement.dataset.status = 'rejected';
      const badge = currentPaymentElement.querySelector('.b');
      if (badge) { badge.className = 'b op'; badge.textContent = 'Rejected'; }
    }

    if (typeof showToast === 'function') showToast(`Payment from ${name} rejected.`, 0);
    closeRejectModal();
    applyActiveFilter();
    renderPaymentsTable(allPayments);
    updateStatistics();
    initializeCharts();
  } catch (err) {
    alert(err.message || 'Failed to reject payment.');
  } finally {
    btn.textContent = 'Confirm Rejection'; btn.disabled = false;
  }
}

// ── Filter tabs (cards + table together) ────────────────────────────────────
function filterTab(btn) {
  document.querySelectorAll('.ftab').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  applyActiveFilter();
  applyTableFilter();
}

function applyActiveFilter() {
  const activeBtn  = document.querySelector('.ftab.on');
  const filterType = (activeBtn?.textContent || 'all').toLowerCase();
  document.querySelectorAll('.pi').forEach(item => {
    const status = item.dataset.status || '';
    item.style.display =
      (filterType === 'all' || status === filterType) ? '' : 'none';
  });
}

// ── Outside click closes modals ───────────────────────────────────────────────
document.addEventListener('click', function (e) {
  const detailsMod = document.getElementById('paymentDetailsModal');
  if (e.target === detailsMod) closePaymentDetailsModal();

  const rejectMod = document.getElementById('rejectModal');
  if (e.target === rejectMod) closeRejectModal();

  const tableMod = document.getElementById('tablePaymentModal');
  if (e.target === tableMod) closeTablePaymentModal();

  const lb = document.getElementById('proofLightbox');
  if (e.target === lb) closeProofLightbox();
});

// Escape key closes lightbox
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeProofLightbox();
    closeTablePaymentModal();
    closePaymentDetailsModal();
    closeRejectModal();
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadPayments);
