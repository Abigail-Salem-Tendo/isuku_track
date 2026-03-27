// resident_payments.js — Enhanced Payment Page Interactivity

document.addEventListener('DOMContentLoaded', function () {

  // ── Sidebar toggle ──
  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  }

  // ── Filter tabs ──
  const tabs = document.querySelectorAll('.tabs .tab[data-filter]');
  const tableBody = document.getElementById('paymentTableBody');

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.getAttribute('data-filter');

      if (tableBody) {
        tableBody.querySelectorAll('tr').forEach(function (row) {
          const status = row.getAttribute('data-status');
          if (filter === 'all' || status === filter) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        });
      }

      updatePaginationInfo(filter);
    });
  });

  // ── Form validation ──
  const form = document.getElementById('paymentForm');

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

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      let valid = true;

      // Payer name
      const payerName = document.getElementById('payerName');
      if (!payerName.value.trim()) {
        showError('payerName', 'payerNameError');
        valid = false;
      } else {
        clearError('payerName', 'payerNameError');
      }

      // Payment method
      const paymentMethod = document.getElementById('paymentMethod');
      if (paymentMethod && !paymentMethod.value) {
        showError('paymentMethod', 'paymentMethodError');
        valid = false;
      } else {
        clearError('paymentMethod', 'paymentMethodError');
      }

      // Payment time
      const paymentTime = document.getElementById('paymentTime');
      if (!paymentTime.value) {
        showError('paymentTime', 'paymentTimeError');
        valid = false;
      } else {
        clearError('paymentTime', 'paymentTimeError');
      }

      // Amount
      const amount = document.getElementById('amount');
      if (!amount.value || parseFloat(amount.value) <= 0) {
        showError('amount', 'amountError');
        valid = false;
      } else {
        clearError('amount', 'amountError');
      }

      if (valid) {
        // Show success toast
        showToast('Payment submitted successfully!');

        // Add new row to table (demo)
        addPaymentToTable({
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          month: document.getElementById('paymentMonth')?.options[document.getElementById('paymentMonth').selectedIndex]?.text || 'March 2026',
          method: paymentMethod?.options[paymentMethod.selectedIndex]?.text || 'MTN MoMo',
          amount: formatCurrency(amount.value)
        });

        // Reset form
        form.reset();

        // Update summary cards
        updateSummaryCards(parseFloat(amount.value));
      }
    });
  }

  // ── Add payment to table ──
  function addPaymentToTable(payment) {
    const tbody = document.getElementById('paymentTableBody');
    if (!tbody) return;

    const newRow = document.createElement('tr');
    newRow.setAttribute('data-status', 'pending');
    newRow.innerHTML = `
      <td>
        <div class="table-date">
          <span class="date-main">${payment.date}</span>
          <span class="date-time">${payment.time}</span>
        </div>
      </td>
      <td>${payment.month}</td>
      <td>
        <div class="method-badge method-momo">
          <span class="method-icon">M</span>
          ${payment.method}
        </div>
      </td>
      <td class="amount-cell">${payment.amount}</td>
      <td><span class="badge badge--under-review">Pending</span></td>
      <td>
        <button class="btn-sm btn-sm-secondary" onclick="viewPaymentDetails(0)">View</button>
      </td>
    `;

    // Insert at the beginning
    tbody.insertBefore(newRow, tbody.firstChild);

    // Highlight briefly
    newRow.style.background = '#f0fdf4';
    setTimeout(() => {
      newRow.style.background = '';
      newRow.style.transition = 'background 0.5s ease';
    }, 1500);
  }

  // ── Format currency ──
  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-RW').format(amount) + ' Frw';
  }

  // ── Update summary cards ──
  function updateSummaryCards(newAmount) {
    const pendingEl = document.getElementById('pendingAmount');
    if (pendingEl) {
      const currentPending = parseInt(pendingEl.textContent.replace(/[^0-9]/g, '')) || 0;
      pendingEl.textContent = formatCurrency(currentPending + newAmount);
    }
  }

  // ── Update pagination info ──
  function updatePaginationInfo(filter) {
    const tbody = document.getElementById('paymentTableBody');
    const paginationInfo = document.querySelector('.pagination-info');

    if (!tbody || !paginationInfo) return;

    const visibleRows = tbody.querySelectorAll('tr:not([style*="display: none"])').length;
    const totalRows = tbody.querySelectorAll('tr').length;

    paginationInfo.textContent = `Showing 1-${visibleRows} of ${totalRows} payments`;
  }

  // ── Show toast notification ──
  window.showToast = function(message) {
    const toast = document.getElementById('successToast');
    if (toast) {
      toast.querySelector('span').textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    }
  };

  // ── View payment details ──
  window.viewPaymentDetails = function(id) {
    const modal = document.getElementById('paymentModal');
    if (modal) {
      modal.classList.add('show');
    }
  };

  window.closePaymentModal = function() {
    const modal = document.getElementById('paymentModal');
    if (modal) {
      modal.classList.remove('show');
    }
  };

  // ── Resubmit payment ──
  window.resubmitPayment = function(id) {
    const formSection = document.getElementById('paymentFormSection');
    if (formSection) {
      formSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // ── Toggle section collapse ──
  window.toggleSection = function(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.toggle('collapsed');

      // Rotate collapse button icon
      const btn = section.previousElementSibling?.querySelector('.collapse-btn');
      if (btn) {
        btn.style.transform = section.classList.contains('collapsed') ? 'rotate(-90deg)' : '';
      }
    }
  };

  // ── Filter payments function for inline button clicks ──
  window.filterPayments = function(status, btn) {
    document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    const tbody = document.getElementById('paymentTableBody');
    if (tbody) {
      tbody.querySelectorAll('tr').forEach(row => {
        if (status === 'all' || row.dataset.status === status) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    }

    updatePaginationInfo(status);
  };

  // ── Profile dropdown ──
  window.toggleProfileDd = function(e) {
    e.stopPropagation();
    const dd = document.getElementById('profileDd');
    if (dd) {
      dd.classList.toggle('show');
    }
  };

  document.addEventListener('click', function(e) {
    const dd = document.getElementById('profileDd');
    if (dd && !e.target.closest('.mn-profile-wrap')) {
      dd.classList.remove('show');
    }
  });

  // ── Close modal on overlay click ──
  const paymentModal = document.getElementById('paymentModal');
  if (paymentModal) {
    paymentModal.addEventListener('click', function(e) {
      if (e.target === this) {
        closePaymentModal();
      }
    });
  }

  // ── Set default datetime to now ──
  const paymentTimeInput = document.getElementById('paymentTime');
  if (paymentTimeInput && !paymentTimeInput.value) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    paymentTimeInput.value = now.toISOString().slice(0, 16);
  }

  // ── Initialize ──
  console.log('Resident Payments page initialized');

});
