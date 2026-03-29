/* ============================================================
   zo_dash.js — Zone Operator Dashboard · Dynamic Data Layer
   Isuku Track · DevStrickers
   
   APIs consumed (from models):
     GET /auth/me               → User (user.py)
     GET /payments/             → Payment[] (payment.py)
     GET /payments/stats        → { pending, approved, rejected, total_approved_amount }
     GET /claims?type=claim     → Claim[] (claims.py)
     GET /schedules/            → Schedule[] (schedule.py)
     GET /residents/            → User[] role=resident (user.py)
   ============================================================ */

'use strict';

/* ── Points per category (mirrors backend) ──────────────────── */
const POINTS_PER_CATEGORY = {
  missed_collection:       10,
  overflow:                15,
  illegal_dumping:         20,
  damaged_infrastructure:  25,
  environmental_hazard:    30,
  other:                    5
};

/* ── Module-level state ─────────────────────────────────────── */
let _dashData = {
  user:       null,
  payments:   [],
  claims:     [],
  schedules:  [],
  residents:  [],
  payStats:   null,
};
let zoneMapInstance   = null;
let _weeklyChart      = null;
let _paymentChart     = null;
let currentRejectTarget = null;
let currentRejectType   = null;

/* ════════════════════════════════════════════════════════════
   BOOTSTRAP — load everything on DOMContentLoaded
   ════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  setLoadingState(true);
  try {
    await loadAllData();
  } catch (err) {
    console.error('[zo_dash] bootstrap error:', err);
  } finally {
    setLoadingState(false);
  }

  // Wire up non-data UI
  initTopbarProfileDd();
  initTopbarNotifications();
  removeSettingsOptions();
  initProfileMenuNavigation();
  wireStaticEventListeners();
});

/* ════════════════════════════════════════════════════════════
   DATA LOADING
   ════════════════════════════════════════════════════════════ */
async function loadAllData() {
  const token = localStorage.getItem('access_token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 1. User profile first (needed for zone info)
  try {
    const user = await apiFetch('/auth/me', headers);
    _dashData.user = user;
    applyUserProfile(user);
  } catch (e) {
    const cached = localStorage.getItem('userFullName');
    if (cached) applyUserProfile({ username: cached });
  }

  // 2. Parallel fetch of everything else
  const [payments, payStats, claims, schedules, residents] = await Promise.allSettled([
    apiFetch('/payments/',          headers),
    apiFetch('/payments/stats',     headers),
    apiFetch('/claims?type=claim',  headers),
    apiFetch('/schedules/',         headers),
    apiFetch('/residents/',         headers),
  ]);

  _dashData.payments  = settled(payments,  []);
  _dashData.payStats  = settled(payStats,  null);
  _dashData.claims    = settled(claims,    []);
  _dashData.schedules = settled(schedules, []);
  _dashData.residents = settled(residents, []);

  // 3. Render everything
  renderTopBanner();
  renderStatCards();
  renderCharts();
  renderZoneBanner();
  renderClaimsSection();
  renderPaymentsSection();
  renderSchedulesBadge();
  renderTopContributors();
  initZoneMap();
}

/* Helper: unwrap Promise.allSettled result */
function settled(result, fallback) {
  return result.status === 'fulfilled' ? (result.value ?? fallback) : fallback;
}

/* Helper: fetch wrapper */
async function apiFetch(path, headers) {
  const base = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) ? CONFIG.API_BASE_URL : '/api';
  // Try using the global API helper first
  if (typeof API !== 'undefined') {
    return API.get(path);
  }
  const res = await fetch(base + path, { headers });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

/* ════════════════════════════════════════════════════════════
   PROFILE & TOPBAR
   ════════════════════════════════════════════════════════════ */
function applyUserProfile(user) {
  if (!user) return;
  const name     = user.full_name || user.username || 'Zone Operator';
  const initials = name.split(' ').map(n => n[0].toUpperCase()).join('').slice(0, 2);
  const zoneName = user.zone_name || (user.zone_id ? `Zone ${user.zone_id}` : 'Zone');

  // Sidebar
  setText('sidebarProfileName',   name);
  setText('sidebarProfileRole',   zoneName);
  setText('sidebarProfileAvatar', initials);

  // Topbars
  setText('topbarProfileAvatar',  initials);
  setText('mobileProfileAvatar',  initials);
  setText('mobileProfileName',    name);
  setText('mobileProfileRole',    zoneName);

  // Topbar heading
  const h1 = document.querySelector('.tb-l h1');
  if (h1) h1.textContent = `${zoneName} Dashboard`;

  // Topbar date/location subtitle
  const sub = document.querySelector('.tb-l p');
  if (sub) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    sub.textContent = dateStr + (user.zone_name ? ` · ${user.zone_name}` : '');
  }

  localStorage.setItem('userFullName', name);
  localStorage.setItem('userInitials', initials);
}

/* ════════════════════════════════════════════════════════════
   ZONE BANNER (top hero strip)
   ════════════════════════════════════════════════════════════ */
