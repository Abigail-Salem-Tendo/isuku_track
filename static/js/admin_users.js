
  // --- UI TOGGLES & LOGOUT ---
  function toggleSb() {
    var sb = document.querySelector('.sb');
    var overlay = document.getElementById('overlay');
    if (sb) sb.classList.toggle('open');
    if (overlay) overlay.classList.toggle('open');
  }
  
  document.getElementById('logoutBtn')?.addEventListener('click', function () {
    localStorage.clear();
    window.location.href = '/login';
  });
  
  (function setDate() {
    var d = document.getElementById('dashboardDate');
    if (!d) return;
    var s = d.getAttribute('data-subtitle') || d.textContent.trim();
    var n = new Date();
    var l = n.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    d.textContent = l + ' — ' + s;
  })();
  
  // --- LIVE USERS INTEGRATION ---
  let globalUsers = [];
  
  async function fetchAndRenderUsers() {
      try {
          globalUsers = await API.get('/auth/users');
          
          const tbody = document.getElementById('usersTableBody');
          tbody.innerHTML = '';
          
          let residentsCount = 0;
          let zoneOpsCount = 0;
          
          globalUsers.forEach(u => {
              // Format role strings (e.g. "zone_operator" -> "Zone Operator")
              const rawRole = u.role || 'resident';
              const roleClass = rawRole.replace('_', ' '); 
              const displayRole = rawRole.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              
              if (rawRole === 'resident') residentsCount++;
              if (rawRole === 'zone_operator') zoneOpsCount++;
  
              // Backend doesn't explicitly track inactive users yet, defaulting to Active
              const status = 'Active';
              const statusClass = 'active';
              const badgeClass = 'ok';
  
              const row = `
              <tr data-role="${roleClass}" data-status="${statusClass}">
                <td>${u.username}</td>
                <td>${u.email}</td>
                <td>${displayRole}</td>
                <td>${u.phone_number || 'N/A'}</td>
                <td><span class="b ${badgeClass}">${status}</span></td>
              </tr>`;
              
              tbody.insertAdjacentHTML('beforeend', row);
          });
  
          // Update Top Card Statistics
          document.getElementById('usersTotalResidents').textContent = residentsCount;
          document.getElementById('usersActiveResidents').textContent = residentsCount; 
          document.getElementById('usersInactiveResidents').textContent = '0';
          document.getElementById('usersZoneOperators').textContent = zoneOpsCount;
  
          // Apply whichever filter tab is currently selected
          const activeFilterBtn = document.querySelector('.ftab.on');
          if(activeFilterBtn) {
              applyUsersFilter(activeFilterBtn.getAttribute('data-user-filter') || 'all');
          }
  
      } catch (error) {
          console.error("Error fetching users:", error);
          document.getElementById('usersTableBody').innerHTML = '<tr><td colspan="5" style="text-align:center; color:#e74c3c;">Failed to load users from the database.</td></tr>';
      }
  }
  
  // --- FILTER LOGIC ---
  function applyUsersFilter(filter) {
    var rows = document.querySelectorAll('#usersTableBody tr');
    rows.forEach(function (row) {
      var role = (row.getAttribute('data-role') || '').toLowerCase();
      var status = (row.getAttribute('data-status') || '').toLowerCase();
      var show = filter === 'all' || role === filter || status === filter;
      row.style.display = show ? '' : 'none';
    });
  }
  
  function setUsersFilter(filter) {
    var normalized = (filter || 'all').toLowerCase();
    document.querySelectorAll('.ftab[data-user-filter]').forEach(function (t) {
      t.classList.toggle('on', (t.getAttribute('data-user-filter') || '').toLowerCase() === normalized);
    });
    applyUsersFilter(normalized);
  }
  
  // Event Listeners for Tabs and Cards
  document.querySelectorAll('.ftab[data-user-filter]').forEach(function (tab) {
    tab.addEventListener('click', function () {
      setUsersFilter((tab.getAttribute('data-user-filter') || 'all').toLowerCase());
    });
  });
  
  document.querySelectorAll('[data-user-filter-card]').forEach(function (card) {
    function triggerCardFilter() {
      setUsersFilter((card.getAttribute('data-user-filter-card') || 'all').toLowerCase());
    }
    card.addEventListener('click', triggerCardFilter);
    card.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        triggerCardFilter();
      }
    });
  });
  
  
  fetchAndRenderUsers();
  