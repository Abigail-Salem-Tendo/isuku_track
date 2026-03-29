/**
 * Zone Operator Payment Management System
 * Handles payment listing, approval/rejection, and analytics
 */

let allPayments = [];
let currentFilter = 'all';
let revenueChart, statusChart, monthlyChart;

// ── API Endpoints ────────────────────────────────────────────
const PAYMENT_API = '/payments';

// ── Initialize on page load ──────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  loadPayments();
  setupCharts();
  setupEventListeners();
});

// ── Load payments and statistics ─────────────────────────────
async function loadPayments() {
  try {
    const response = await fetch(PAYMENT_API, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    allPayments = await response.json();
    
    // Update statistics
    updateStatistics();
    
    // Render payments table
    renderPaymentsTable();
    
    // Update charts with real data
    updateCharts();

  } catch (error) {
    console.error('Error loading payments:', error);
    showError('Failed to load payments');
  }
}

// ── Update statistics cards ──────────────────────────────────
function updateStatistics() {
  const approvedPayments = allPayments.filter(p => p.status === 'approved');
  const pendingPayments = allPayments.filter(p => p.status === 'pending');
  const rejectedPayments = allPayments.filter(p => p.status === 'rejected');
  
  const totalApproved = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  
  // Update stat cards
  document.getElementById('totalCollected').textContent = 
    `RWF ${totalApproved.toLocaleString()}`;
  document.getElementById('pendingCount').textContent = pendingPayments.length;
  document.getElementById('approvedCount').textContent = approvedPayments.length;
  document.getElementById('rejectedCount').textContent = rejectedPayments.length;
  
  // Update pending badge
  const badge = document.querySelector('.sb-badge.am');
  if (badge) {
    badge.textContent = pendingPayments.length;
    badge.style.display = pendingPayments.length > 0 ? 'inline' : 'none';
  }
}

// ── Render payments table ────────────────────────────────────
function renderPaymentsTable() {
  const tbody = document.getElementById('paymentsTableBody');
  const emptyState = document.getElementById('emptyState');
  
  if (!allPayments || allPayments.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'flex';
    return;
  }
  
  emptyState.style.display = 'none';
  
  tbody.innerHTML = allPayments.map(payment => {
    const date = new Date(payment.submitted_at);
    const formattedDate = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: '2-digit' 
    });
    
    const statusClass = `status-badge ${payment.status}`;
    const statusText = payment.status.charAt(0).toUpperCase() + payment.status.slice(1);
    
    return `
      <tr class="payment-row-clickable" onclick="showPaymentDetails(${payment.id})">
        <td>${payment.resident_name || 'Unknown'}</td>
        <td><span class="amount">RWF ${(payment.amount || 0).toLocaleString()}</span></td>
        <td><span class="${statusClass}">${statusText}</span></td>
        <td>${formatPaymentMethod(payment.payment_method)}</td>
        <td>${formattedDate}</td>
        <td>
          <button class="btn-action" onclick="showPaymentDetails(${payment.id}); event.stopPropagation();">
            View
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ── Show payment details modal ───────────────────────────────
function showPaymentDetails(paymentId) {
  const payment = allPayments.find(p => p.id === paymentId);
  if (!payment) return;
  
  const modal = document.getElementById('detailsModal');
  const content = document.getElementById('paymentDetailsContent');
  
  const proofSection = payment.proof_url 
    ? `<img src="${payment.proof_url}" alt="Payment proof" class="proof-image">`
    : '<div class="proof-placeholder">No proof of payment uploaded</div>';
  
  const actionButtons = payment.status === 'pending' ? `
    <button class="btn-action btn-approve" onclick="approvePayment(${paymentId})">
      ✓ Approve Payment
    </button>
    <button class="btn-action btn-reject" onclick="openRejectModal(${paymentId})">
      ✗ Reject Payment
    </button>
  ` : '';
  
  content.innerHTML = `
    <div class="payment-detail-row">
      <div class="payment-detail-label">Resident</div>
      <div class="payment-detail-value">${payment.resident_name || 'Unknown'}</div>
    </div>
    <div class="payment-detail-row">
      <div class="payment-detail-label">Amount</div>
      <div class="payment-detail-value" style="font-weight: bold; color: var(--g2); font-size: 1.1em;">
        RWF ${(payment.amount || 0).toLocaleString()}
      </div>
    </div>
    <div class="payment-detail-row">
      <div class="payment-detail-label">Payment Month/Year</div>
      <div class="payment-detail-value">
        ${getMonthName(payment.payment_month)} ${payment.payment_year}
      </div>
    </div>
    <div class="payment-detail-row">
      <div class="payment-detail-label">Submitted Date</div>
      <div class="payment-detail-value">
        ${new Date(payment.submitted_at).toLocaleString()}
      </div>
    </div>
    <div class="payment-detail-row">
      <div class="payment-detail-label">Payment Method</div>
      <div class="payment-detail-value">
        ${formatPaymentMethod(payment.payment_method)}
      </div>
    </div>
    <div class="payment-detail-row">
      <div class="payment-detail-label">Transaction ID</div>
      <div class="payment-detail-value" style="font-family: monospace;">
        ${payment.transaction_reference || 'N/A'}
      </div>
    </div>
    <div class="payment-detail-row">
      <div class="payment-detail-label">Status</div>
      <div class="payment-detail-value">
        <span class="status-badge ${payment.status}">
          ${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
        </span>
      </div>
    </div>
    ${payment.rejection_reason ? `
    <div class="payment-detail-row">
      <div class="payment-detail-label">Rejection Reason</div>
      <div class="payment-detail-value">${payment.rejection_reason}</div>
    </div>
    ` : ''}
    <div class="payment-detail-row">
      <div class="payment-detail-label">Proof of Payment</div>
      <div class="payment-detail-value">
        ${proofSection}
      </div>
    </div>
    ${actionButtons ? `
    <div class="modal-actions">
      ${actionButtons}
    </div>
    ` : ''}
  `;
  
  modal.classList.add('show');
}

// ── Close modal ──────────────────────────────────────────────
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
  }
}

// ── Approve payment ──────────────────────────────────────────
async function approvePayment(paymentId) {
  if (!confirm('Are you sure you want to approve this payment?')) {
    return;
  }
  
  try {
    const response = await fetch(`${PAYMENT_API}/${paymentId}/approve`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to approve payment');
    }
    
    showSuccess('Payment approved successfully!');
    closeModal('detailsModal');
    loadPayments();
    
  } catch (error) {
    console.error('Error approving payment:', error);
    showError(error.message || 'Failed to approve payment');
  }
}

// ── Open rejection modal ──────────────────────────────────────
function openRejectModal(paymentId) {
  const modal = document.getElementById('rejectionModal');
  
  // Store payment ID in a data attribute
  modal.dataset.paymentId = paymentId;
  
  // Reset form
  document.getElementById('rejectionReason').value = '';
  document.getElementById('rejectionDetails').value = '';
  document.getElementById('rejectionsErrorMessage').innerHTML = '';
  
  modal.classList.add('show');
}

// ── Submit rejection ─────────────────────────────────────────
async function submitRejection() {
  const paymentId = document.getElementById('rejectionModal').dataset.paymentId;
  const reason = document.getElementById('rejectionReason').value.trim();
  const details = document.getElementById('rejectionDetails').value.trim();
  
  if (!reason) {
    showErrorInModal('rejectionsErrorMessage', 'Please select a rejection reason');
    return;
  }
  
  // Build rejection reason text
  let rejectionReasonText = reason;
  if (reason === 'other' && details) {
    rejectionReasonText = `Other: ${details}`;
  } else if (reason === 'other') {
    showErrorInModal('rejectionsErrorMessage', 'Please provide details for "Other" reason');
    return;
  }
  
  const btn = document.getElementById('submitRejectBtn');
  btn.disabled = true;
  btn.textContent = 'Processing...';
  
  try {
    const response = await fetch(`${PAYMENT_API}/${paymentId}/reject`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        rejection_reason: rejectionReasonText
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reject payment');
    }
    
    showSuccess('Payment rejected successfully!');
    closeModal('rejectionModal');
    closeModal('detailsModal');
    loadPayments();
    
  } catch (error) {
    console.error('Error rejecting payment:', error);
    showErrorInModal('rejectionsErrorMessage', error.message || 'Failed to reject payment');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Reject Payment';
  }
}

// ── Filter by status ─────────────────────────────────────────
function filterByStatus(status) {
  currentFilter = status;
  
  // Update button states
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // Filter and re-render
  const filtered = status === 'all' 
    ? allPayments 
    : allPayments.filter(p => p.status === status);
  
  renderFilteredPayments(filtered);
}

// ── Render filtered payments ─────────────────────────────────
function renderFilteredPayments(payments) {
  const tbody = document.getElementById('paymentsTableBody');
  const emptyState = document.getElementById('emptyState');
  
  if (!payments || payments.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'flex';
    return;
  }
  
  emptyState.style.display = 'none';
  
  tbody.innerHTML = payments.map(payment => {
    const date = new Date(payment.submitted_at);
    const formattedDate = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: '2-digit' 
    });
    
    const statusClass = `status-badge ${payment.status}`;
    const statusText = payment.status.charAt(0).toUpperCase() + payment.status.slice(1);
    
    return `
      <tr class="payment-row-clickable" onclick="showPaymentDetails(${payment.id})">
        <td>${payment.resident_name || 'Unknown'}</td>
        <td><span class="amount">RWF ${(payment.amount || 0).toLocaleString()}</span></td>
        <td><span class="${statusClass}">${statusText}</span></td>
        <td>${formatPaymentMethod(payment.payment_method)}</td>
        <td>${formattedDate}</td>
        <td>
          <button class="btn-action" onclick="showPaymentDetails(${payment.id}); event.stopPropagation();">
            View
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ── Setup charts ─────────────────────────────────────────────
function setupCharts() {
  // Check if Chart.js is loaded
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded');
    return;
  }
  
  // Weekly Revenue Chart
  const revenueCtx = document.getElementById('revenueChart');
  if (revenueCtx) {
    revenueChart = new Chart(revenueCtx, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'Weekly Revenue (RWF)',
          data: [0, 0, 0, 0, 0, 0, 0],
          borderColor: '#2e7d52',
          backgroundColor: 'rgba(46, 125, 82, 0.1)',
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: '#2e7d52'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              label: (context) => `RWF ${context.parsed.y.toLocaleString()}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#f0f0f0' }
          }
        }
      }
    });
  }
  
  // Payment Status Distribution Chart
  const statusCtx = document.getElementById('statusChart');
  if (statusCtx) {
    statusChart = new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: ['Approved', 'Pending', 'Rejected'],
        datasets: [{
          data: [0, 0, 0],
          backgroundColor: ['#2e7d52', '#f59e0b', '#dc2626'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
  
  // Monthly Trend Chart
  const monthlyCtx = document.getElementById('monthlyChart');
  if (monthlyCtx) {
    monthlyChart = new Chart(monthlyCtx, {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Monthly Collections (RWF)',
          data: [0, 0, 0, 0, 0, 0],
          backgroundColor: '#2e7d52',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }
}

// ── Update charts with data ──────────────────────────────────
function updateCharts() {
  if (!allPayments || allPayments.length === 0) return;
  
  // Status distribution
  const approved = allPayments.filter(p => p.status === 'approved').length;
  const pending = allPayments.filter(p => p.status === 'pending').length;
  const rejected = allPayments.filter(p => p.status === 'rejected').length;
  
  if (statusChart) {
    statusChart.data.datasets[0].data = [approved, pending, rejected];
    statusChart.update();
  }
  
  // Weekly revenue (last 7 days)
  const today = new Date();
  const weekData = [0, 0, 0, 0, 0, 0, 0];
  
  allPayments.filter(p => p.status === 'approved').forEach(payment => {
    const payDate = new Date(payment.submitted_at);
    const dayDiff = Math.floor((today - payDate) / (1000 * 60 * 60 * 24));
    if (dayDiff >= 0 && dayDiff < 7) {
      weekData[6 - dayDiff] += payment.amount || 0;
    }
  });
  
  if (revenueChart) {
    revenueChart.data.datasets[0].data = weekData;
    revenueChart.update();
  }
  
  // Monthly trend (last 6 months)
  const monthData = [0, 0, 0, 0, 0, 0];
  allPayments.filter(p => p.status === 'approved').forEach(payment => {
    const monthIdx = payment.payment_month - 1;
    if (monthIdx >= 0 && monthIdx < 6) {
      monthData[monthIdx] += payment.amount || 0;
    }
  });
  
  if (monthlyChart) {
    monthlyChart.data.datasets[0].data = monthData;
    monthlyChart.update();
  }
}

// ── Setup event listeners ────────────────────────────────────
function setupEventListeners() {
  // Close modals on backdrop click
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
      }
    });
  });
}

// ── Helper: Format payment method name ────────────────────────
function formatPaymentMethod(method) {
  const methods = {
    'mobile_money': 'Mobile Money',
    'bank_transfer': 'Bank Transfer',
    'cash': 'Cash'
  };
  return methods[method] || method || 'Unknown';
}

// ── Helper: Get month name ───────────────────────────────────
function getMonthName(monthNum) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNum - 1] || '';
}

// ── Helper: Show success message ─────────────────────────────
function showSuccess(message) {
  const container = document.getElementById('errorMessage');
  if (container) {
    container.innerHTML = `<div class="success-message">${message}</div>`;
    setTimeout(() => {
      container.innerHTML = '';
    }, 4000);
  }
}

// ── Helper: Show error message ───────────────────────────────
function showError(message) {
  const container = document.getElementById('errorMessage');
  if (container) {
    container.innerHTML = `<div class="error-message">${message}</div>`;
    setTimeout(() => {
      container.innerHTML = '';
    }, 4000);
  }
}

// ── Helper: Show error in modal ──────────────────────────────
function showErrorInModal(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `<div class="error-message">${message}</div>`;
  }
}
