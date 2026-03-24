/* ============================================
   zo_dash.js — Zone Operator Dashboard Logic
   Isuku Track · DevStrickers
   ============================================ */

/* ── Sidebar toggle ── */
function toggleSb() {
  const sb = document.querySelector('.sb');
  const overlay = document.getElementById('overlay');
  sb.classList.toggle('open');
  if (overlay) overlay.classList.toggle('open');
  // Body class so CSS can target map hiding
  document.body.classList.toggle('sb-open', sb.classList.contains('open'));
}

function textOf(el) { return el ? el.textContent.trim() : ''; }

function currentFilterLabel() {
  const active = document.querySelector('.ftab.on');
  return active ? textOf(active) : 'All';
}

function claimsStatus(item) {
  const actions = item.querySelector('.ci-acts');
  const badge = actions ? actions.querySelector('.b') : null;
  if (!badge) return 'Pending';
  const v = textOf(badge).toLowerCase();
  if (v.indexOf('progress') !== -1) return 'In Progress';
  if (v.indexOf('resolved') !== -1 || v.indexOf('approved') !== -1 || v.indexOf('rejected') !== -1) return 'Resolved';
  return 'Pending';
}

function schedulesStatus(item) {
  const badge = item.querySelector('.si-right .b');
  const status = textOf(badge).toLowerCase();
  if (status.indexOf('completed') !== -1) return 'Completed';
  if (status.indexOf('ongoing') !== -1) return 'Ongoing';
  return 'Pending';
}

function paymentsStatus(item) {
  if (item.querySelector('.pay-actions')) return 'Pending';
  const badge = item.querySelector('.b');
  const v = textOf(badge).toLowerCase();
  if (v.indexOf('approved') !== -1) return 'Approved';
  if (v.indexOf('rejected') !== -1) return 'Rejected';
  return 'Pending';
}

function residentsStatus(item) {
  const badge = item.querySelector('.b');
  const v = textOf(badge).toLowerCase();
  if (v.indexOf('inactive') !== -1) return 'Inactive';
  if (v.indexOf('pending') !== -1) return 'New';
  return 'Active';
}

function applyClaimsFilter(f) {
  document.querySelectorAll('.ci').forEach(item => {
    item.style.display = (f === 'All' || claimsStatus(item) === f) ? '' : 'none';
  });
}
function applySchedulesFilter(f) {
  document.querySelectorAll('.si').forEach(item => {
    item.style.display = (schedulesStatus(item) === f) ? '' : 'none';
  });
}

function updateScheduleStatusBoxes() {
  if (!document.querySelector('.schedule-status-ribbon')) return;
  const all = Array.from(document.querySelectorAll('.si'));
  const counts = { Completed: 0, Ongoing: 0, Pending: 0 };
  all.forEach(item => {
    const status = schedulesStatus(item);
    if (counts[status] !== undefined) counts[status] += 1;
  });

  const completedEl = document.getElementById('schedCompletedCount');
  const ongoingEl = document.getElementById('schedOngoingCount');
  const pendingEl = document.getElementById('schedPendingCount');
  if (completedEl) completedEl.textContent = String(counts.Completed);
  if (ongoingEl) ongoingEl.textContent = String(counts.Ongoing);
  if (pendingEl) pendingEl.textContent = String(counts.Pending);
}
function applyPaymentsFilter(f) {
  document.querySelectorAll('.pi').forEach(item => {
    item.style.display = (f === 'All' || paymentsStatus(item) === f) ? '' : 'none';
  });
}
function applyResidentsFilter(f) {
  const search = (document.querySelector('.search-inp') || {value:''}).value.trim().toLowerCase();
  document.querySelectorAll('.ri').forEach(item => {
    const matchStatus = (f === 'All' || residentsStatus(item) === f);
    const matchSearch = !search || textOf(item).toLowerCase().indexOf(search) !== -1;
    item.style.display = (matchStatus && matchSearch) ? '' : 'none';
  });
}

