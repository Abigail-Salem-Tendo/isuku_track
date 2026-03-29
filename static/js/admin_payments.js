
  // --- UI TOGGLES & LOGOUT ---
  function toggleSb() {
      document.querySelector('.sb')?.classList.toggle('open');
      document.getElementById('overlay')?.classList.toggle('open');
  }
  
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
      localStorage.clear();
      window.location.href = '/login';
  });
  
  (function setDate() {
      const d = document.getElementById('dashboardDate');
      if (!d) return;
      const s = d.getAttribute('data-subtitle') || d.textContent.trim();
      const l = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
      d.textContent = `${l} — ${s}`;
  })();
  
  // --- GLOBAL STATE ---
  let globalPayments = [];
  let usersMap = {}; 
  let currentFilter = 'All';
  
  // --- API FETCH & RENDER ---
  async function fetchAndRenderPayments() {
      try {
          const [paymentsData, usersData] = await Promise.all([
              API.get('/payments/'),
              API.get('/auth/users?role=resident')
          ]);
          
          // Map user IDs to names for quick lookup
          usersData.forEach(u => { usersMap[u.id] = u.username; });
          globalPayments = paymentsData;
  
          renderTable();
          updateCounters();
      } catch (error) {
          Swal.fire('Error', 'Failed to load payments', 'error');
      }
  }
  
  function getInitials(name) {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }
  
  function renderTable() {
      const list = document.getElementById('paymentsList');
      list.innerHTML = '';
  
      const filtered = globalPayments.filter(p => {
          const statusDisplay = p.status.charAt(0).toUpperCase() + p.status.slice(1);
          return currentFilter === 'All' || statusDisplay === currentFilter;
      });
  
      if (filtered.length === 0) {
          list.innerHTML = `<div style="padding:20px; text-align:center; color:#7f8c8d;">No payments found.</div>`;
          return;
      }
  
      filtered.forEach(p => {
          const statusDisplay = p.status.charAt(0).toUpperCase() + p.status.slice(1);
          const residentName = usersMap[p.resident_id] || 'Unknown Resident';
          const initials = getInitials(residentName);
          
          // Format date and amount
          const dateObj = new Date(p.submitted_at);
          const dateStr = dateObj.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          const amountStr = `${p.amount.toLocaleString()} ${p.currency}`;
  
          // Setup Badges & Action Buttons
          let badgeClass = 'pe';
          let actionButtons = '';
          
          if (statusDisplay === 'Approved') badgeClass = 'ok';
          if (statusDisplay === 'Rejected') badgeClass = 'op';
          
          if (statusDisplay === 'Pending') {
              badgeClass = 'op';
              // Add action buttons for pending items
              actionButtons = `
                  <div style="margin-top: 6px; display: flex; gap: 4px; justify-content: flex-end;">
                      <button onclick="approvePayment(${p.id})" style="background:#48a870; color:white; border:none; border-radius:4px; padding:3px 8px; cursor:pointer; font-size:11px;" title="Approve">✓ Approve</button>
                      <button onclick="rejectPayment(${p.id})" style="background:#e74c3c; color:white; border:none; border-radius:4px; padding:3px 8px; cursor:pointer; font-size:11px;" title="Reject">✗ Reject</button>
                  </div>`;
          }
  
          const methodMap = { 'mobile_money': 'MoMo', 'bank_transfer': 'Bank', 'cash': 'Cash' };
          const method = methodMap[p.payment_method] || p.payment_method;
  
          const html = `
              <div class="pi" data-status="${statusDisplay}" style="align-items: center;">
                  <div class="pi-av">${initials}</div>
                  <div style="flex: 1;">
                      <div class="pi-name">${residentName}</div>
                      <div class="pi-meta">Submitted ${dateStr} · Method: ${method}</div>
                  </div>
                  <div style="text-align: right;">
                      <div class="pi-amt">${amountStr}</div>
                      ${actionButtons ? actionButtons : `<span class="b ${badgeClass}" style="font-size:.73rem; margin-top:4px; display:inline-block;">${statusDisplay}</span>`}
                  </div>
              </div>`;
          
          list.insertAdjacentHTML('beforeend', html);
      });
  }
  
  function updateCounters() {
      let thisWeek = 0;
      let pending = 0;
      let approvedCount = 0;
      let revenueWeek = 0;
  
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
  
      globalPayments.forEach(p => {
          const submittedDate = new Date(p.submitted_at);
          const isThisWeek = submittedDate >= oneWeekAgo;
  
          if (isThisWeek) thisWeek++;
          if (p.status === 'pending') pending++;
          if (p.status === 'approved') {
              approvedCount++;
              if (isThisWeek) revenueWeek += p.amount;
          }
      });
  
      const totalProcessed = approvedCount + globalPayments.filter(p => p.status === 'rejected').length;
      const collectionRate = totalProcessed > 0 ? Math.round((approvedCount / (totalProcessed + pending)) * 100) : 0;
  
      document.getElementById('paymentsThisWeekCount').textContent = thisWeek;
      document.getElementById('paymentsPendingCount').textContent = pending;
      document.getElementById('paymentsRevenueWeek').textContent = revenueWeek.toLocaleString();
      document.getElementById('paymentsCollectionRate').textContent = `${collectionRate}%`;
      document.getElementById('paymentsPendingBadge').textContent = `${pending} pending`;
  }
  
  // --- ACTIONS: APPROVE / REJECT ---
  window.approvePayment = async function(id) {
      try {
          await API.put(`/payments/${id}/approve`);
          Swal.fire({ title: 'Approved!', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
          fetchAndRenderPayments();
      } catch (error) {
          Swal.fire('Error', error.message, 'error');
      }
  };
  
  window.rejectPayment = async function(id) {
      const { value: reason } = await Swal.fire({
          title: 'Reject Payment',
          input: 'text',
          inputLabel: 'Reason for rejection',
          inputPlaceholder: 'e.g., Invalid transaction ID...',
          showCancelButton: true,
          inputValidator: (value) => {
              if (!value) return 'You need to write something!'
          }
      });
  
      if (reason) {
          try {
              await API.put(`/payments/${id}/reject`, { rejection_reason: reason });
              Swal.fire({ title: 'Rejected', icon: 'info', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
              fetchAndRenderPayments();
          } catch (error) {
              Swal.fire('Error', error.message, 'error');
          }
      }
  };
  
  // --- TAB FILTERING ---
  document.querySelectorAll('.ftab').forEach(tab => {
      tab.addEventListener('click', (e) => {
          document.querySelectorAll('.ftab').forEach(t => t.classList.remove('on'));
          const clickedTab = e.currentTarget;
          clickedTab.classList.add('on');
          currentFilter = clickedTab.getAttribute('data-filter');
          renderTable();
      });
  });
  
  // Boot App
  fetchAndRenderPayments();
  