function renderZoneBanner() {
  const u        = _dashData.user;
  const payments = _dashData.payments;
  const schedules = _dashData.schedules;

  // Residents count
  const resCount = _dashData.residents.length || 0;
  setText('zoneBannerResidents', resCount);

  // Schedules count
  const schedCount = schedules.length;
  setText('zoneBannerSchedules', schedCount);

  // Payment collection rate = approved / total
  const total    = payments.length;
  const approved = payments.filter(p => p.status === 'approved').length;
  const rate     = total > 0 ? Math.round(approved / total * 100) : 0;
  setText('zoneBannerRate', rate + '%');

  // Zone geo info from user
  if (u) {
    const geo = [u.district, u.sector, u.cell, u.village].filter(Boolean).join(' · ');
    setText('zoneBannerGeo', geo || 'Gasabo District · Kimironko Sector');
    setText('zoneBannerName', u.zone_name || 'Your Zone');
  }
}

/* ════════════════════════════════════════════════════════════
   TOPBAR HEADING (dynamic date)
   ════════════════════════════════════════════════════════════ */
function renderTopBanner() {
  const now     = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const sub     = document.querySelector('.tb-l p');
  if (sub && !_dashData.user) sub.textContent = dateStr;
}

/* ════════════════════════════════════════════════════════════
   STAT CARDS
   ════════════════════════════════════════════════════════════ */
function renderStatCards() {
  const payments  = _dashData.payments;
  const claims    = _dashData.claims;
  const schedules = _dashData.schedules;
  const payStats  = _dashData.payStats;

  // Pending claims
  const pendingClaims = claims.filter(c => c.status === 'open' || c.status === 'under_review').length;
  setText('pendingClaimsCount', pendingClaims);

  // Update sidebar badge for claims
  const claimBadge = document.querySelector('.sb-badge');
  if (claimBadge) {
    claimBadge.textContent = pendingClaims;
    claimBadge.style.display = pendingClaims > 0 ? 'inline' : 'none';
  }

  // Pending payments badge (sidebar)
  const pendingPayments = payments.filter(p => p.status === 'pending').length;
  const payBadge = document.querySelector('.sb-badge.am');
  if (payBadge) {
    payBadge.textContent = pendingPayments;
    payBadge.style.display = pendingPayments > 0 ? 'inline' : 'none';
  }

  // Payments this week
  const oneWeekAgo   = new Date(Date.now() - 7 * 86400 * 1000);
  const paymentsWeek = payments.filter(p => new Date(p.submitted_at) >= oneWeekAgo).length;
  setText('weekPaymentsCount', paymentsWeek);

  // Total points awarded (sum of loyalty_points from approved claims)
  const totalPoints = claims
    .filter(c => c.status === 'approved')
    .reduce((s, c) => s + (c.points_awarded || 0), 0);
  setText('totalPointsAwarded', totalPoints);

  // Next schedule
  const upcoming = schedules
    .filter(s => s.status === 'not_started')
    .sort((a, b) => new Date(a.date_time_start) - new Date(b.date_time_start));

  const nextSched = upcoming[0];
  if (nextSched) {
    const d    = new Date(nextSched.date_time_start);
    const isToday = d.toDateString() === new Date().toDateString();
    const label  = isToday ? 'Today' : d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
    const time   = d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
    setText('nextSchedLabel', label);
    setText('nextSchedSub',   `${time} — ${nextSched.vehicle?.plate_number || 'Route A'}`);
  } else {
    setText('nextSchedLabel', 'None');
    setText('nextSchedSub',   'No upcoming schedules');
  }
}

/* ════════════════════════════════════════════════════════════
   CHARTS (weekly collections & payment status doughnut)
   ════════════════════════════════════════════════════════════ */