function applyActiveFilter() {
  const f = currentFilterLabel();
  if (document.querySelector('.ri'))  { applyResidentsFilter(f); return; }
  if (document.querySelector('.pi'))  { applyPaymentsFilter(f); return; }
  if (document.querySelector('.si'))  { applySchedulesFilter(f); return; }
  if (document.querySelector('.ci'))  { applyClaimsFilter(f); }
}

function filterTab(el) {
  document.querySelectorAll('.ftab').forEach(t => t.classList.remove('on'));
  el.classList.add('on');
  applyActiveFilter();
}

/* ── Schedule route start/complete ── */
function startRoute(btn, badgeId) {
  const badge = document.getElementById(badgeId);
  badge.className = 'b go';
  badge.textContent = 'Ongoing';
  btn.textContent = 'Mark Complete';
  btn.classList.add('go');
  updateScheduleStatusBoxes();
  applyActiveFilter();
  btn.onclick = function() {
    badge.className = 'b ok';
    badge.textContent = 'Completed';
    btn.style.display = 'none';
    updateScheduleStatusBoxes();
    applyActiveFilter();
  };
}

/* ── Claims approve/reject ── */
document.querySelectorAll('.btn-ok').forEach(btn => {
  btn.addEventListener('click', () => {
    const ci = btn.closest('.ci');
    if (!ci) return;
    ci.querySelector('.ci-acts').innerHTML = '<span class="b ok">Approved</span>';
    applyActiveFilter();
  });
});

document.querySelectorAll('.btn-no').forEach(btn => {
  btn.addEventListener('click', () => {
    const ci = btn.closest('.ci');
    if (!ci) return;
    ci.querySelector('.ci-acts').innerHTML = '<span class="b op">Rejected</span>';
    applyActiveFilter();
  });
});

/* ── Payments approve/reject ── */
document.querySelectorAll('.pay-actions').forEach(wrap => {
  const ab = wrap.querySelector('.btn-approve-pay');
  const rb = wrap.querySelector('.btn-reject-pay');
  if (ab) ab.addEventListener('click', () => { wrap.innerHTML = '<span class="b ok">Approved</span>'; applyActiveFilter(); });
  if (rb) rb.addEventListener('click', () => { wrap.innerHTML = '<span class="b op">Rejected</span>'; applyActiveFilter(); });
});

/* ── Weekly report save ── */
const saveBtn = document.querySelector('.btn-save');
if (saveBtn) {
  saveBtn.addEventListener('click', () => {
    saveBtn.textContent = 'Saved ✓';
    saveBtn.style.background = 'var(--g1)';
    setTimeout(() => { saveBtn.textContent = 'Save Remarks'; saveBtn.style.background = ''; }, 2000);
  });
}

if (document.querySelector('.ftabs')) applyActiveFilter();
updateScheduleStatusBoxes();

const residentsSearchInput = document.querySelector('.search-inp');
if (residentsSearchInput && document.querySelector('.ri')) {
  residentsSearchInput.addEventListener('input', applyActiveFilter);
}

/* ── Mobile bottom nav active highlight ── */
document.querySelectorAll('.mn-item').forEach(el => {
  if (el.tagName === 'A' || el.getAttribute('href')) {
    el.addEventListener('click', () => {
      document.querySelectorAll('.mn-item').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
    });
  }
});

/* ── Profile dropdown ── */
function toggleProfileDd(e) {
  e.stopPropagation();
  const dd = document.getElementById('profileDd');
  if (dd) dd.classList.toggle('show');
}

document.addEventListener('click', function() {
  const dd = document.getElementById('profileDd');
  if (dd) dd.classList.remove('show');
});

/* ── Logout ── */
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    window.location.href = '/logout';
  }
}

/* ── Rejection Modal ── */
let currentRejectTarget = null;

function openRejectModal(btn) {
  currentRejectTarget = btn;
  document.getElementById('rejectModal').classList.add('show');
  document.getElementById('rejectReason').value = '';
  document.getElementById('rejectDetails').value = '';
}

function closeRejectModal() {
  document.getElementById('rejectModal').classList.remove('show');
  currentRejectTarget = null;
}

