/* ── Sidebar toggle (called via inline onclick) ── */
function toggleSb() {
  var sb = document.querySelector('.sb');
  var overlay = document.getElementById('overlay');
  if (sb) sb.classList.toggle('open');
  if (overlay) overlay.classList.toggle('open');
}

document.addEventListener('DOMContentLoaded', function () {
  var STORAGE_KEY = 'isuku_admin_local_state_v1';
  var state = null;

  var modal = document.getElementById('adminModal');
  var modalForm = document.getElementById('modalForm');
  var modalTitle = document.getElementById('modalTitle');
  var modalClose = document.getElementById('modalClose');
  var toast = document.getElementById('toast');

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
      residents: 1204,
      zones: [
        { id: 1, name: 'Zone A', location: 'Gasabo · Kimironko', operator: 'Jean P.', schedule: 'Completed', claims: 2 },
        { id: 2, name: 'Zone B', location: 'Gasabo · Bibare', operator: 'Amina K.', schedule: 'Ongoing', claims: 5 },
        { id: 3, name: 'Zone C', location: 'Kacyiru · Nyarutarama', operator: 'Eric M.', schedule: 'Pending', claims: 1 },
        { id: 4, name: 'Zone D', location: 'Gasabo · Kibagabaga', operator: 'Diane U.', schedule: 'Completed', claims: 0 },
        { id: 5, name: 'Zone E', location: 'Gasabo · Rwezamenyo', operator: 'Patrick N.', schedule: 'Ongoing', claims: 3 }
      ],
      claims: [
        { id: 'CLM-4012', title: 'Overflow at KG 11 Ave', zone: 'Zone A', when: '2h ago', status: 'Open' },
        { id: 'CLM-4018', title: 'Illegal dumping — KN 5', zone: 'Zone B', when: '4h ago', status: 'In Progress' },
        { id: 'CLM-4021', title: 'Missed collection', zone: 'Zone B', when: 'Yesterday', status: 'Resolved' },
        { id: 'CLM-4032', title: 'Damaged bin — Street 4', zone: 'Zone E', when: 'Yesterday', status: 'Open' }
      ],
      vehicles: [
        { id: 1, plate: 'RAD 001A', driver: 'Jean-Claude M.', phone: '0788 123 456', status: 'In Use' },
        { id: 2, plate: 'RAD 002B', driver: 'Claudine U.', phone: '0722 987 654', status: 'Available' },
        { id: 3, plate: 'RAD 003C', driver: 'Patrick N.', phone: '0755 456 789', status: 'Maintenance' },
        { id: 4, plate: 'RAD 004D', driver: 'Amina K.', phone: '0788 321 654', status: 'In Use' }
      ],
      reports: [
        { id: 1, zone: 'Zone A', operator: 'Jean P.', submitted: 'Sun 8 Mar', note: 'Auto-generated', claims: 12, resolved: 10, payments: 28, revenue: 28000, status: 'Reviewed' },
        { id: 2, zone: 'Zone B', operator: 'Amina K.', submitted: 'Sun 8 Mar', note: 'Vehicle issue noted', claims: 18, resolved: 13, payments: 32, revenue: 32000, status: 'Pending' },
        { id: 3, zone: 'Zone C', operator: 'Eric M.', submitted: 'Sun 8 Mar', note: 'Route optimization suggested', claims: 7, resolved: 7, payments: 19, revenue: 19000, status: 'Pending' }
      ]
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return getDefaultState();
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.zones || !parsed.claims || !parsed.vehicles || !parsed.reports) return getDefaultState();
      return parsed;
    } catch (err) {
      return getDefaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
    var openClaims = state.claims.filter(function (c) { return c.status === 'Open'; }).length;
    var paymentsWeek = state.reports.reduce(function (sum, r) { return sum + r.payments; }, 0);
    var zoneOperators = (function () {
      var operatorKeys = new Set();
      state.zones.forEach(function (zone) {
        if (zone.operator) operatorKeys.add(String(zone.operator).trim().toLowerCase());
      });
      return operatorKeys.size;
    })();

    var statActiveZones = document.getElementById('statActiveZones');
    var statOpenClaims = document.getElementById('statOpenClaims');
    var statPaymentsWeek = document.getElementById('statPaymentsWeek');
    var statTotalResidents = document.getElementById('statTotalResidents');
    var statZoneOperators = document.getElementById('statZoneOperators');
    var sbZonesCount = document.getElementById('sbZonesCount');
    var sbZoneOperatorsCount = document.getElementById('sbZoneOperatorsCount');
    var sbClaimsCount = document.getElementById('sbClaimsCount');

    if (statActiveZones) statActiveZones.textContent = String(activeZones);
    if (statOpenClaims) statOpenClaims.textContent = String(openClaims);
    if (statPaymentsWeek) statPaymentsWeek.textContent = String(paymentsWeek);
    if (statTotalResidents) statTotalResidents.textContent = String(state.residents.toLocaleString());
    if (statZoneOperators) statZoneOperators.textContent = String(zoneOperators);
    if (sbZonesCount) sbZonesCount.textContent = String(activeZones);
    if (sbZoneOperatorsCount) sbZoneOperatorsCount.textContent = String(zoneOperators);
    if (sbClaimsCount) sbClaimsCount.textContent = String(openClaims);

    var revenue = state.reports.reduce(function (sum, r) { return sum + r.revenue; }, 0);
    var revenueTotal = document.querySelector('.revenue-total');
    if (revenueTotal) revenueTotal.textContent = revenue.toLocaleString() + ' RWF this week';
  }

  function countUniqueZoneOperators(zones) {
    var keys = new Set();
    zones.forEach(function (zone) {
      if (zone.zone_operator_id !== null && zone.zone_operator_id !== undefined) {
        keys.add('id:' + String(zone.zone_operator_id));
        return;
      }
      if (zone.zone_operator_name) {
        keys.add('name:' + String(zone.zone_operator_name).trim().toLowerCase());
      }
    });
    return keys.size;
  }

  function syncZoneOperatorsFromApi() {
    var statZoneOperators = document.getElementById('statZoneOperators');
    var sbZoneOperatorsCount = document.getElementById('sbZoneOperatorsCount');
    if ((!statZoneOperators && !sbZoneOperatorsCount) || typeof fetch !== 'function') return;

    fetch('/api/zones')
      .then(function (response) {
        if (!response.ok) throw new Error('Failed to load zones');
        return response.json();
      })
      .then(function (zones) {
        if (!Array.isArray(zones)) return;
        var uniqueOperators = String(countUniqueZoneOperators(zones));
        if (statZoneOperators) statZoneOperators.textContent = uniqueOperators;
        if (sbZoneOperatorsCount) sbZoneOperatorsCount.textContent = uniqueOperators;
      })
      .catch(function () {
        // Keep local state count if API data is temporarily unavailable.
      });
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
      modalTitle.textContent = 'Create New Zone';
      formHtml =
        '<label class="mf-lbl">Zone Name<input class="mf-in" name="zoneName" required placeholder="Zone F" /></label>' +
        '<label class="mf-lbl">District / Sector<input class="mf-in" name="zoneLocation" required placeholder="Gasabo · Gisozi" /></label>' +
        '<label class="mf-lbl">Operator<input class="mf-in" name="zoneOperator" required placeholder="Nadine T." /></label>' +
        '<div class="mf-actions"><button type="button" class="mf-btn sec" data-close-modal>Cancel</button><button type="submit" class="mf-btn">Save Zone</button></div>';
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
    if (action === 'new-zone' || action === 'create-schedule' || action === 'add-vehicle') {
      openModal(action);
      return;
    }

    if (action === 'view-reports' || action === 'all-reports') {
      var reports = document.getElementById('reportsList');
      if (reports) reports.scrollIntoView({ behavior: 'smooth', block: 'start' });
      showToast('Jumped to weekly reports');
      return;
    }

    if (action === 'manage-zones') {
      var zones = document.getElementById('zoneTableBody');
      if (zones) zones.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  function bindActions() {
    document.body.addEventListener('click', function (event) {
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
      if (event.key !== 'Enter' && event.key !== ' ') return;
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
      modalForm.addEventListener('submit', function (event) {
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
          showToast('Zone created in local mode');
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
          showToast('Schedule updated in local mode');
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
          showToast('Vehicle added in local mode');
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
    var now = new Date();
    var dateLabel = now.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    dateEl.textContent = dateLabel + ' — Kimironko Sector';
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
  renderAll();
  syncZoneOperatorsFromApi();
  window.addEventListener('resize', closeSidebarOnDesktop);
});
