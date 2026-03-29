// resident_payments.js — API-driven payment form and data loading

// ── Field Mapping Constants ──
const methodLabelMap = {
  'mobile_money': 'Mobile Money',
  'bank_transfer': 'Bank Transfer',
  'cash': 'Cash (at office)'
};

const methodClassMap = {
  'mobile_money': 'momo',
  'bank_transfer': 'bank',
  'cash': 'cash'
};

// ── State Management ──
let allPayments = [];
let submittedMonths = new Set(); // Track submitted month/years to prevent duplicates
let editingPaymentId = null; // Track which payment is being edited

// ── Helper Functions ──
function getPaymentMonthLabel(month, year) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[month - 1]} ${year}`;
}

function formatSubmittedDate(isoDate) {
  const date = new Date(isoDate);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return { date: dateStr, time: timeStr };
}

// ── Duplicate submission prevention ──
function updateSubmittedMonths(payments) {
  submittedMonths.clear();
  payments.forEach(p => {
    submittedMonths.add(`${p.payment_year}-${String(p.payment_month).padStart(2, '0')}`);
  });
}

function isMonthAlreadySubmitted(yearStr, monthStr) {
  return submittedMonths.has(`${yearStr}-${monthStr}`);
}

// ── Data Loading ──
async function loadPaymentData() {
  try {
    const [history, currentPrice] = await Promise.all([
      API.get('/payments/history'),
      API.get('/payments/prices/current')
    ]);

    allPayments = history.payments || [];
    updateSubmittedMonths(allPayments);
    
    renderPaymentsTable(allPayments);
    updateSummary(history.summary || {}, currentPrice || {});
    generateMonthDropdown(currentPrice);

  } catch (error) {
    console.error('Error loading payment data:', error);
    showToast('Error loading payment data. Please refresh the page.');
  }
}

// ── Render Payment Table ──
function renderPaymentsTable(payments) {
  const tbody = document.getElementById('paymentTableBody');
  if (!tbody) return;

  if (payments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:#999;">No payments found yet</td></tr>';
    return;
  }

  tbody.innerHTML = '';

  payments.forEach(payment => {
    const { date, time } = formatSubmittedDate(payment.submitted_at);
    const monthLabel = getPaymentMonthLabel(payment.payment_month, payment.payment_year);
    const methodLabel = methodLabelMap[payment.payment_method] || payment.payment_method;
    const methodClass = methodClassMap[payment.payment_method] || 'momo';

    const row = document.createElement('tr');
    row.setAttribute('data-status', payment.status);
    row.setAttribute('data-id', payment.id);

    const statusBadge = `
      <span class="rp-badge ${payment.status}">
        ${payment.status === 'pending' ? 'Pending' : 
          payment.status === 'approved' ? 'Approved' : 
          'Rejected'}
      </span>
    `;

    const actionButton = payment.status === 'pending' 
      ? `<button class="rp-btn-link" onclick="editPayment(${payment.id})">Edit</button>`
      : `<button class="rp-btn-link" onclick="viewPaymentDetail(${payment.id})">View</button>`;

    row.innerHTML = `
      <td><strong>${date}</strong><br><span style="font-size:.85rem;color:#999">${time}</span></td>
      <td>${monthLabel}</td>
      <td><span class="rp-pay-method ${methodClass}">${methodLabel}</span></td>
      <td class="rp-amount-cell">${payment.amount.toLocaleString()} Frw</td>
      <td>${statusBadge}</td>
      <td>${actionButton}</td>
    `;

    tbody.appendChild(row);
  });

  // Update pagination info
  document.getElementById('paymentsPaginationInfo').textContent = `Showing ${Math.min(payments.length, 10)} of ${payments.length} payments`;
}

// ── Update Summary Cards ──
function updateSummary(summary, currentPrice) {
  // Total Paid
  const totalPaid = summary.total_paid || 0;
  const approvedCount = summary.approved_count || 0;
  document.getElementById('totalPaid').textContent = totalPaid.toLocaleString();
  document.getElementById('totalPaidSub').textContent = `${approvedCount} payment${approvedCount !== 1 ? 's' : ''} approved`;

  // Pending Count
  const pendingCount = summary.pending_count || 0;
  document.getElementById('pendingCount').textContent = pendingCount;

  // Monthly Fee
  const monthlyFee = currentPrice.amount || 0;
  document.getElementById('monthlyFeeValue').textContent = monthlyFee.toLocaleString();
  document.getElementById('amount').value = monthlyFee;

  // Payment Status
  const statusText = pendingCount > 0 ? 'Under Review' : '✓ Up to Date';
  document.getElementById('paymentStatusText').textContent = statusText;
  document.getElementById('nextPaymentText').textContent = `Next: ${getNextMonthLabel()}`;
}

function getNextMonthLabel() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  return `${monthNames[nextMonth.getMonth()]} ${nextMonth.getFullYear()}`;
}

// ── Generate Month Dropdown ──
function generateMonthDropdown(currentPrice) {
  const select = document.getElementById('paymentMonth');
  if (!select) return;

  const now = new Date();
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    const option = document.createElement('option');
    option.value = `${year}-${month.toString().padStart(2, '0')}`;
    option.textContent = `${monthNames[month - 1]} ${year}`;
    select.appendChild(option);
  }
}

// ── Filter Payments ──
function filterResidentPayments(status, btn) {
  document.querySelectorAll('.rp-ftab').forEach(t => t.classList.remove('on'));
  btn.classList.add('on');

  document.querySelectorAll('#paymentTableBody tr').forEach(row => {
    if (status === 'all' || row.dataset.status === status) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

// ── View Payment Detail Modal ──
async function viewPaymentDetail(id) {
  try {
    const payment = await API.get(`/payments/${id}`);
    const modal = document.getElementById('paymentDetailModal');

    const { date, time } = formatSubmittedDate(payment.submitted_at);
    const monthLabel = getPaymentMonthLabel(payment.payment_month, payment.payment_year);
    const methodLabel = methodLabelMap[payment.payment_method] || payment.payment_method;
    const statusText = payment.status === 'pending' ? 'Pending' : 
                       payment.status === 'approved' ? 'Approved' : 'Rejected';

    document.getElementById('detailAmount').textContent = `${payment.amount.toLocaleString()} Frw`;
    document.getElementById('detailMethod').textContent = methodLabel;
    document.getElementById('detailTxn').textContent = payment.transaction_reference || 'N/A';
    document.getElementById('detailDate').textContent = `${date} at ${time}`;
    document.getElementById('detailMonth').textContent = monthLabel;
    document.getElementById('detailStatus').textContent = statusText;
    document.getElementById('detailStatus').className = `rp-badge ${payment.status}`;

    // Add proof image preview if available
    let proofHtml = '';
    if (payment.proof_url) {
      proofHtml = `
        <div class="rp-detail-item" style="grid-column: 1 / -1; margin-top: 1rem;">
          <span class="rp-detail-label">Payment Proof</span>
          <img src="${payment.proof_url}" style="width: 100%; max-width: 400px; border-radius: 8px; margin-top: 0.5rem;" alt="Payment proof">
        </div>
      `;
    }

    const detailGrid = modal.querySelector('.rp-detail-grid');
    const existingProof = detailGrid.querySelector('[style*="grid-column"]');
    if (existingProof) existingProof.remove();
    
    if (proofHtml) {
      detailGrid.insertAdjacentHTML('beforeend', proofHtml);
    }

    modal.classList.add('show');
  } catch (error) {
    console.error('Error loading payment detail:', error);
    showToast('Error loading payment details');
  }
}

// ── Modal Functions ──
function openAddPaymentModal() {
  editingPaymentId = null;
  document.getElementById('addPaymentModal').classList.add('show');
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('paymentDate').value = now.toISOString().slice(0, 16);
  document.getElementById('proofFile').value = '';
  document.querySelector('[type="submit"]').textContent = 'Submit Payment';
  document.querySelector('[type="submit"]').disabled = false;
}

function closeAddPaymentModal() {
  document.getElementById('addPaymentModal').classList.remove('show');
  document.getElementById('paymentForm').reset();
  document.getElementById('paymentMonth').disabled = false; // Re-enable month field
  document.querySelectorAll('.rp-error-message').forEach(el => el.classList.remove('visible'));
  document.querySelectorAll('.rp-form-group input, .rp-form-group select').forEach(el => el.classList.remove('error'));
  editingPaymentId = null;
}

function closePaymentDetailModal() {
  document.getElementById('paymentDetailModal').classList.remove('show');
}

// ── Edit pending payment ──
async function editPayment(id) {
  try {
    const payment = await API.get(`/payments/${id}`);
    
    if (payment.status !== 'pending') {
      showToast('Only pending payments can be edited');
      return;
    }

    editingPaymentId = id;
    
    // Pre-fill the form
    document.getElementById('paymentMonth').value = `${payment.payment_year}-${String(payment.payment_month).padStart(2, '0')}`;
    document.getElementById('paymentMonth').disabled = true; // Disable month change
    document.getElementById('paymentMethod').value = payment.payment_method;
    document.getElementById('transactionId').value = payment.transaction_reference || '';
    document.getElementById('paymentDate').value = new Date(payment.submitted_at).toISOString().slice(0, 16);
    
    // Update button text
    document.querySelector('[type="submit"]').textContent = 'Update Payment';
    
    openAddPaymentModal();
  } catch (error) {
    console.error('Error loading payment for edit:', error);
    showToast('Error loading payment details');
  }
}

// ── Form Validation Helpers ──
function showError(inputId, errorId) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (input) input.classList.add('error');
  if (error) error.classList.add('visible');
}

function clearError(inputId, errorId) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (input) input.classList.remove('error');
  if (error) error.classList.remove('visible');
}

// ── Toast Notification ──
function showToast(message) {
  const toast = document.getElementById('successToast');
  document.getElementById('toastMessage').textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Download Statement ──
function downloadStatement() {
  showToast('Downloading payment statement...');
}

// ── Initialize Page ──
document.addEventListener('DOMContentLoaded', function () {
  // Load payment data
  loadPaymentData();

  // ── Sidebar toggle ──
  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.querySelector('.sidebar-overlay');

  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      sidebarOverlay.classList.toggle('open');
    });
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('open');
    });
  }

  // ── Profile dropdown toggle ──
  function toggleProfileDd(e) {
    e.stopPropagation();
    const dd = document.getElementById('profileDd');
    if (dd) dd.classList.toggle('show');
  }

  document.addEventListener('click', function (e) {
    const dd = document.getElementById('profileDd');
    if (dd && !e.target.closest('.mn-profile-wrap')) {
      dd.classList.remove('show');
    }
  });

  window.toggleProfileDd = toggleProfileDd;

  // ── Form submission (validation + file upload + API call) ──
  const form = document.getElementById('paymentForm');
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      let valid = true;

      // Validate month
      const month = document.getElementById('paymentMonth').value;
      if (!month) {
        showError('paymentMonth', 'paymentMonthError');
        valid = false;
      } else {
        clearError('paymentMonth', 'paymentMonthError');
      }

      // Validate amount
      const amount = document.getElementById('amount').value;
      if (!amount || parseFloat(amount) <= 0) {
        showError('amount', 'amountError');
        valid = false;
      } else {
        clearError('amount', 'amountError');
      }

      // Validate payment method
      const method = document.getElementById('paymentMethod').value;
      if (!method) {
        showError('paymentMethod', 'paymentMethodError');
        valid = false;
      } else {
        clearError('paymentMethod', 'paymentMethodError');
      }

      // Validate payment date
      const paymentDate = document.getElementById('paymentDate').value;
      if (!paymentDate) {
        showError('paymentDate', 'paymentDateError');
        valid = false;
      } else {
        clearError('paymentDate', 'paymentDateError');
      }

      // Validate file (required only for new payments, optional for edits)
      const file = document.getElementById('proofFile').files[0];
      if (!editingPaymentId && !file) {
        showError('proofFile', 'proofFileError');
        valid = false;
      } else if (file) {
        clearError('proofFile', 'proofFileError');
      }

      if (valid) {
        const submitBtn = form.querySelector('[type="submit"]');
        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;

        try {
          let proofUrl = null;

          // Upload file if provided
          if (file) {
            submitBtn.textContent = 'Uploading proof...';
            const formData = new FormData();
            formData.append('photo', file);

            const token = localStorage.getItem('access_token');
            const uploadRes = await fetch(`${CONFIG.API_BASE_URL}/upload/photo`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
              body: formData
            });

            const uploadData = await uploadRes.json();
            console.log('File upload response:', uploadData);
            if (!uploadRes.ok) {
              throw new Error(uploadData.error || `File upload failed (${uploadRes.status})`);
            }
            proofUrl = uploadData.photo_url;
            console.log('Proof URL obtained:', proofUrl);
          }

          // Parse month/year from "YYYY-MM" format
          const [yearStr, monthStr] = month.split('-');
          const paymentYear = parseInt(yearStr);
          const paymentMonth = parseInt(monthStr);

          console.log(`Parsed month: ${paymentMonth}, year: ${paymentYear}`);

          // Check for duplicate submission (only for new payments)
          if (!editingPaymentId && isMonthAlreadySubmitted(yearStr, monthStr)) {
            showToast('Payment already submitted for this month');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            return;
          }

          submitBtn.textContent = editingPaymentId ? 'Updating...' : 'Submitting...';

          const paymentData = {
            payment_month: paymentMonth,
            payment_year: paymentYear,
            payment_method: method,
            transaction_reference: (document.getElementById('transactionId').value || '').trim() || null
          };

          // Always include proof_url even if null (optional field)
          if (proofUrl) {
            paymentData.proof_url = proofUrl;
          }

          console.log('Payment data being sent:', paymentData);

          let result;
          if (editingPaymentId) {
            // Update existing payment
            result = await API.put(`/payments/${editingPaymentId}`, paymentData);
          } else {
            // Create new payment
            result = await API.post('/payments/', paymentData);
          }

          console.log('Payment submission result:', result);

          closeAddPaymentModal();
          const msg = editingPaymentId 
            ? 'Payment updated successfully!' 
            : 'Payment submitted successfully! Awaiting review.';
          showToast(msg);
          loadPaymentData();

        } catch (err) {
          console.error('Payment submission error:', err);
          showToast(err.message || `Failed to ${editingPaymentId ? 'update' : 'submit'} payment. Please try again.`);
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  }

  // ── Modal overlay click handlers ──
  const addPaymentModal = document.getElementById('addPaymentModal');
  if (addPaymentModal) {
    addPaymentModal.addEventListener('click', function (e) {
      if (e.target === this) closeAddPaymentModal();
    });
  }

  const paymentDetailModal = document.getElementById('paymentDetailModal');
  if (paymentDetailModal) {
    paymentDetailModal.addEventListener('click', function (e) {
      if (e.target === this) closePaymentDetailModal();
    });
  }

  // ── Set default datetime ──
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const defaultDate = now.toISOString().slice(0, 16);
  const paymentDateInput = document.getElementById('paymentDate');
  if (paymentDateInput) {
    paymentDateInput.value = defaultDate;
  }

  // ── Setup logout handler ──
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    });
  }

  // Export functions to window for onclick handlers
  window.openAddPaymentModal = openAddPaymentModal;
  window.closeAddPaymentModal = closeAddPaymentModal;
  window.closePaymentDetailModal = closePaymentDetailModal;
  window.viewPaymentDetail = viewPaymentDetail;
  window.editPayment = editPayment;
  window.filterResidentPayments = filterResidentPayments;
  window.downloadStatement = downloadStatement;
  window.toggleProfileDd = toggleProfileDd;
});