function renderCharts() {
  if (typeof Chart === 'undefined') return;

  const payments = _dashData.payments;

  // ── Weekly Collections bar chart ──────────────────────────
  const weekCtx = document.getElementById('weeklyChart');
  if (weekCtx) {
    // Build last-7-days labels + counts
    const dayLabels  = [];
    const dayAmounts = new Array(7).fill(0);
    const now        = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      dayLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
    }

    payments.filter(p => p.status === 'approved').forEach(p => {
      const d    = new Date(p.submitted_at);
      const diff = Math.floor((now - d) / 86400000);
      if (diff >= 0 && diff < 7) dayAmounts[6 - diff] += (p.amount || 0);
    });

    if (_weeklyChart) _weeklyChart.destroy();
    _weeklyChart = new Chart(weekCtx, {
      type: 'bar',
      data: {
        labels: dayLabels,
        datasets: [{
          label: 'Revenue (RWF)',
          data: dayAmounts,
          backgroundColor: 'rgba(72, 168, 112, 0.82)',
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => `RWF ${ctx.parsed.y.toLocaleString()}` } }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#f0f0f0' },
            ticks: { callback: v => v >= 1000 ? (v/1000)+'k' : v }
          },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // ── Payment Status doughnut ────────────────────────────────
  const payCtx = document.getElementById('paymentChart');
  if (payCtx) {
    const approved  = payments.filter(p => p.status === 'approved').length;
    const pending   = payments.filter(p => p.status === 'pending').length;
    const rejected  = payments.filter(p => p.status === 'rejected').length;

    if (_paymentChart) _paymentChart.destroy();
    _paymentChart = new Chart(payCtx, {
      type: 'doughnut',
      data: {
        labels: ['Approved', 'Pending', 'Rejected'],
        datasets: [{
          data: [approved, pending, rejected],
          backgroundColor: ['#48a870', '#f59e0b', '#ef4444'],
          borderWidth: 0,
          cutout: '60%'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 12, usePointStyle: true, font: { size: 11 } }
          }
        }
      }
    });
  }
}

/* ════════════════════════════════════════════════════════════
   CLAIMS SECTION (dashboard preview — last 4 open claims)
   ════════════════════════════════════════════════════════════ */
function renderClaimsSection() {
  const container = document.getElementById('claimsContainer');
  if (!container) return;

  const open = _dashData.claims
    .filter(c => c.status === 'open' || c.status === 'under_review')
    .sort((a, b) => new Date(b.reported_at) - new Date(a.reported_at))
    .slice(0, 4);

  if (!open.length) {
    container.innerHTML = `
      <div class="dash-empty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p>No pending claims — all clear!</p>
      </div>`;
    return;
  }

  const categoryIcon = cat => {
    const icons = {
      overflow:                `<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/>`,
      missed_collection:       `<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>`,
      illegal_dumping:         `<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>`,
      damaged_infrastructure:  `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`,
      environmental_hazard:    `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`,
      other:                   `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`
    };
    return icons[cat] || icons.other;
  };

  const urgentCategories = ['environmental_hazard', 'illegal_dumping', 'damaged_infrastructure'];

  container.innerHTML = open.map(c => {
    const catLabel = formatClaimCategory(c.claim_category);
    const ago      = toRelativeTime(c.reported_at);
    const isUrgent = urgentCategories.includes(c.claim_category);
    const statusCls = c.status === 'under_review' ? 'b go' : '';
    const statusLbl = c.status === 'under_review' ? 'In Review' : '';

    return `
      <a href="/zone-operator/claims" class="ci" data-category="${c.claim_category || 'other'}"
         data-claim-id="${c.id}" style="text-decoration:none;cursor:pointer;">
        <div class="ci-ico">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
               stroke="${isUrgent ? '#ef4444' : '#48a870'}" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            ${categoryIcon(c.claim_category)}
          </svg>
        </div>
        <div style="flex:1;min-width:0;">
          <div class="ci-ttl">
            ${catLabel}
            ${isUrgent ? '<span class="dash-urgent-dot"></span>' : ''}
          </div>
          <div class="ci-meta">${c.user?.username || c.user_name || 'Resident'} · ${ago}</div>
        </div>
        ${statusLbl ? `<span class="${statusCls}" style="font-size:.7rem;flex-shrink:0;">${statusLbl}</span>` : ''}
      </a>`;
  }).join('');

  // Update pending count in header
  setText('pendingClaimsCount', open.length);
}

/* ════════════════════════════════════════════════════════════
   PAYMENTS SECTION (dashboard preview — last 4 payments)
   ════════════════════════════════════════════════════════════ */
function renderPaymentsSection() {
  const container = document.getElementById('dashPaymentsContainer');
  if (!container) return;

  const recent = [..._dashData.payments]
    .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
    .slice(0, 4);

  // Update the "X pending" badge in card header
  const pending = _dashData.payments.filter(p => p.status === 'pending').length;
  setText('dashPaymentsPendingBadge', `${pending} pending`);

  if (!recent.length) {
    container.innerHTML = `<div class="dash-empty"><p>No payments yet this period.</p></div>`;
    return;
  }

  const statusCls = s => s === 'approved' ? 'b ok' : s === 'rejected' ? 'b op' : 'b pe';
  const statusLbl = s => s === 'approved' ? 'Approved' : s === 'rejected' ? 'Rejected' : 'Pending';
  const ini = name => (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  container.innerHTML = recent.map(p => {
    const ago = toRelativeTime(p.submitted_at);
    const amt = `${parseInt(p.amount || 0).toLocaleString()} ${p.currency || 'RWF'}`;
    return `
      <div class="pi">
        <div class="pi-av">${ini(p.resident_name)}</div>
        <div>
          <div class="pi-name">${p.resident_name || 'Resident'}</div>
          <div class="pi-meta">Submitted ${ago} · ${amt}</div>
        </div>
        <div class="pi-amt">${amt}</div>
        <span class="${statusCls(p.status)}" style="font-size:.7rem;">${statusLbl(p.status)}</span>
      </div>`;
  }).join('');
}

/* ════════════════════════════════════════════════════════════
   SCHEDULES — sidebar badge update
   ════════════════════════════════════════════════════════════ */
function renderSchedulesBadge() {
  const upcoming = _dashData.schedules.filter(s => s.status === 'not_started').length;
  const badge = document.querySelector('.sb-a[href="/zone-operator/schedules"] .sb-badge');
  if (badge) {
    badge.textContent = upcoming;
    badge.style.display = upcoming > 0 ? 'inline' : 'none';
  }
}

/* ════════════════════════════════════════════════════════════
   TOP CONTRIBUTORS (from residents' loyalty_points in User model)
   ════════════════════════════════════════════════════════════ */
function renderTopContributors() {
  const container = document.getElementById('topContributorsContainer');
  if (!container) return;

  // Sort residents by loyalty_points desc, take top 5
  const top = [..._dashData.residents]
    .filter(r => (r.loyalty_points || 0) > 0)
    .sort((a, b) => (b.loyalty_points || 0) - (a.loyalty_points || 0))
    .slice(0, 5);

  if (!top.length) {
    container.innerHTML = `
      <div class="dash-empty">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        <p>No loyalty points earned yet</p>
      </div>`;
    // Reset totalPointsAwarded
    setText('totalPointsAwarded', 0);
    return;
  }

  const rankCls = i => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
  const ini = name => (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  container.innerHTML = top.map((r, i) => `
    <div class="top-contributor">
      <div class="tc-rank ${rankCls(i)}">${i + 1}</div>
      <div class="tc-av">${ini(r.name)}</div>
      <div class="tc-info">
        <div class="tc-name">${r.name}</div>
        <div class="tc-sub">${r.email || (r.zone_id ? `Zone ${r.zone_id}` : '—')}</div>
      </div>
      <div class="tc-points">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        ${(r.loyalty_points || 0).toLocaleString()}
      </div>
    </div>`).join('');

  // Sum all resident points for the stat card
  const totalPts = _dashData.residents.reduce((s, r) => s + (r.loyalty_points || 0), 0);
  setText('totalPointsAwarded', totalPts.toLocaleString());
}

/* ════════════════════════════════════════════════════════════
   MAP — zone map with resident markers from real data
   ════════════════════════════════════════════════════════════ */
function initZoneMap() {
  const mapEl = document.getElementById('zoneMap');
  if (!mapEl || typeof L === 'undefined') return;

  // Determine zone center from user or from resident data
  const u = _dashData.user;
  let center = [-1.9403, 30.1125]; // Kimironko default
  if (u && u.latitude && u.longitude) center = [u.latitude, u.longitude];

  if (zoneMapInstance) {
    zoneMapInstance.remove();
    zoneMapInstance = null;
  }

  const map = L.map('zoneMap').setView(center, 15);
  zoneMapInstance = map;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  // Build a Set of resident IDs that have approved payments this month
  const now        = new Date();
  const thisMonth  = now.getMonth() + 1;
  const thisYear   = now.getFullYear();
  const paidIds    = new Set(
    _dashData.payments
      .filter(p => p.status === 'approved' && p.payment_month === thisMonth && p.payment_year === thisYear)
      .map(p => p.resident_id)
  );
  const claimIds   = new Set(_dashData.claims.filter(c => c.status === 'open').map(c => c.user_id));

  // If we have resident coords, plot them; otherwise use zone centre marker
  const residents  = _dashData.residents;

  if (residents.length) {
    residents.forEach(r => {
      // Residents may not have lat/lon — skip if absent
      if (!r.latitude && !r.longitude) return;

      const paid      = paidIds.has(r.id);
      const hasClaim  = claimIds.has(r.id);
      const status    = paid ? 'active' : 'overdue';

      L.marker([r.latitude, r.longitude], { icon: createBinIcon(status) })
        .addTo(map)
        .bindPopup(buildMarkerPopup(r.username, paid, hasClaim));
    });
  } else {
    // Fallback: single zone marker
    L.marker(center, { icon: createBinIcon('active') })
      .addTo(map)
      .bindPopup(`<strong>${u?.zone_name || 'Your Zone'}</strong>`);
  }
}

function buildMarkerPopup(name, paid, hasClaim) {
  const dot = (color) => `<span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block;"></span>`;
  return `
    <div style="min-width:160px;">
      <div style="font-weight:700;font-size:13px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;">${name}</div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <div style="display:flex;justify-content:space-between;font-size:11px;">
          <span style="color:#666;">Payment</span>
          <span style="display:flex;align-items:center;gap:4px;">
            ${dot(paid ? '#48a870' : '#ef4444')}
            <strong style="color:${paid ? '#48a870' : '#ef4444'};">${paid ? 'Paid' : 'Unpaid'}</strong>
          </span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;">
          <span style="color:#666;">Open Claim</span>
          <span style="display:flex;align-items:center;gap:4px;">
            ${dot(hasClaim ? '#ef4444' : '#9ca3af')}
            <strong style="color:${hasClaim ? '#ef4444' : '#9ca3af'};">${hasClaim ? 'Yes' : 'None'}</strong>
          </span>
        </div>
      </div>
    </div>`;
}

/* ════════════════════════════════════════════════════════════
   APPROVE CLAIM (API-backed)
   ════════════════════════════════════════════════════════════ */
async function approveClaim(btn, points, residentName) {
  const ci     = btn.closest('.ci');
  if (!ci) return;

  const claimId = ci.dataset.claimId;
  const token   = localStorage.getItem('access_token');

  btn.disabled  = true;

  if (claimId && token) {
    try {
      const res = await fetch(`/api/claims/${claimId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ points_awarded: points })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Approval failed');
      }
    } catch (e) {
      showToast(`Error: ${e.message}`, 0);
      btn.disabled = false;
      return;
    }
  }

  ci.querySelector('.ci-acts').innerHTML = '<span class="b ok">Approved</span>';
  const ptsBadge = ci.querySelector('.points-badge');
  if (ptsBadge) { ptsBadge.className = 'points-awarded'; ptsBadge.textContent = `+${points} pts awarded`; }

  showToast(`Claim approved! ${residentName} earned`, points);
  updateTotalPoints(points);
  applyActiveFilter();
}

function updateTotalPoints(add) {
  const el = document.getElementById('totalPointsAwarded');
  if (el) el.textContent = ((parseInt(el.textContent.replace(/,/g, '')) || 0) + add).toLocaleString();
}

/* ════════════════════════════════════════════════════════════
   REJECT MODAL (claims & payments)
   ════════════════════════════════════════════════════════════ */
function openRejectModal(targetElement, type) {
  currentRejectTarget = targetElement;
  currentRejectType   = type || (targetElement.closest('.ci') ? 'claim' : 'payment');
  document.getElementById('rejectModal').classList.add('show');
  document.getElementById('rejectReason').value  = '';
  document.getElementById('rejectDetails').value = '';
}

function closeRejectModal() {
  document.getElementById('rejectModal').classList.remove('show');
  currentRejectTarget = null;
  currentRejectType   = null;
}

async function confirmReject() {
  const reason  = document.getElementById('rejectReason').value;
  const details = document.getElementById('rejectDetails').value.trim();

  if (!reason) { alert('Please select a rejection reason.'); return; }
  if (!currentRejectTarget) { closeRejectModal(); return; }

  const claimEl   = currentRejectTarget.closest('.ci');
  const paymentEl = currentRejectTarget.closest('.pi');
  let itemEl, itemType;

  if (claimEl && claimEl.dataset.claimId)     { itemEl = claimEl;   itemType = 'claim';   }
  else if (paymentEl && paymentEl.dataset.paymentId) { itemEl = paymentEl; itemType = 'payment'; }
  else { alert('Unable to identify item to reject.'); closeRejectModal(); return; }

  const token   = localStorage.getItem('access_token');
  const confirmBtn = document.querySelector('#rejectModal .modal-btn:last-child');
  confirmBtn.textContent = 'Rejecting…';
  confirmBtn.disabled    = true;

  if (token) {
    try {
      const url  = itemType === 'claim'
        ? `/api/claims/${claimEl.dataset.claimId}/reject`
        : `/api/payments/${paymentEl.dataset.paymentId}/reject`;
      const body = itemType === 'claim'
        ? { rejection_category: reason, rejection_detail: details || reason }
        : { rejection_reason: details || reason };

      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || `Failed to reject ${itemType}`); }
    } catch (err) {
      alert(err.message);
      confirmBtn.textContent = 'Confirm Rejection';
      confirmBtn.disabled    = false;
      return;
    }
  }

  // UI update
  if (itemType === 'claim') {
    const acts = itemEl.querySelector('.ci-acts');
    if (acts) acts.innerHTML = '<span class="b op" style="font-size:.7rem;">Rejected</span>';
  } else {
    const badge = itemEl.querySelector('.b');
    if (badge) { badge.className = 'b op'; badge.textContent = 'Rejected'; badge.style.fontSize = '.7rem'; }
    itemEl.dataset.status = 'rejected';
  }

  applyActiveFilter();
  closeRejectModal();
  showToast(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} rejected successfully!`, 0);
  confirmBtn.textContent = 'Confirm Rejection';
  confirmBtn.disabled    = false;
}

/* ════════════════════════════════════════════════════════════
   FILTER / TABS
   ════════════════════════════════════════════════════════════ */
function textOf(el)   { return el ? el.textContent.trim() : ''; }
function currentFilterLabel() {
  const a = document.querySelector('.ftab.on');
  return a ? textOf(a) : 'All';
}

function claimsStatus(item) {
  const b = item.querySelector('.ci-acts .b');
  const v = textOf(b).toLowerCase();
  if (v.includes('progress') || v.includes('review'))  return 'In Progress';
  if (v.includes('resolved') || v.includes('approved') || v.includes('rejected')) return 'Resolved';
  return 'Pending';
}
function schedulesStatus(item) {
  const v = textOf(item.querySelector('.si-right .b')).toLowerCase();
  if (v.includes('completed')) return 'Completed';
  if (v.includes('ongoing'))   return 'Ongoing';
  return 'Pending';
}
function paymentsStatus(item) {
  if (item.querySelector('.pay-actions')) return 'Pending';
  const v = textOf(item.querySelector('.b')).toLowerCase();
  if (v.includes('approved')) return 'Approved';
  if (v.includes('rejected')) return 'Rejected';
  return 'Pending';
}
function residentsStatus(item) {
  const v = textOf(item.querySelector('.b')).toLowerCase();
  if (v.includes('inactive')) return 'Inactive';
  if (v.includes('pending'))  return 'New';
  return 'Active';
}

function applyClaimsFilter(f) {
  document.querySelectorAll('.ci').forEach(i => {
    i.style.display = (f === 'All' || claimsStatus(i) === f) ? '' : 'none';
  });
}
function applySchedulesFilter(f) {
  document.querySelectorAll('.si').forEach(i => {
    i.style.display = (schedulesStatus(i) === f) ? '' : 'none';
  });
}
function applyPaymentsFilter(f) {
  document.querySelectorAll('.pi').forEach(i => {
    i.style.display = (f === 'All' || paymentsStatus(i) === f) ? '' : 'none';
  });
}
function applyResidentsFilter(f) {
  const search = (document.querySelector('.search-inp') || { value: '' }).value.trim().toLowerCase();
  document.querySelectorAll('.ri').forEach(i => {
    const ok = (f === 'All' || residentsStatus(i) === f) && (!search || textOf(i).toLowerCase().includes(search));
    i.style.display = ok ? '' : 'none';
  });
}
function applyActiveFilter() {
  const f = currentFilterLabel();
  if (document.querySelector('.ri')) { applyResidentsFilter(f); return; }
  if (document.querySelector('.pi')) { applyPaymentsFilter(f);  return; }
  if (document.querySelector('.si')) { applySchedulesFilter(f); return; }
  if (document.querySelector('.ci')) { applyClaimsFilter(f); }
}
function filterTab(el) {
  document.querySelectorAll('.ftab').forEach(t => t.classList.remove('on'));
  el.classList.add('on');
  applyActiveFilter();
}

function updateScheduleStatusBoxes() {
  if (!document.querySelector('.schedule-status-ribbon')) return;
  const counts = { Completed: 0, Ongoing: 0, Pending: 0 };
  document.querySelectorAll('.si').forEach(i => {
    const s = schedulesStatus(i);
    if (counts[s] !== undefined) counts[s]++;
  });
  setText('schedCompletedCount', counts.Completed);
  setText('schedOngoingCount',   counts.Ongoing);
  setText('schedPendingCount',   counts.Pending);
}

/* ════════════════════════════════════════════════════════════
   SCHEDULE ROUTE START/COMPLETE (with API call)
   ════════════════════════════════════════════════════════════ */
async function startRoute(btn, badgeId, scheduleId) {
  const badge = document.getElementById(badgeId);
  if (!badge) return;

  const token   = localStorage.getItem('access_token');
  const isStart = badge.textContent.trim().toLowerCase() !== 'ongoing';

  if (scheduleId && token) {
    const status = isStart ? 'ongoing' : 'completed';
    try {
      await fetch(`/api/schedules/${scheduleId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
    } catch (e) { console.warn('Schedule status update failed:', e); }
  }

  if (isStart) {
    badge.className  = 'b go';
    badge.textContent = 'Ongoing';
    btn.textContent  = 'Mark Complete';
    btn.classList.add('go');
    btn.onclick = () => startRoute(btn, badgeId, scheduleId);
  } else {
    badge.className  = 'b ok';
    badge.textContent = 'Completed';
    btn.style.display = 'none';
  }

  updateScheduleStatusBoxes();
  applyActiveFilter();
}

/* ════════════════════════════════════════════════════════════
   SIDEBAR TOGGLE & MOBILE NAV
   ════════════════════════════════════════════════════════════ */
function toggleSb() {
  const sb      = document.querySelector('.sb');
  const overlay = document.getElementById('overlay');
  sb.classList.toggle('open');
  if (overlay) overlay.classList.toggle('open');
  document.body.classList.toggle('sb-open', sb.classList.contains('open'));
}

/* ════════════════════════════════════════════════════════════
   MAP HELPERS & FULLSCREEN
   ════════════════════════════════════════════════════════════ */
function createBinIcon(status) {
  const cls = status === 'active' ? 'active' : 'attention';
  return L.divIcon({
    className: 'leaflet-bin-icon',
    html: `<div class="bin-marker ${cls}">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 7h12l-1 12c0 1.1-.9 2-2 2H9c-1.1 0-2-.9-2-2L6 7z"/>
        <path d="M4 5h16v2H4z"/>
        <path d="M9 5V3h6v2"/>
        <path d="M10 10v6M14 10v6" stroke="rgba(255,255,255,.5)" stroke-width="1" fill="none"/>
      </svg>
    </div>`,
    iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -15]
  });
}

function toggleMapFullscreen() {
  const mapCard    = document.getElementById('mapCard');
  const expandIcon = document.getElementById('expandIcon');
  const collapseIcon = document.getElementById('collapseIcon');
  if (!mapCard) return;
  mapCard.classList.toggle('fullscreen');
  const isFull = mapCard.classList.contains('fullscreen');
  if (expandIcon)   expandIcon.style.display   = isFull ? 'none'  : 'block';
  if (collapseIcon) collapseIcon.style.display  = isFull ? 'block' : 'none';
  document.body.style.overflow = isFull ? 'hidden' : '';
  setTimeout(() => { if (zoneMapInstance) zoneMapInstance.invalidateSize(); }, 300);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const mc = document.getElementById('mapCard');
    if (mc && mc.classList.contains('fullscreen')) toggleMapFullscreen();
    closeRejectModal();
  }
});

/* ════════════════════════════════════════════════════════════
   TOAST
   ════════════════════════════════════════════════════════════ */
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
    ${points ? `<span class="toast-points">+${points} pts</span>` : ''}`;
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => toast.classList.remove('show'), 3500);
}

/* ════════════════════════════════════════════════════════════
   LOADING SKELETON STATE
   ════════════════════════════════════════════════════════════ */
function setLoadingState(loading) {
  const ids = [
    'pendingClaimsCount', 'weekPaymentsCount', 'totalPointsAwarded',
    'nextSchedLabel', 'zoneBannerResidents', 'zoneBannerSchedules', 'zoneBannerRate'
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (loading) {
      el.classList.add('sk-loading');
    } else {
      el.classList.remove('sk-loading');
    }
  });
}

/* ════════════════════════════════════════════════════════════
   PROFILE DROPDOWN & TOPBAR HELPERS
   ════════════════════════════════════════════════════════════ */
function toggleProfileDd(e) {
  e.stopPropagation();
  const dd = document.getElementById('profileDd');
  if (dd) dd.classList.toggle('show');
}

function logout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/logout';
  }
}

function formatClaimCategory(value) {
  if (!value) return 'New claim';
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function toRelativeTime(iso) {
  if (!iso) return 'just now';
  const d    = new Date(iso);
  if (isNaN(d)) return 'recent';
  const diff = Math.max(0, Date.now() - d.getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function toDateTimeLabel(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? '—';
}

/* ── helper page-link getters (used by notifications) ── */
function getProfilePageHref()  { return '/zone-operator/profile'; }
function getClaimsPageHref()   { return '/zone-operator/claims'; }
function getPaymentsPageHref() { return '/zone-operator/payments'; }
function getSchedulesPageHref(){ return '/zone-operator/schedules'; }
function getReportPageHref()   { return '/zone-operator/report'; }

function removeSettingsOptions() {
  document.querySelectorAll('.dd-item').forEach(item => {
    if (textOf(item).toLowerCase() === 'settings') item.remove();
  });
}

function initProfileMenuNavigation() {
  const mobileProfileDd = document.getElementById('profileDd');
  if (!mobileProfileDd) return;
  const items = Array.from(mobileProfileDd.querySelectorAll('.dd-item'));
  const myProfile = items.find(i => textOf(i).toLowerCase() === 'my profile');
  if (myProfile) myProfile.addEventListener('click', e => { e.stopPropagation(); window.location.href = getProfilePageHref(); });
}

function initTopbarProfileDd() {
  const topbarRight = document.querySelector('.tb-r');
  if (!topbarRight) return;

  let dd = document.getElementById('topProfileDd');
  if (!dd) {
    const ini      = textOf(document.querySelector('.sb-av'))  || 'ZO';
    const userName = textOf(document.querySelector('.sb-un'))  || 'Zone Operator';
    const userRole = textOf(document.querySelector('.sb-ur'))  || 'Zone Operator';

    dd = document.createElement('div');
    dd.id = 'topProfileDd';
    dd.className = 'tb-profile-dd';
    dd.innerHTML = `
      <div class="dd-user">
        <div class="dd-user-av">${ini}</div>
        <div class="dd-user-name" id="topProfileName">${userName}</div>
        <div class="dd-user-role" id="topProfileRole">${userRole}</div>
      </div>
      <div class="dd-item" id="topProfileItem">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        My Profile
      </div>
      <div class="dd-item dd-logout" id="topLogoutItem">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Logout
      </div>`;
    topbarRight.appendChild(dd);

    dd.querySelector('#topLogoutItem').addEventListener('click', e => { e.stopPropagation(); logout(); });
    dd.querySelector('#topProfileItem').addEventListener('click', e => {
      e.stopPropagation(); dd.classList.remove('show'); window.location.href = getProfilePageHref();
    });
  }

  const avatarBtn = topbarRight.querySelector('.av');
  if (avatarBtn) {
    avatarBtn.classList.add('tb-profile-trigger');
    avatarBtn.addEventListener('click', e => {
      e.stopPropagation();
      const notifDd = document.getElementById('topNotifDd');
      if (notifDd) notifDd.classList.remove('show');
      dd.classList.toggle('show');
    });
  }
}

function initTopbarNotifications() {
  const topbarRight = document.querySelector('.tb-r');
  if (!topbarRight) return;
  const bellBtn = topbarRight.querySelector('.icon-btn');
  if (!bellBtn)  return;

  let dd = document.getElementById('topNotifDd');
  if (!dd) {
    dd = document.createElement('div');
    dd.id = 'topNotifDd';
    dd.className = 'tb-notif-dd';
    dd.innerHTML = `
      <div class="tb-notif-head">
        <span>Notifications</span>
        <span class="tb-notif-count" id="topNotifCount">0</span>
      </div>
      <div class="tb-notif-list" id="topNotifList">
        <div class="tb-notif-empty">Loading…</div>
      </div>`;
    topbarRight.appendChild(dd);
  }

  const dot     = bellBtn.querySelector('.notif-dot');
  const listEl  = dd.querySelector('#topNotifList');
  const countEl = dd.querySelector('#topNotifCount');

  function renderNotifs(items) {
    if (!listEl) return;
    if (!items.length) {
      listEl.innerHTML = '<div class="tb-notif-empty">No new alerts right now.</div>';
      if (countEl) countEl.textContent = '0';
      if (dot)     dot.style.display = 'none';
      return;
    }
    listEl.innerHTML = items.map(n => `
      <a class="tb-notif-item" href="${n.href}">
        <div class="tb-notif-title">${n.title}</div>
        <div class="tb-notif-meta">${n.meta}</div>
      </a>`).join('');
    if (countEl) countEl.textContent = String(items.length);
    if (dot)     dot.style.display = '';
  }

  function buildNotifsFromState() {
    const claimAlerts = _dashData.claims
      .filter(c => c.status === 'open' || c.status === 'under_review')
      .slice(0, 5)
      .map(c => ({
        title: `${formatClaimCategory(c.claim_category)} claim`,
        meta:  `${c.status === 'under_review' ? 'Under review' : 'Pending'} · ${toRelativeTime(c.reported_at)}`,
        href:  getClaimsPageHref(),
        ts:    c.reported_at ? new Date(c.reported_at).getTime() : 0
      }));

    const payAlerts = _dashData.payments
      .filter(p => p.status === 'pending')
      .slice(0, 4)
      .map(p => ({
        title: `Payment pending`,
        meta:  `${p.resident_name || 'Resident'} · ${(p.amount || 0).toLocaleString()} ${p.currency || 'RWF'} · ${toRelativeTime(p.submitted_at)}`,
        href:  getPaymentsPageHref(),
        ts:    p.submitted_at ? new Date(p.submitted_at).getTime() : 0
      }));

    const schedAlerts = _dashData.schedules
      .filter(s => s.status === 'not_started')
      .slice(0, 3)
      .map(s => ({
        title: `Upcoming schedule`,
        meta:  `${toDateTimeLabel(s.date_time_start)} · Priority ${Number(s.priority_score || 0).toFixed(1)}`,
        href:  getSchedulesPageHref(),
        ts:    s.date_time_start ? new Date(s.date_time_start).getTime() : 0
      }));

    const all = [...claimAlerts, ...payAlerts, ...schedAlerts]
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 10);

    renderNotifs(all);
  }

  bellBtn.addEventListener('click', e => {
    e.stopPropagation();
    const profileDd = document.getElementById('topProfileDd');
    if (profileDd) profileDd.classList.remove('show');
    dd.classList.toggle('show');
    if (dd.classList.contains('show')) buildNotifsFromState();
  });

  // Build once data is loaded (called again after loadAllData)
  setTimeout(buildNotifsFromState, 1500);
}

document.addEventListener('click', () => {
  ['profileDd', 'topProfileDd', 'topNotifDd'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });
});

/* ════════════════════════════════════════════════════════════
   WEEKLY REPORT SEND
   ════════════════════════════════════════════════════════════ */
const sendReportBtn = document.getElementById('sendReportBtn');
if (sendReportBtn) {
  const today    = new Date();
  const lastWeek = new Date(today); lastWeek.setDate(today.getDate() - 7);
  const fromInput   = document.getElementById('fromDate');
  const toInput     = document.getElementById('toDate');
  const remarksInp  = document.getElementById('remarksInput');
  const remarkSugg  = document.getElementById('remarkSuggestion');

  if (fromInput && toInput) {
    fromInput.value = lastWeek.toISOString().split('T')[0];
    toInput.value   = today.toISOString().split('T')[0];
  }
  if (remarkSugg && remarksInp) {
    remarkSugg.addEventListener('change', () => {
      const v = remarkSugg.value;
      if (!v) return;
      remarksInp.value = remarksInp.value.trim() ? `${remarksInp.value.trim()}\n${v}` : v;
      remarksInp.focus();
      remarkSugg.value = '';
    });
  }

  sendReportBtn.addEventListener('click', async () => {
    const from    = fromInput?.value || '';
    const to      = toInput?.value   || '';
    if (!from || !to) { alert('Please select both From Date and To Date'); return; }
    if (new Date(from) > new Date(to)) { alert('From Date cannot be after To Date'); return; }

    sendReportBtn.disabled    = true;
    sendReportBtn.textContent = 'Sending…';

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
        body: JSON.stringify({ from_date: from, to_date: to, remarks: remarksInp?.value.trim() || '' })
      });
      if (res.ok) {
        sendReportBtn.textContent = 'Report Sent ✓';
        sendReportBtn.style.background = 'var(--g1)';
        if (remarksInp) remarksInp.value = '';
        setTimeout(() => {
          sendReportBtn.textContent = 'Send Report';
          sendReportBtn.style.background = '';
          sendReportBtn.disabled = false;
        }, 3000);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to send report');
        sendReportBtn.textContent = 'Send Report';
        sendReportBtn.disabled    = false;
      }
    } catch (e) {
      alert('Error sending report. Please try again.');
      sendReportBtn.textContent = 'Send Report';
      sendReportBtn.disabled    = false;
    }
  });
}

/* ════════════════════════════════════════════════════════════
   STATIC EVENT WIRING (claims/payments fallback, search, mobile nav)
   ════════════════════════════════════════════════════════════ */
function wireStaticEventListeners() {
  // Quick notes suggestion
  const qns = document.getElementById('quickNoteSuggestion');
  const qni = document.getElementById('quickNotesInput');
  if (qns && qni) {
    qns.addEventListener('change', () => {
      const v = qns.value; if (!v) return;
      qni.value = qni.value.trim() ? `${qni.value.trim()}\n${v}` : v;
      qni.focus(); qns.value = '';
    });
  }

  // Residents search
  const searchInp = document.querySelector('.search-inp');
  if (searchInp && document.querySelector('.ri')) {
    searchInp.addEventListener('input', applyActiveFilter);
  }

  // Mobile nav active highlight
  const currentPage = window.location.pathname.split('/').pop();
  if (currentPage) {
    document.querySelectorAll('.mob-nav a.mn-item').forEach(link => {
      const linkPage = (link.getAttribute('href') || '').split('/').pop();
      link.classList.toggle('active', linkPage === currentPage);
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

  if (document.querySelector('.ftabs')) applyActiveFilter();
  updateScheduleStatusBoxes();
}
