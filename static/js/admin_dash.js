/* ── Sidebar toggle (called via inline onclick) ── */
function toggleSb() {
  var sb = document.querySelector('.sb');
  var overlay = document.getElementById('overlay');
  if (sb) sb.classList.toggle('open');
  if (overlay) overlay.classList.toggle('open');
}

function toggleMobileProfileDd(event) {
  event.stopPropagation();
  var dd = document.getElementById('mobileProfileDd');
  if (dd) dd.classList.toggle('show');
}

document.addEventListener('DOMContentLoaded', function () {

  var state = null;

  var modal = document.getElementById('adminModal');
  var modalForm = document.getElementById('modalForm');
  var modalTitle = document.getElementById('modalTitle');
  var modalClose = document.getElementById('modalClose');
  var toast = document.getElementById('toast');
  var profileMenu = document.querySelector('.sb-profile');
  var profileMenuToggle = document.getElementById('sbMenuToggle');
  var notifWrap = document.querySelector('.notif-wrap');
  var notifToggle = document.getElementById('notifToggle');

  function closeNotifications() {
    if (!notifWrap) return;
    notifWrap.classList.remove('open');
    if (notifToggle) notifToggle.setAttribute('aria-expanded', 'false');
  }

  function toggleNotifications() {
    if (!notifWrap) return;
    var isOpen = notifWrap.classList.toggle('open');
    if (notifToggle) notifToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  function closeProfileMenu() {
    if (!profileMenu) return;
    profileMenu.classList.remove('open');
    if (profileMenuToggle) profileMenuToggle.setAttribute('aria-expanded', 'false');
  }

  function closeMobileProfileDd() {
    var dd = document.getElementById('mobileProfileDd');
    if (dd) dd.classList.remove('show');
  }

  function toggleProfileMenu() {
    if (!profileMenu) return;
    var isOpen = profileMenu.classList.toggle('open');
    if (profileMenuToggle) profileMenuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getDefaultState() {
    return {
      residents: 0,
      zones: [],
      vehicles: [],
      claims: [],
      payments: [], 
      reports: []
    };
  }

  function loadState() {
    return getDefaultState();
  }

  function saveState() {
    // Data is persisted to backend via API calls
  }
  // --- INTEGRATION: Fetch Live Telemetry  ---
 async function fetchLiveTelemetry() {
  try {
    // Fetching EVERYTHING in parallel
    const [zonesData, vehiclesData, claimsData, paymentsData, residentsData] = await Promise.all([
        API.get('/zones/'),
        API.get('/vehicles/'),
        API.get('/claims/'),
        API.get('/payments/'),
        API.get('/auth/users?role=resident')
    ]);

    // 1. Map Zones
    state.zones = zonesData.map(function(z) {
        return {
            id: z.id,
            name: z.name,
            location: z.district + ' · ' + z.sector,
            operator: z.zone_operator_name || 'Unassigned',
            schedule: z.zone_operator_name ? 'Ongoing' : 'Pending', 
            claims: 0 
        };
    });

    // 2. Map Vehicles
    state.vehicles = vehiclesData.map(function(v) {
        var statusDisplay = 'Available';
        if (v.status === 'in_use') statusDisplay = 'In Use';
        if (v.status === 'maintenance') statusDisplay = 'Maintenance';

        return {
            id: v.id,
            plate: v.plate_number,
            driver: v.driver_name,
            phone: v.driver_phone,
            status: statusDisplay
        };
    });

    // 3. Map Claims
    state.claims = claimsData.map(function(c) {
      // Find the zone name for UI display
      const zoneObj = zonesData.find(z => z.id === c.zone_id);
      const zoneName = zoneObj ? zoneObj.name : 'Unknown Zone';
      
      // Format date simply
      const dateObj = new Date(c.reported_at);
      const dateStr = dateObj.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });

      // Map backend status (open, under_review, approved, rejected) to UI
      let statusDisplay = 'Open';
      if (c.status === 'under_review') statusDisplay = 'In Progress';
      if (c.status === 'approved') statusDisplay = 'Resolved';
      if (c.status === 'rejected') statusDisplay = 'Rejected';

      // SAFELY handle the category name (Suggestions vs Claims)
      // Using regex /_/g to replace ALL underscores, just in case
      const rawCategory = c.claim_category || c.suggestion_category || 'Uncategorized';
      const formattedTitle = rawCategory.replace(/_/g, ' ').toUpperCase();

      return {
          id: `CLM-${c.id}`,
          title: formattedTitle,
          zone: zoneName,
          when: dateStr,
          status: statusDisplay
      };
  });

    // 4. Map Payments (To calculate the revenue in renderStats)
    // renderStats looks at state.reports for revenue. We will override renderStats to use this instead.
    state.payments = paymentsData;

    // 5. Total Residents
    state.residents = residentsData.length;

    // Overriding the renderStats function locally just for the revenue calculation
    const originalRenderStats = renderStats;
    renderStats = function() {
        originalRenderStats(); // Call original
        
        // Calculate real revenue from approved payments
        const approvedPayments = state.payments.filter(p => p.status === 'approved');
        const realRevenue = approvedPayments.reduce((sum, p) => sum + p.amount, 0);
        
        const statPaymentsWeek = document.getElementById('statPaymentsWeek');
        const revenueTotal = document.querySelector('.revenue-total');
        
        if (statPaymentsWeek) statPaymentsWeek.textContent = realRevenue.toLocaleString() + ' RWF';
        if (revenueTotal) revenueTotal.textContent = realRevenue.toLocaleString() + ' RWF total';
    };

    renderAll();
    showToast('Dashboard fully synced', false);

  } catch (error) {
    console.error("Failed to load live dashboard data:", error);
    showToast("Sync failed: Check network", true);
  }
}

  function showToast(message, isError) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('show', 'err');
    if (isError) toast.classList.add('err');
    requestAnimationFrame(function () { toast.classList.add('show'); });
    window.setTimeout(function () {
      toast.classList.remove('show');
    }, 2600);
  }

  function statusBadgeClass(status) {
    if (status === 'Reviewed' || status === 'Completed' || status === 'Resolved' || status === 'Available') return 'ok';
    if (status === 'Ongoing' || status === 'In Use' || status === 'In Progress') return 'go';
    if (status === 'Pending') return 'pe';
    return 'op';
  }

  function renderZoneTable() {
    var tbody = document.getElementById('zoneTableBody');
    if (!tbody) return;
    tbody.innerHTML = state.zones.map(function (zone) {
      return (
        '<tr>' +
        '<td><div class="zn">' + escapeHtml(zone.name) + '</div><div class="zg">' + escapeHtml(zone.location) + '</div></td>' +
        '<td>' + escapeHtml(zone.operator) + '</td>' +
        '<td><span class="b ' + statusBadgeClass(zone.schedule) + '">' + escapeHtml(zone.schedule) + '</span></td>' +
        '<td>' + String(zone.claims) + '</td>' +
        '</tr>'
      );
    }).join('');
  }

  function renderClaims() {
    var list = document.getElementById('claimsList');
    if (!list) return;
    list.innerHTML = state.claims.map(function (claim) {
      return (
        '<div class="ci">' +
        '<div class="ci-ico">' + escapeHtml(claim.id.slice(-2)) + '</div>' +
        '<div>' +
        '<div class="ci-ttl">' + escapeHtml(claim.title) + '</div>' +
        '<div class="ci-meta">' + escapeHtml(claim.zone) + ' · ' + escapeHtml(claim.when) + '</div>' +
        '</div>' +
        '<button type="button" class="b ' + statusBadgeClass(claim.status) + ' ci-badge claim-badge" data-claim-id="' + escapeHtml(claim.id) + '">' + escapeHtml(claim.status) + '</button>' +
        '</div>'
      );
    }).join('');
  }

  function renderFleet() {
    var list = document.getElementById('fleetList');
    if (!list) return;
    list.innerHTML = state.vehicles.map(function (vehicle) {
      return (
        '<div class="vi">' +
        '<div class="vp">' + escapeHtml(vehicle.plate) + '</div>' +
        '<div><div class="vn">' + escapeHtml(vehicle.driver) + '</div><div class="vm">' + escapeHtml(vehicle.phone) + '</div></div>' +
        '<span class="b ' + statusBadgeClass(vehicle.status) + ' vi-badge">' + escapeHtml(vehicle.status) + '</span>' +
        '</div>'
      );
    }).join('');
  }

  function renderReports() {
    var list = document.getElementById('reportsList');
    if (!list) return;
    list.innerHTML = state.reports.map(function (report) {
      return (
        '<div class="rr">' +
        '<div><div class="rz">' + escapeHtml(report.zone) + ' — ' + escapeHtml(report.operator) + '</div><div class="rm">Submitted ' + escapeHtml(report.submitted) + ' · ' + escapeHtml(report.note) + '</div></div>' +
        '<div class="rs"><div>Claims: <span>' + String(report.claims) + '</span></div><div>Resolved: <span>' + String(report.resolved) + '</span></div><div>Payments: <span>' + String(report.payments) + '</span></div><div>Revenue: <span>' + String(report.revenue.toLocaleString()) + ' RWF</span></div></div>' +
        '<span class="b ' + statusBadgeClass(report.status) + '">' + escapeHtml(report.status) + '</span>' +
        '</div>'
      );
    }).join('');
  }

  function renderStats() {
    var activeZones = state.zones.length;
    
    // Change this line to include 'In Progress'
    var openClaims = state.claims.filter(function (c) { 
        return c.status === 'Open' || c.status === 'In Progress'; 
    }).length;

    // ... rest of the function
    var paymentsWeek = state.reports.reduce(function (sum, r) { return sum + r.revenue; }, 0);

    var statActiveZones = document.getElementById('statActiveZones');
    var statOpenClaims = document.getElementById('statOpenClaims');
    var statPaymentsWeek = document.getElementById('statPaymentsWeek');
    var statTotalResidents = document.getElementById('statTotalResidents');
    var sbZonesCount = document.getElementById('sbZonesCount');
    var sbClaimsCount = document.getElementById('sbClaimsCount');

    if (statActiveZones) statActiveZones.textContent = String(activeZones);
    if (statOpenClaims) statOpenClaims.textContent = String(openClaims);
    if (statPaymentsWeek) statPaymentsWeek.textContent = paymentsWeek.toLocaleString() + ' RWF';
    if (statTotalResidents) statTotalResidents.textContent = String(state.residents.toLocaleString());
    if (sbZonesCount) sbZonesCount.textContent = String(activeZones);
    if (sbClaimsCount) sbClaimsCount.textContent = String(openClaims);

    var revenue = state.reports.reduce(function (sum, r) { return sum + r.revenue; }, 0);
    var revenueTotal = document.querySelector('.revenue-total');
    if (revenueTotal) revenueTotal.textContent = revenue.toLocaleString() + ' RWF this week';
  }

  function renderAll() {
    renderZoneTable();
    renderClaims();
    renderFleet();
    renderReports();
    renderStats();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    if (modalForm) modalForm.innerHTML = '';
  }

  function openModal(action) {
    if (!modal || !modalForm || !modalTitle) return;
    var formHtml = '';

    if (action === 'new-zone') {
      window.location.href = '/admin/zones'; 
    }

    if (action === 'create-schedule') {
      modalTitle.textContent = 'Create Schedule';
      formHtml =
        '<label class="mf-lbl">Zone<input class="mf-in" name="scheduleZone" required placeholder="Zone B" /></label>' +
        '<label class="mf-lbl">Operator<input class="mf-in" name="scheduleOperator" required placeholder="Amina K." /></label>' +
        '<label class="mf-lbl">Status<select class="mf-in" name="scheduleStatus"><option>Pending</option><option>Ongoing</option><option>Completed</option></select></label>' +
        '<label class="mf-lbl">Linked Claims<input class="mf-in" name="scheduleClaims" type="number" min="0" value="0" /></label>' +
        '<div class="mf-actions"><button type="button" class="mf-btn sec" data-close-modal>Cancel</button><button type="submit" class="mf-btn">Create</button></div>';
    }

    if (action === 'add-vehicle') {
      modalTitle.textContent = 'Add Vehicle';
      formHtml =
        '<label class="mf-lbl">Plate Number<input class="mf-in" name="vehiclePlate" required placeholder="RAD 007G" /></label>' +
        '<label class="mf-lbl">Driver Name<input class="mf-in" name="vehicleDriver" required placeholder="Marie C." /></label>' +
        '<label class="mf-lbl">Driver Phone<input class="mf-in" name="vehiclePhone" required placeholder="0788 000 111" /></label>' +
        '<label class="mf-lbl">Status<select class="mf-in" name="vehicleStatus"><option>Available</option><option>In Use</option><option>Maintenance</option></select></label>' +
        '<div class="mf-actions"><button type="button" class="mf-btn sec" data-close-modal>Cancel</button><button type="submit" class="mf-btn">Add Vehicle</button></div>';
    }

    if (!formHtml) return;

    modalForm.setAttribute('data-form-action', action);
    modalForm.innerHTML = formHtml;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function nextClaimStatus(current) {
    if (current === 'Open') return 'In Progress';
    if (current === 'In Progress') return 'Resolved';
    return 'Open';
  }

  function handleQuickAction(action) {
    function goToSidebarLink(keyword, fallbackHref) {
      var links = Array.from(document.querySelectorAll('.sb .sb-a[href]'));
      var target = links.find(function (link) {
        return link.textContent.toLowerCase().indexOf(keyword) !== -1;
      });
      var href = target ? target.getAttribute('href') : fallbackHref;
      if (href) {
        window.location.href = href;
        return true;
      }
      return false;
    }

    if (action === 'new-zone') {
      openModal('new-zone');
      return;
    }

    if (action === 'create-schedule') {
      openModal('create-schedule');
      return;
    }

    if (action === 'add-vehicle') {
      if (!goToSidebarLink('vehicles', '/admin/vehicles')) {
        showToast('Vehicles page is not available yet', true);
      }
      return;
    }

    if (action === 'view-reports' || action === 'all-reports') {
      if (!goToSidebarLink('reports', '/admin/reports')) {
        showToast('Reports page is not available yet', true);
      }
      return;
    }

    // ... down to ...

    if (action === 'stat-zones') {
      if (!goToSidebarLink('zones', '/admin/zones')) {
        showToast('Zones page is not available yet', true);
      }
      return;
    }

    if (action === 'stat-claims') {
      if (!goToSidebarLink('claims', '/admin/claims')) {
        showToast('Claims page is not available yet', true);
      }
      return;
    }

    if (action === 'stat-payments') {
      if (!goToSidebarLink('payments', '/admin/payments')) {
        showToast('Payments page is not available yet', true);
      }
      return;
    }

    if (action === 'stat-users') {
      if (!goToSidebarLink('users', '/admin/users')) {
        showToast('Users page is not available yet', true);
      }
      return;
    }

    if (action === 'view-claims') {
      var claims = document.getElementById('claimsList');
      if (claims) claims.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (action === 'manage-fleet') {
      var fleet = document.getElementById('fleetList');
      if (fleet) fleet.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function sectionByNav(navKey) {
    if (navKey === 'overview') return document.getElementById('section-overview');
    if (navKey === 'operations') return document.getElementById('section-operations');
    if (navKey === 'reports') return document.getElementById('section-reports');
    if (navKey === 'settings') return document.getElementById('section-settings');
    return null;
  }

  function setActiveNav(navKey) {
    var navItems = document.querySelectorAll('.sb .sb-a[data-nav]');
    navItems.forEach(function (item) {
      item.classList.toggle('on', item.getAttribute('data-nav') === navKey);
    });

    var mobileItems = document.querySelectorAll('.mob-nav .mn-item[data-nav]');
    mobileItems.forEach(function (item) {
      item.classList.toggle('active', item.getAttribute('data-nav') === navKey);
    });
  }

  function navigateToSection(navKey) {
    var section = sectionByNav(navKey);
    if (!section) {
      showToast('Section is not available yet', true);
      return;
    }

    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveNav(navKey);
  }

  function handleProfileAction(action) {
    if (action === 'settings') {
      navigateToSection('settings');
      return;
    }

    if (action === 'logout') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userRole');
      localStorage.removeItem('adminName');
      
      window.location.href = '/logout';
    }
  }

  function bindActions() {
    document.body.addEventListener('click', function (event) {
      if (notifToggle && event.target.closest('#notifToggle')) {
        event.preventDefault();
        toggleNotifications();
        return;
      }

      if (notifWrap && notifWrap.classList.contains('open') && !event.target.closest('.notif-wrap')) {
        closeNotifications();
      }

      if (profileMenuToggle && event.target.closest('#sbMenuToggle')) {
        event.preventDefault();
        toggleProfileMenu();
        return;
      }

      if (profileMenu && profileMenu.classList.contains('open') && !event.target.closest('.sb-profile')) {
        closeProfileMenu();
      }

      if (!event.target.closest('.mn-profile-wrap')) {
        closeMobileProfileDd();
      }

      var navEl = event.target.closest('[data-nav]');
      if (navEl) {
        if (navEl.tagName === 'A' && navEl.getAttribute('href')) {
          return;
        }
        event.preventDefault();
        navigateToSection(navEl.getAttribute('data-nav'));
      }

      var profileActionEl = event.target.closest('[data-profile-action]');
      if (profileActionEl) {
        event.preventDefault();
        handleProfileAction(profileActionEl.getAttribute('data-profile-action'));
        closeProfileMenu();
        closeMobileProfileDd();
        return;
      }

      var actionEl = event.target.closest('[data-action]');
      if (actionEl) {
        event.preventDefault();
        handleQuickAction(actionEl.getAttribute('data-action'));
      }

      var closeModalEl = event.target.closest('[data-close-modal]');
      if (closeModalEl) closeModal();

      var claimBtn = event.target.closest('[data-claim-id]');
      if (claimBtn) {
        var claimId = claimBtn.getAttribute('data-claim-id');
        var claim = state.claims.find(function (c) { return c.id === claimId; });
        if (!claim) return;
        claim.status = nextClaimStatus(claim.status);
        saveState();
        renderAll();
        showToast('Claim ' + claim.id + ' moved to ' + claim.status);
      }
    });

    document.body.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeProfileMenu();
        closeNotifications();
        closeMobileProfileDd();
      }

      if (event.key !== 'Enter' && event.key !== ' ') return;

      var navTarget = event.target.closest('[data-nav]');
      if (navTarget) {
        event.preventDefault();
        navigateToSection(navTarget.getAttribute('data-nav'));
        return;
      }

      var profileActionTarget = event.target.closest('[data-profile-action]');
      if (profileActionTarget) {
        event.preventDefault();
        handleProfileAction(profileActionTarget.getAttribute('data-profile-action'));
        return;
      }

      var quick = event.target.closest('.qa[data-action]');
      if (!quick) return;
      event.preventDefault();
      handleQuickAction(quick.getAttribute('data-action'));
    });

    if (modalClose) {
      modalClose.addEventListener('click', closeModal);
    }

    if (modal) {
      modal.addEventListener('click', function (event) {
        if (event.target === modal) closeModal();
      });
    }

    if (modalForm) {
      modalForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        var formAction = modalForm.getAttribute('data-form-action');
        var formData = new FormData(modalForm);

        if (formAction === 'new-zone') {
          var name = String(formData.get('zoneName') || '').trim();
          var location = String(formData.get('zoneLocation') || '').trim();
          var operator = String(formData.get('zoneOperator') || '').trim();
          if (!name || !location || !operator) {
            showToast('All zone fields are required', true);
            return;
          }
          state.zones.unshift({
            id: Date.now(),
            name: name,
            location: location,
            operator: operator,
            schedule: 'Pending',
            claims: 0
          });
          saveState();
          renderAll();
          closeModal();
          showToast('Zone created successfully');
          return;
        }

        if (formAction === 'create-schedule') {
          var sZone = String(formData.get('scheduleZone') || '').trim();
          var sOperator = String(formData.get('scheduleOperator') || '').trim();
          var sStatus = String(formData.get('scheduleStatus') || 'Pending');
          var sClaims = Number(formData.get('scheduleClaims') || 0);
          if (!sZone || !sOperator) {
            showToast('Zone and operator are required', true);
            return;
          }
          var zoneItem = state.zones.find(function (z) { return z.name.toLowerCase() === sZone.toLowerCase(); });
          if (!zoneItem) {
            showToast('Zone not found. Create zone first.', true);
            return;
          }
          zoneItem.operator = sOperator;
          zoneItem.schedule = sStatus;
          zoneItem.claims = Math.max(0, sClaims);
          saveState();
          renderAll();
          closeModal();
          showToast('Schedule updated successfully');
          return;
        }

        if (formAction === 'add-vehicle') {
          var plate = String(formData.get('vehiclePlate') || '').trim().toUpperCase();
          var driver = String(formData.get('vehicleDriver') || '').trim();
          var phone = String(formData.get('vehiclePhone') || '').trim();
          var status = String(formData.get('vehicleStatus') || 'Available');
          if (!plate || !driver || !phone) {
            showToast('All vehicle fields are required', true);
            return;
          }
          var exists = state.vehicles.some(function (v) { return v.plate === plate; });
          if (exists) {
            showToast('Plate already exists', true);
            return;
          }
          state.vehicles.unshift({
            id: Date.now(),
            plate: plate,
            driver: driver,
            phone: phone,
            status: status
          });
          saveState();
          renderAll();
          closeModal();
          showToast('Vehicle added successfully');
          return;
        }

      });
    }
  }

  function hydrateAdminIdentity() {
    var adminName = localStorage.getItem('adminName') || 'Administrator';
    var initials = adminName
      .split(' ')
      .filter(Boolean)
      .map(function (part) { return part[0]; })
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'AD';

    var nameEl = document.getElementById('adminName');
    var avatarEl = document.getElementById('adminAvatar');
    var sideAvatar = document.querySelector('.sb-av');
    if (nameEl) nameEl.textContent = adminName;
    if (avatarEl) avatarEl.textContent = initials;
    if (sideAvatar) sideAvatar.textContent = initials;
  }

  function setDashboardDate() {
    var dateEl = document.getElementById('dashboardDate');
    if (!dateEl) return;
    var subtitle = dateEl.getAttribute('data-subtitle') || 'Kimironko Sector';
    var now = new Date();
    var dateLabel = now.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    dateEl.textContent = dateLabel + ' — ' + subtitle;
  }

  function closeSidebarOnDesktop() {
    if (window.innerWidth > 680) {
      var sb = document.querySelector('.sb');
      var overlay = document.getElementById('overlay');
      if (sb) sb.classList.remove('open');
      if (overlay) overlay.classList.remove('open');
    }
  }

  state = loadState();
  hydrateAdminIdentity();
  setDashboardDate();
  bindActions();
  setActiveNav('overview');
  renderAll();
  fetchLiveTelemetry();

  document.querySelectorAll('.mob-nav .mn-item[href]').forEach(function (el) {
    el.addEventListener('click', function (event) {
      var href = el.getAttribute('href') || '';
      var hashIndex = href.indexOf('#');
      var targetId = hashIndex >= 0 ? href.slice(hashIndex + 1) : '';
      var target = targetId ? document.getElementById(targetId) : null;

      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      document.querySelectorAll('.mob-nav .mn-item').forEach(function (x) { x.classList.remove('active'); });
      el.classList.add('active');
    });
  });

  document.addEventListener('click', function () {
    closeMobileProfileDd();
  });

  window.addEventListener('resize', closeSidebarOnDesktop);
});
