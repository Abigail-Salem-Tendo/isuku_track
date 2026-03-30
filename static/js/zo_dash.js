/* ============================================
   zo_dash.js — Zone Operator Dashboard Logic
   Isuku Track · DevStrickers
   ============================================ */

/* ── Points per category config (matches backend) ── */
const POINTS_PER_CATEGORY = {
  missed_collection: 10,
  overflow: 15,
  illegal_dumping: 20,
  damaged_infrastructure: 25,
  environmental_hazard: 30,
  other: 5
};

/* ── Toast notification ── */
function showToast(message, points) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
    ${message}
    ${points ? `<span class="toast-points">+${points} pts</span>` : ''}
  `;

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

/* ── Approve claim with points ── */
function approveClaim(btn, points, residentName) {
  const ci = btn.closest('.ci');
  if (!ci) return;

  // Update UI
  ci.querySelector('.ci-acts').innerHTML = '<span class="b ok">Approved</span>';

  // Update points badge to "awarded"
  const pointsBadge = ci.querySelector('.points-badge');
  if (pointsBadge) {
    pointsBadge.className = 'points-awarded';
    pointsBadge.textContent = `+${points} pts awarded`;
  }

  // Show toast notification
  showToast(`Claim approved! ${residentName} earned`, points);

  // Update total points counter
  updateTotalPoints(points);

  applyActiveFilter();
}

/* ── Update total points displayed ── */
function updateTotalPoints(addPoints) {
  const totalEl = document.getElementById('totalPointsAwarded');
  if (totalEl) {
    const current = parseInt(totalEl.textContent) || 0;
    totalEl.textContent = current + addPoints;
  }
}

/* ── Load top contributors ── */
function loadTopContributors() {
  const container = document.getElementById('topContributorsContainer');
  if (!container) return;

  // Sample data - in production this would come from API
  const topContributors = [
    { name: 'Marie Jeannette', initials: 'MJ', points: 150, address: 'KG 15 Ave' },
    { name: 'Bob Ntwari', initials: 'BN', points: 120, address: 'KG 9 Ave' },
    { name: 'Eve Kayitesi', initials: 'EK', points: 110, address: 'KN 1 Rd' },
    { name: 'Sara Odette', initials: 'SO', points: 95, address: 'KG 7 Ave' },
    { name: 'Grace Keza', initials: 'GK', points: 85, address: 'KN 5 Rd' }
  ];

  if (topContributors.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        <p>No loyalty points earned yet</p>
      </div>
    `;
    return;
  }

  let html = '';
  topContributors.forEach((c, i) => {
    const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    html += `
      <div class="top-contributor">
        <div class="tc-rank ${rankClass}">${i + 1}</div>
        <div class="tc-av">${c.initials}</div>
        <div class="tc-info">
          <div class="tc-name">${c.name}</div>
          <div class="tc-sub">${c.address}</div>
        </div>
        <div class="tc-points">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          ${c.points}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Update total points awarded stat
  const totalPoints = topContributors.reduce((sum, c) => sum + c.points, 0);
  const totalEl = document.getElementById('totalPointsAwarded');
  if (totalEl) totalEl.textContent = totalPoints;
}

/* ── Load residents with loyalty points ── */
function loadResidentsStats() {
  // Calculate stats from resident data on page
  const residents = document.querySelectorAll('.ri');
  let totalPoints = 0;
  let topEarner = { name: '--', points: 0 };

  residents.forEach(ri => {
    const ptsEl = ri.querySelector('.loyalty-pts span');
    if (ptsEl) {
      const pts = parseInt(ptsEl.textContent) || 0;
      totalPoints += pts;

      const nameEl = ri.querySelector('.ri-name');
      if (pts > topEarner.points && nameEl) {
        topEarner = { name: nameEl.textContent, points: pts };
      }
    }
  });

  // Update stat cards
  const totalPtsEl = document.getElementById('totalLoyaltyPoints');
  const topNameEl = document.getElementById('topEarnerName');
  const topPtsEl = document.getElementById('topEarnerPoints');

  if (totalPtsEl) totalPtsEl.textContent = totalPoints;
  if (topNameEl) topNameEl.textContent = topEarner.name;
  if (topPtsEl) topPtsEl.textContent = topEarner.points + ' pts';
}

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

/* ── Claims approve/reject (fallback for buttons without onclick) ── */
document.querySelectorAll('.btn-ok').forEach(btn => {
  if (!btn.onclick) {
    btn.addEventListener('click', () => {
      const ci = btn.closest('.ci');
      if (!ci) return;
      const category = ci.dataset.category || 'other';
      const points = POINTS_PER_CATEGORY[category] || 5;
      const nameEl = ci.querySelector('.ci-meta');
      const name = nameEl ? nameEl.textContent.split('·')[0].trim() : 'Resident';
      approveClaim(btn, points, name);
    });
  }
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
const currentPage = window.location.pathname.split('/').pop();
if (currentPage) {
  const navLinks = document.querySelectorAll('.mob-nav a.mn-item');
  navLinks.forEach(link => {
    const href = link.getAttribute('href') || '';
    const linkPage = href.split('/').pop();
    link.classList.remove('active');
    if (linkPage === currentPage) link.classList.add('active');
  });
}

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
let zoneMapInstance = null; // Store map instance for fullscreen resize

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

/* ── Map Fullscreen Toggle ── */
function toggleMapFullscreen() {
  const mapCard = document.getElementById('mapCard');
  const expandIcon = document.getElementById('expandIcon');
  const collapseIcon = document.getElementById('collapseIcon');

  if (!mapCard) return;

  mapCard.classList.toggle('fullscreen');
  const isFullscreen = mapCard.classList.contains('fullscreen');

  // Toggle icons
  if (expandIcon) expandIcon.style.display = isFullscreen ? 'none' : 'block';
  if (collapseIcon) collapseIcon.style.display = isFullscreen ? 'block' : 'none';

  // Toggle body scroll
  document.body.style.overflow = isFullscreen ? 'hidden' : '';

  // Resize map after transition
  setTimeout(() => {
    if (zoneMapInstance) {
      zoneMapInstance.invalidateSize();
    }
  }, 300);
}

// Close fullscreen on Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const mapCard = document.getElementById('mapCard');
    if (mapCard && mapCard.classList.contains('fullscreen')) {
      toggleMapFullscreen();
    }
  }
});

/* ── Create Trash Bin Icon ── */
function createBinIcon(status) {
  const statusClass = status === 'active' ? 'active' : 'attention';
  return L.divIcon({
    className: 'leaflet-bin-icon',
    html: `<div class="bin-marker ${statusClass}">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 7h12l-1 12c0 1.1-.9 2-2 2H9c-1.1 0-2-.9-2-2L6 7z"/>
        <path d="M4 5h16v2H4z"/>
        <path d="M9 5V3h6v2"/>
        <path d="M10 10v6M14 10v6" stroke="rgba(255,255,255,0.5)" stroke-width="1" fill="none"/>
      </svg>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
}

/* ── Initialize Charts ── */
window.addEventListener('load', function() {
  // Load loyalty points features
  loadTopContributors();
  loadResidentsStats();

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
  zoneMapInstance = map; // Store for fullscreen resize

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

  // Resident locations with bin icons
  const residents = [
    { pos: [-1.9385, 30.1110], name: 'Alice Mutoni', paid: true, collected: true, hasClaim: true },
    { pos: [-1.9395, 30.1125], name: 'Bob Ntwari', paid: true, collected: true, hasClaim: true },
    { pos: [-1.9408, 30.1118], name: 'Grace Keza', paid: true, collected: false, hasClaim: false },
    { pos: [-1.9418, 30.1132], name: 'David Uwimana', paid: false, collected: false, hasClaim: true },
    { pos: [-1.9425, 30.1108], name: 'Marie Jeannette', paid: true, collected: true, hasClaim: false },
    { pos: [-1.9438, 30.1122], name: 'Claire N.', paid: false, collected: false, hasClaim: false },
    { pos: [-1.9400, 30.1140], name: 'Paul Rugamba', paid: true, collected: true, hasClaim: false },
    { pos: [-1.9412, 30.1095], name: 'Sara Odette', paid: true, collected: false, hasClaim: false }
  ];

  residents.forEach(r => {
    const status = r.paid ? 'active' : 'overdue';
    L.marker(r.pos, { icon: createBinIcon(status) })
      .addTo(map)
      .bindPopup(`
        <div style="min-width:160px;">
          <div style="font-weight:700;font-size:13px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;">${r.name}</div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;">
              <span style="color:#666;">Payment</span>
              <span style="display:flex;align-items:center;gap:4px;">
                <span style="width:8px;height:8px;border-radius:50%;background:${r.paid ? '#48a870' : '#ef4444'};"></span>
                <span style="font-weight:600;color:${r.paid ? '#48a870' : '#ef4444'};">${r.paid ? 'Paid' : 'Unpaid'}</span>
              </span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;">
              <span style="color:#666;">Collection</span>
              <span style="display:flex;align-items:center;gap:4px;">
                <span style="width:8px;height:8px;border-radius:50%;background:${r.collected ? '#48a870' : '#f59e0b'};"></span>
                <span style="font-weight:600;color:${r.collected ? '#48a870' : '#f59e0b'};">${r.collected ? 'Collected' : 'Pending'}</span>
              </span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;">
              <span style="color:#666;">Claims</span>
              <span style="display:flex;align-items:center;gap:4px;">
                <span style="width:8px;height:8px;border-radius:50%;background:${r.hasClaim ? '#ef4444' : '#9ca3af'};"></span>
                <span style="font-weight:600;color:${r.hasClaim ? '#ef4444' : '#9ca3af'};">${r.hasClaim ? 'Has Claim' : 'None'}</span>
              </span>
            </div>
          </div>
        </div>
      `);
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

  // Resident locations with bin icons
  const residents = [
    { pos: [-1.9385, 30.1110], name: 'Alice Mutoni', paid: true, collected: true, hasClaim: true },
    { pos: [-1.9395, 30.1125], name: 'Bob Ntwari', paid: true, collected: true, hasClaim: true },
    { pos: [-1.9408, 30.1118], name: 'Grace Keza', paid: true, collected: false, hasClaim: false },
    { pos: [-1.9418, 30.1132], name: 'David Uwimana', paid: false, collected: false, hasClaim: true },
    { pos: [-1.9425, 30.1108], name: 'Marie Jeannette', paid: true, collected: true, hasClaim: false },
    { pos: [-1.9438, 30.1122], name: 'Claire N.', paid: false, collected: false, hasClaim: false },
    { pos: [-1.9400, 30.1140], name: 'Paul Rugamba', paid: true, collected: true, hasClaim: false },
    { pos: [-1.9412, 30.1095], name: 'Sara Odette', paid: true, collected: false, hasClaim: false },
    { pos: [-1.9390, 30.1135], name: 'Eve Kayitesi', paid: true, collected: true, hasClaim: false },
    { pos: [-1.9432, 30.1098], name: 'John Mutabazi', paid: true, collected: true, hasClaim: false }
  ];

  residents.forEach(r => {
    const status = r.paid ? 'active' : 'overdue';
    L.marker(r.pos, { icon: createBinIcon(status) })
      .addTo(map)
      .bindPopup(`
        <div style="min-width:160px;">
          <div style="font-weight:700;font-size:13px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;">${r.name}</div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;">
              <span style="color:#666;">Payment</span>
              <span style="display:flex;align-items:center;gap:4px;">
                <span style="width:8px;height:8px;border-radius:50%;background:${r.paid ? '#48a870' : '#ef4444'};"></span>
                <span style="font-weight:600;color:${r.paid ? '#48a870' : '#ef4444'};">${r.paid ? 'Paid' : 'Unpaid'}</span>
              </span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;">
              <span style="color:#666;">Collection</span>
              <span style="display:flex;align-items:center;gap:4px;">
                <span style="width:8px;height:8px;border-radius:50%;background:${r.collected ? '#48a870' : '#f59e0b'};"></span>
                <span style="font-weight:600;color:${r.collected ? '#48a870' : '#f59e0b'};">${r.collected ? 'Collected' : 'Pending'}</span>
              </span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;">
              <span style="color:#666;">Claims</span>
              <span style="display:flex;align-items:center;gap:4px;">
                <span style="width:8px;height:8px;border-radius:50%;background:${r.hasClaim ? '#ef4444' : '#9ca3af'};"></span>
                <span style="font-weight:600;color:${r.hasClaim ? '#ef4444' : '#9ca3af'};">${r.hasClaim ? 'Has Claim' : 'None'}</span>
              </span>
            </div>
          </div>
        </div>
      `);
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

  // Residents along routes
  const routeResidents = [
    { pos: [-1.9385, 30.1110], name: 'Alice M.', paid: true, collected: true, hasClaim: false },
    { pos: [-1.9405, 30.1130], name: 'Grace K.', paid: true, collected: false, hasClaim: false },
    { pos: [-1.9425, 30.1108], name: 'Marie J.', paid: true, collected: true, hasClaim: false }
  ];

  routeResidents.forEach(r => {
    const status = r.paid ? 'active' : 'overdue';
    L.marker(r.pos, { icon: createBinIcon(status) })
      .addTo(map)
      .bindPopup(`
        <div style="min-width:160px;">
          <div style="font-weight:700;font-size:13px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;">${r.name}</div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;">
              <span style="color:#666;">Payment</span>
              <span style="display:flex;align-items:center;gap:4px;">
                <span style="width:8px;height:8px;border-radius:50%;background:${r.paid ? '#48a870' : '#ef4444'};"></span>
                <span style="font-weight:600;color:${r.paid ? '#48a870' : '#ef4444'};">${r.paid ? 'Paid' : 'Unpaid'}</span>
              </span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;">
              <span style="color:#666;">Collection</span>
              <span style="display:flex;align-items:center;gap:4px;">
                <span style="width:8px;height:8px;border-radius:50%;background:${r.collected ? '#48a870' : '#f59e0b'};"></span>
                <span style="font-weight:600;color:${r.collected ? '#48a870' : '#f59e0b'};">${r.collected ? 'Collected' : 'Pending'}</span>
              </span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;">
              <span style="color:#666;">Claims</span>
              <span style="display:flex;align-items:center;gap:4px;">
                <span style="width:8px;height:8px;border-radius:50%;background:${r.hasClaim ? '#ef4444' : '#9ca3af'};"></span>
                <span style="font-weight:600;color:${r.hasClaim ? '#ef4444' : '#9ca3af'};">${r.hasClaim ? 'Has Claim' : 'None'}</span>
              </span>
            </div>
          </div>
        </div>
      `);
  });

  // Start point marker
  L.circleMarker(routeA[0], {
    radius: 12, fillColor: '#3b82f6', color: '#fff', weight: 3, fillOpacity: 1
  }).addTo(map).bindPopup('<b>Start Point</b><br>Route A');

  // End point marker
  L.circleMarker(routeA[routeA.length - 1], {
    radius: 12, fillColor: '#ef4444', color: '#fff', weight: 3, fillOpacity: 1
  }).addTo(map).bindPopup('<b>End Point</b><br>Route A');
}