function confirmReject() {
  const reason = document.getElementById('rejectReason').value;
  const details = document.getElementById('rejectDetails').value;

  if (!reason) {
    alert('Please select a rejection reason.');
    return;
  }

  const ci = currentRejectTarget.closest('.ci');
  const pi = currentRejectTarget.closest('.pi');

  if (ci) {
    const acts = ci.querySelector('.ci-acts');
    acts.innerHTML = '<span class="b op">Rejected</span>';
  } else if (pi) {
    const payActions = currentRejectTarget.closest('.pay-actions');
    if (payActions) {
      payActions.innerHTML = '<span class="b op">Rejected</span>';
    }
  }

  closeRejectModal();
  applyActiveFilter();
}

/* ── Initialize Charts ── */
window.addEventListener('load', function() {
  // Weekly Collections Bar Chart
  const weeklyCtx = document.getElementById('weeklyChart');
  if (weeklyCtx && typeof Chart !== 'undefined') {
    new Chart(weeklyCtx, {
      type: 'bar',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'Collections',
          data: [5, 7, 4, 6, 3, 2, 1],
          backgroundColor: 'rgba(72, 168, 112, 0.8)',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f0f0f0' }, ticks: { stepSize: 2 } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // Payment Status Doughnut Chart
  const paymentCtx = document.getElementById('paymentChart');
  if (paymentCtx && typeof Chart !== 'undefined') {
    new Chart(paymentCtx, {
      type: 'doughnut',
      data: {
        labels: ['Paid', 'Pending', 'Overdue'],
        datasets: [{
          data: [132, 10, 6],
          backgroundColor: ['#48a870', '#f59e0b', '#ef4444'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, font: { size: 11 } } }
        }
      }
    });
  }

  // Initialize Maps (whichever exists on the page)
  initZoneMap();
  initResidentsMap();
  initRouteMap();
});

/* ── Initialize Map ── */
function initZoneMap() {
  const mapEl = document.getElementById('zoneMap');
  if (!mapEl || typeof L === 'undefined') return;

  const center = [-1.9403, 30.1125];
  const map = L.map('zoneMap').setView(center, 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  // Route A (blue line)
  const routeA = [
    [-1.9380, 30.1100],
    [-1.9390, 30.1120],
    [-1.9405, 30.1130],
    [-1.9420, 30.1125],
    [-1.9430, 30.1140]
  ];
  L.polyline(routeA, { color: '#3b82f6', weight: 4, opacity: 0.8 })
    .addTo(map)
    .bindPopup('<b>Route A</b><br>Kibagabaga North<br>KG 11 Ave → KG 15 Ave');

  // Route B (orange line)
  const routeB = [
    [-1.9410, 30.1090],
    [-1.9420, 30.1105],
    [-1.9435, 30.1115],
    [-1.9445, 30.1100]
  ];
  L.polyline(routeB, { color: '#f59e0b', weight: 4, opacity: 0.8 })
    .addTo(map)
    .bindPopup('<b>Route B</b><br>Market Area');

  // Sample resident markers
  const residents = [
    { pos: [-1.9385, 30.1110], name: 'Alice Mutoni', status: 'active', address: 'KG 11 Ave' },
    { pos: [-1.9395, 30.1125], name: 'Bob Ntwari', status: 'active', address: 'KG 9 Ave' },
    { pos: [-1.9408, 30.1118], name: 'Grace Keza', status: 'active', address: 'KN 5 Rd' },
    { pos: [-1.9418, 30.1132], name: 'David Uwimana', status: 'overdue', address: 'Street 4' },
    { pos: [-1.9425, 30.1108], name: 'Marie Jeannette', status: 'active', address: 'KG 15 Ave' },
    { pos: [-1.9438, 30.1122], name: 'Claire N.', status: 'overdue', address: 'Market Rd' },
    { pos: [-1.9400, 30.1140], name: 'Paul Rugamba', status: 'active', address: 'KN 3 Rd' },
    { pos: [-1.9412, 30.1095], name: 'Sara Odette', status: 'active', address: 'KG 7 Ave' }
  ];

  residents.forEach(r => {
    const color = r.status === 'active' ? '#48a870' : '#ef4444';
    L.circleMarker(r.pos, {
      radius: 7,
      fillColor: color,
      color: '#fff',
      weight: 2,
      fillOpacity: 0.9
    }).addTo(map).bindPopup(`<b>${r.name}</b><br>${r.address}<br>Status: ${r.status}`);
  });
}

/* ── Initialize Residents Map ── */
function initResidentsMap() {
  const mapEl = document.getElementById('residentsMap');
  if (!mapEl || typeof L === 'undefined') return;

  const center = [-1.9403, 30.1125];
  const map = L.map('residentsMap').setView(center, 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  const residents = [
    { pos: [-1.9385, 30.1110], name: 'Alice Mutoni', status: 'active', address: 'KG 11 Ave' },
    { pos: [-1.9395, 30.1125], name: 'Bob Ntwari', status: 'active', address: 'KG 9 Ave' },
    { pos: [-1.9408, 30.1118], name: 'Grace Keza', status: 'active', address: 'KN 5 Rd' },
    { pos: [-1.9418, 30.1132], name: 'David Uwimana', status: 'inactive', address: 'Street 4' },
    { pos: [-1.9425, 30.1108], name: 'Marie Jeannette', status: 'active', address: 'KG 15 Ave' },
    { pos: [-1.9438, 30.1122], name: 'Claire N.', status: 'inactive', address: 'Market Rd' },
    { pos: [-1.9400, 30.1140], name: 'Paul Rugamba', status: 'active', address: 'KN 3 Rd' },
    { pos: [-1.9412, 30.1095], name: 'Sara Odette', status: 'active', address: 'KG 7 Ave' },
    { pos: [-1.9390, 30.1135], name: 'Eve Kayitesi', status: 'active', address: 'KN 1 Rd' },
    { pos: [-1.9432, 30.1098], name: 'John Mutabazi', status: 'active', address: 'KG 11 Ave' }
  ];

  residents.forEach(r => {
    const color = r.status === 'active' ? '#48a870' : '#ef4444';
    L.circleMarker(r.pos, {
      radius: 7,
      fillColor: color,
      color: '#fff',
      weight: 2,
      fillOpacity: 0.9
    }).addTo(map).bindPopup(`<b>${r.name}</b><br>${r.address}<br>Status: ${r.status}`);
  });
}

/* ── Initialize Route Map ── */
function initRouteMap() {
  const mapEl = document.getElementById('routeMap');
  if (!mapEl || typeof L === 'undefined') return;

  const center = [-1.9403, 30.1125];
  const map = L.map('routeMap').setView(center, 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  // Route A (blue - today's route)
  const routeA = [
    [-1.9380, 30.1100],
    [-1.9390, 30.1120],
    [-1.9405, 30.1130],
    [-1.9420, 30.1125],
    [-1.9430, 30.1140]
  ];
  L.polyline(routeA, { color: '#3b82f6', weight: 5, opacity: 0.9 })
    .addTo(map)
    .bindPopup('<b>Route A</b><br>Today 14:00<br>Kibagabaga North');

  // Route B (orange)
  const routeB = [
    [-1.9410, 30.1090],
    [-1.9420, 30.1105],
    [-1.9435, 30.1115],
    [-1.9445, 30.1100]
  ];
  L.polyline(routeB, { color: '#f59e0b', weight: 4, opacity: 0.8 })
    .addTo(map)
    .bindPopup('<b>Route B</b><br>Sat 21 07:30<br>Market Area');

  // Start point marker
  L.circleMarker(routeA[0], {
    radius: 10, fillColor: '#48a870', color: '#fff', weight: 3, fillOpacity: 1
  }).addTo(map).bindPopup('<b>Start Point</b><br>Route A');

  // End point marker
  L.circleMarker(routeA[routeA.length - 1], {
    radius: 10, fillColor: '#ef4444', color: '#fff', weight: 3, fillOpacity: 1
  }).addTo(map).bindPopup('<b>End Point</b><br>Route A');
}