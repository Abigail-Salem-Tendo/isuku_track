/* ── Sidebar toggle (called via inline onclick) ── */
function toggleSb() {
  var sb = document.querySelector('.sb');
  var overlay = document.getElementById('overlay');
  if (sb) sb.classList.toggle('open');
  if (overlay) overlay.classList.toggle('open');
}

document.addEventListener('DOMContentLoaded', function () {
  const scheduleData = [
    { date: '2026-03-15', zone: 'Zone A', operator: 'M. Iradukunda', wasteType: 'Mixed Waste', status: 'Upcoming' },
    { date: '2026-03-15', zone: 'Zone B', operator: 'J. Nshimiyimana', wasteType: 'Organic', status: 'Ongoing' },
    { date: '2026-03-16', zone: 'Zone C', operator: 'S. Mukamana', wasteType: 'Recyclables', status: 'Upcoming' },
    { date: '2026-03-13', zone: 'Zone A', operator: 'M. Iradukunda', wasteType: 'Mixed Waste', status: 'Completed' },
    { date: '2026-03-14', zone: 'Zone B', operator: 'J. Nshimiyimana', wasteType: 'Organic', status: 'Completed' }
  ];

  const claimsData = [
    { id: 'CLM-4012', type: 'Missed Collection', resident: 'Aline Uwimana', zone: 'Zone A', submitted: '2026-03-11', status: 'Open' },
    { id: 'CLM-4018', type: 'Overflowing Bin', resident: 'Eric Niyonzima', zone: 'Zone B', submitted: '2026-03-12', status: 'In Progress' },
    { id: 'CLM-4021', type: 'Late Pickup', resident: 'Diane Ishimwe', zone: 'Zone C', submitted: '2026-03-13', status: 'Open' },
    { id: 'CLM-3987', type: 'Missed Collection', resident: 'Patrick Mugisha', zone: 'Zone B', submitted: '2026-03-07', status: 'Resolved' },
    { id: 'CLM-3979', type: 'Overflowing Bin', resident: 'Benita Uwera', zone: 'Zone A', submitted: '2026-03-05', status: 'Resolved' }
  ];

  const tabs = Array.from(document.querySelectorAll('.tab'));
  const panels = Array.from(document.querySelectorAll('.section-panel'));

  const scheduleEls = {
    body: document.getElementById('scheduleTableBody'),
    zone: document.getElementById('scheduleZone'),
    status: document.getElementById('scheduleStatus'),
    date: document.getElementById('scheduleDate'),
    resetBtn: document.getElementById('resetScheduleFilters')
  };

  const claimsEls = {
    body: document.getElementById('claimsTableBody'),
    zone: document.getElementById('claimsZone'),
    status: document.getElementById('claimsStatus'),
    search: document.getElementById('claimsSearch'),
    resetBtn: document.getElementById('resetClaimsFilters')
  };

  function statusClass(status) {
    const map = {
      'Open': 'badge--open',
      'In Progress': 'badge--in-progress',
      'Resolved': 'badge--approved',
      'Upcoming': 'badge--upcoming',
      'Ongoing': 'badge--ongoing',
      'Completed': 'badge--completed'
    };

    return map[status] || 'badge--upcoming';
  }

  function renderScheduleTable(items) {
    if (!items.length) {
      scheduleEls.body.innerHTML = '<tr><td colspan="5"><div class="empty-state"><strong>No schedule found</strong><p>Try changing zone, status or date.</p></div></td></tr>';
      return;
    }

    scheduleEls.body.innerHTML = items.map(function (item) {
      return (
        '<tr>' +
          '<td>' + item.date + '</td>' +
          '<td>' + item.zone + '</td>' +
          '<td>' + item.operator + '</td>' +
          '<td>' + item.wasteType + '</td>' +
          '<td><span class="badge ' + statusClass(item.status) + '">' + item.status + '</span></td>' +
        '</tr>'
      );
    }).join('');
  }

  function renderClaimsTable(items) {
    if (!items.length) {
      claimsEls.body.innerHTML = '<tr><td colspan="5"><div class="empty-state"><strong>No claims found</strong><p>Try changing status, zone or search.</p></div></td></tr>';
      return;
    }

    claimsEls.body.innerHTML = items.map(function (item) {
      return (
        '<tr>' +
          '<td><div class="cell-title">' + item.id + '</div><div class="cell-sub">' + item.type + '</div></td>' +
          '<td>' + item.resident + '</td>' +
          '<td>' + item.zone + '</td>' +
          '<td>' + item.submitted + '</td>' +
          '<td><span class="badge ' + statusClass(item.status) + '">' + item.status + '</span></td>' +
        '</tr>'
      );
    }).join('');
  }

  function applyScheduleFilters() {
    if (!scheduleEls.body || !scheduleEls.zone) return;
    const zone = scheduleEls.zone.value;
    const status = scheduleEls.status.value;
    const date = scheduleEls.date.value;

    const filtered = scheduleData.filter(function (item) {
      const zoneMatch = zone === 'all' || item.zone === zone;
      const statusMatch = status === 'all' || item.status === status;
      const dateMatch = !date || item.date === date;
      return zoneMatch && statusMatch && dateMatch;
    });

    renderScheduleTable(filtered);
  }

  function applyClaimsFilters() {
    if (!claimsEls.body || !claimsEls.zone) return;
    const zone = claimsEls.zone.value;
    const status = claimsEls.status.value;
    const search = claimsEls.search ? claimsEls.search.value.trim().toLowerCase() : '';

    const filtered = claimsData.filter(function (item) {
      const zoneMatch = zone === 'all' || item.zone === zone;
      const statusMatch = status === 'all' || item.status === status;
      const searchMatch = !search || item.id.toLowerCase().includes(search) || item.resident.toLowerCase().includes(search);
      return zoneMatch && statusMatch && searchMatch;
    });

    renderClaimsTable(filtered);
  }

  function bindTabs() {
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (btn) {
          btn.classList.remove('active');
          btn.setAttribute('aria-selected', 'false');
        });

        panels.forEach(function (panel) {
          panel.classList.remove('active');
        });

        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');

        const target = document.getElementById(tab.dataset.panel);
        if (target) target.classList.add('active');
      });
    });
  }

  function bindFilters() {
    if (scheduleEls.zone) {
      scheduleEls.zone.addEventListener('change', applyScheduleFilters);
      scheduleEls.status.addEventListener('change', applyScheduleFilters);
      if (scheduleEls.date) scheduleEls.date.addEventListener('change', applyScheduleFilters);
      if (scheduleEls.resetBtn) scheduleEls.resetBtn.addEventListener('click', function () {
        scheduleEls.zone.value = 'all';
        scheduleEls.status.value = 'all';
        if (scheduleEls.date) scheduleEls.date.value = '';
        applyScheduleFilters();
      });
    }

    if (claimsEls.zone) {
      claimsEls.zone.addEventListener('change', applyClaimsFilters);
      claimsEls.status.addEventListener('change', applyClaimsFilters);
      if (claimsEls.search) claimsEls.search.addEventListener('input', applyClaimsFilters);
      if (claimsEls.resetBtn) claimsEls.resetBtn.addEventListener('click', function () {
        claimsEls.zone.value = 'all';
        claimsEls.status.value = 'all';
        if (claimsEls.search) claimsEls.search.value = '';
        applyClaimsFilters();
      });
    }
  }

  function updateStats() {
    const openClaims = claimsData.filter(function (item) { return item.status === 'Open'; }).length;
    const progressClaims = claimsData.filter(function (item) { return item.status === 'In Progress'; }).length;
    const resolvedClaims = claimsData.filter(function (item) { return item.status === 'Resolved'; }).length;

    var s1 = document.getElementById('statSchedules');
    var s2 = document.getElementById('statOpenClaims');
    var s3 = document.getElementById('statProgressClaims');
    var s4 = document.getElementById('statResolvedClaims');
    if (s1) s1.textContent = String(scheduleData.length);
    if (s2) s2.textContent = String(openClaims);
    if (s3) s3.textContent = String(progressClaims);
    if (s4) s4.textContent = String(resolvedClaims);
  }

  function hydrateAdminIdentity() {
    const adminName = localStorage.getItem('adminName') || 'Administrator';
    const initials = adminName
      .split(' ')
      .filter(Boolean)
      .map(function (part) { return part[0]; })
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'A';

    var nameEl = document.getElementById('adminName');
    var avatarEl = document.getElementById('adminAvatar');
    if (nameEl) nameEl.textContent = adminName;
    if (avatarEl) avatarEl.textContent = initials;
  }

  bindTabs();
  bindFilters();
  hydrateAdminIdentity();
  updateStats();
  applyScheduleFilters();
  applyClaimsFilters();
});
