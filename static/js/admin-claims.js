
  // Sidebar and Logout
  function toggleSb(){var sb=document.querySelector('.sb');var overlay=document.getElementById('overlay');if(sb)sb.classList.toggle('open');if(overlay)overlay.classList.toggle('open');}
  document.getElementById('logoutBtn')?.addEventListener('click',function(){localStorage.removeItem('accessToken');localStorage.removeItem('refreshToken');localStorage.removeItem('userRole');localStorage.removeItem('adminName');window.location.href='/login';});
  
  // Date Formatter
  (function(){
      var d=document.getElementById('dashboardDate');
      if(!d)return;
      var s=d.getAttribute('data-subtitle')||d.textContent.trim();
      var n=new Date();
      var l=n.toLocaleDateString('en-GB',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
      d.textContent=l+' — '+s;
  })();
  
  // --- LIVE CLAIMS INTEGRATION ---
  let globalClaims = [];
  let zonesMap = {}; // To quickly look up zone names by ID
  
  async function fetchAndRenderClaims() {
      try {
          // Fetch Claims and Zones simultaneously
          const [claimsData, zonesData] = await Promise.all([
              API.get('/claims/'),
              API.get('/zones/')
          ]);
  
          // Build a dictionary for fast Zone Name lookups { id: "Zone Name" }
          zonesData.forEach(z => { zonesMap[z.id] = z.name; });
  
          // Process and map the claims data
          globalClaims = claimsData.map(c => {
              const zoneName = zonesMap[c.zone_id] || 'Unknown Zone';
              const dateObj = new Date(c.reported_at);
              const dateStr = dateObj.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  
              let statusDisplay = 'Open';
              let badgeClass = 'op';
              if (c.status === 'under_review') { statusDisplay = 'In Progress'; badgeClass = 'go'; }
              if (c.status === 'approved') { statusDisplay = 'Resolved'; badgeClass = 'ok'; }
              if (c.status === 'rejected') { statusDisplay = 'Rejected'; badgeClass = 'op'; }
  
              const rawCategory = c.claim_category || c.suggestion_category || 'Uncategorized';
              const title = rawCategory.replace(/_/g, ' ').toUpperCase();
  
              return { ...c, zoneName, dateStr, statusDisplay, badgeClass, title };
          });
  
          renderClaimsList();
      } catch (error) {
          console.error("Error fetching claims:", error);
          document.getElementById('claimsList').innerHTML = '<div style="padding: 20px; text-align: center; color: #e74c3c;">Failed to load claims.</div>';
      }
  }
  
  function renderClaimsList() {
      const list = document.getElementById('claimsList');
      
      // Get current filter values
      const zoneFilter = document.getElementById('claimFilterZone').value.toLowerCase();
      const statusFilter = document.getElementById('claimFilterStatus').value;
      const searchFilter = document.getElementById('claimFilterSearch').value.toLowerCase();
  
      list.innerHTML = '';
  
      // Apply Filters
      const filtered = globalClaims.filter(c => {
          const matchZone = c.zoneName.toLowerCase().includes(zoneFilter);
          const matchStatus = statusFilter === "" || statusFilter === "All statuses" || c.statusDisplay === statusFilter;
          const matchSearch = c.title.toLowerCase().includes(searchFilter) || (c.description || '').toLowerCase().includes(searchFilter);
          
          return matchZone && matchStatus && matchSearch;
      });
  
      if (filtered.length === 0) {
          list.innerHTML = '<div style="padding: 20px; text-align: center; color: #7f8c8d;">No claims match your current filters.</div>';
          return;
      }
  
      // Render HTML
      filtered.forEach(c => {
          // Basic document icon for claims
          const iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#48a870" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>`;
          
          const html = `
          <div class="ci" style="align-items: flex-start;">
              <div class="ci-ico" style="margin-top: 2px;">${iconSvg}</div>
              <div style="flex: 1;">
                  <div class="ci-ttl">${c.title}</div>
                  <div class="ci-meta">${c.zoneName} · ${c.dateStr}</div>
                  <div style="font-size: 13px; color: #555; margin-top: 6px;">${c.description || 'No description provided.'}</div>
              </div>
              <span class="b ${c.badgeClass} ci-badge">${c.statusDisplay}</span>
          </div>`;
          
          list.insertAdjacentHTML('beforeend', html);
      });
  }
  
  // --- WIRE UP THE FILTER RIBBON ---
  document.getElementById('claimFilterZone').addEventListener('input', renderClaimsList);
  document.getElementById('claimFilterStatus').addEventListener('change', renderClaimsList);
  document.getElementById('claimFilterSearch').addEventListener('input', renderClaimsList);
  
  
  fetchAndRenderClaims();