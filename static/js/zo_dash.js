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

/* ── Weekly report send (manual with date range) ── */
const sendReportBtn = document.getElementById('sendReportBtn');
if (sendReportBtn) {
  // Set default dates (last 7 days)
  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);

  const fromDateInput = document.getElementById('fromDate');
  const toDateInput = document.getElementById('toDate');
  const remarksInput = document.getElementById('remarksInput');
  const remarkSuggestion = document.getElementById('remarkSuggestion');

  if (fromDateInput && toDateInput) {
    fromDateInput.value = lastWeek.toISOString().split('T')[0];
    toDateInput.value = today.toISOString().split('T')[0];
  }

  if (remarkSuggestion && remarksInput) {
    remarkSuggestion.addEventListener('change', () => {
      const suggestion = remarkSuggestion.value;
      if (!suggestion) return;

      if (remarksInput.value.trim()) {
        remarksInput.value = `${remarksInput.value.trim()}\n${suggestion}`;
      } else {
        remarksInput.value = suggestion;
      }

      remarksInput.focus();
      remarkSuggestion.value = '';
    });
  }

  sendReportBtn.addEventListener('click', async () => {
    const fromDate = fromDateInput ? fromDateInput.value : '';
    const toDate = toDateInput ? toDateInput.value : '';

    // Validate dates
    if (!fromDate || !toDate) {
      alert('Please select both From Date and To Date');
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      alert('From Date cannot be after To Date');
      return;
    }

    // Get remarks
    const remarks = remarksInput ? remarksInput.value.trim() : '';

    // Prepare payload
    const payload = {
      from_date: fromDate,
      to_date: toDate,
      remarks: remarks
    };

    // Update button state
    sendReportBtn.disabled = true;
    sendReportBtn.textContent = 'Sending...';

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        sendReportBtn.textContent = 'Report Sent ✓';
        sendReportBtn.style.background = 'var(--g1)';
        // Clear textarea
        if (remarksInput) remarksInput.value = '';
        setTimeout(() => {
          sendReportBtn.textContent = 'Send Report';
          sendReportBtn.style.background = '';
          sendReportBtn.disabled = false;
        }, 3000);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to send report');
        sendReportBtn.textContent = 'Send Report';
        sendReportBtn.disabled = false;
      }
    } catch (err) {
      console.error('Error sending report:', err);
      alert('Error sending report. Please try again.');
      sendReportBtn.textContent = 'Send Report';
      sendReportBtn.disabled = false;
    }
  });
}

// Dashboard quick-notes suggestions
const quickNoteSuggestion = document.getElementById('quickNoteSuggestion');
const quickNotesInput = document.getElementById('quickNotesInput');
if (quickNoteSuggestion && quickNotesInput) {
  quickNoteSuggestion.addEventListener('change', () => {
    const suggestion = quickNoteSuggestion.value;
    if (!suggestion) return;

    if (quickNotesInput.value.trim()) {
      quickNotesInput.value = `${quickNotesInput.value.trim()}\n${suggestion}`;
    } else {
      quickNotesInput.value = suggestion;
    }

    quickNotesInput.focus();
    quickNoteSuggestion.value = '';
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

function getProfilePageHref() {
  const path = window.location.pathname || '';
  if (path.indexOf('/templates/zone_operator/') !== -1) return 'zo_profile.html';
  return '/templates/zone_operator/zo_profile.html';
}

function getClaimsPageHref() {
  const path = window.location.pathname || '';
  if (path.indexOf('/templates/zone_operator/') !== -1) return 'zo_claims.html';
  return '/templates/zone_operator/zo_claims.html';
}

function getPaymentsPageHref() {
  const path = window.location.pathname || '';
  if (path.indexOf('/templates/zone_operator/') !== -1) return 'zo_payments.html';
  return '/templates/zone_operator/zo_payments.html';
}

function getSchedulesPageHref() {
  const path = window.location.pathname || '';
  if (path.indexOf('/templates/zone_operator/') !== -1) return 'zo_schedules.html';
  return '/templates/zone_operator/zo_schedules.html';
}

function getReportPageHref() {
  const path = window.location.pathname || '';
  if (path.indexOf('/templates/zone_operator/') !== -1) return 'zo_report.html';
  return '/templates/zone_operator/zo_report.html';
}

function formatClaimCategory(value) {
  if (!value) return 'New claim';
  const clean = String(value).replace(/_/g, ' ').trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function toRelativeTime(iso) {
  if (!iso) return 'just now';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'recent';

  const diff = Math.max(0, Date.now() - d.getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function toDateTimeLabel(iso) {
  if (!iso) return 'upcoming';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'upcoming';
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function removeSettingsOptions() {
  document.querySelectorAll('.dd-item').forEach(item => {
    if (textOf(item).toLowerCase() === 'settings') {
      item.remove();
    }
  });
}

function initProfileMenuNavigation() {
  const profileHref = getProfilePageHref();

  const mobileProfileDd = document.getElementById('profileDd');
  if (mobileProfileDd) {
    const items = Array.from(mobileProfileDd.querySelectorAll('.dd-item'));
    const myProfileItem = items.find(item => textOf(item).toLowerCase() === 'my profile');
    if (myProfileItem) {
      myProfileItem.addEventListener('click', function(e) {
        e.stopPropagation();
        window.location.href = profileHref;
      });
    }
  }
}

function initTopbarProfileDd() {
  const topbarRight = document.querySelector('.tb-r');
  if (!topbarRight) return;

  let dd = document.getElementById('topProfileDd');
  if (!dd) {
    const userInitials = textOf(document.querySelector('.sb-av')) || 'JP';
    const userName = textOf(document.querySelector('.sb-un')) || 'Zone Operator';
    const userRole = textOf(document.querySelector('.sb-ur')) || 'Kimironko Zone A';

    dd = document.createElement('div');
    dd.id = 'topProfileDd';
    dd.className = 'tb-profile-dd';
    dd.innerHTML = `
      <div class="dd-user">
        <div class="dd-user-av">${userInitials}</div>
        <div class="dd-user-name">${userName}</div>
        <div class="dd-user-role">${userRole}</div>
      </div>
      <div class="dd-item" id="topProfileItem">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        My Profile
      </div>
      <div class="dd-item dd-logout" id="topLogoutItem">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Logout
      </div>
    `;
    topbarRight.appendChild(dd);

    const logoutBtn = dd.querySelector('#topLogoutItem');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        logout();
      });
    }

    const profileBtn = dd.querySelector('#topProfileItem');
    if (profileBtn) {
      profileBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        dd.classList.remove('show');
        window.location.href = getProfilePageHref();
      });
    }
  }

  const avatarBtn = topbarRight.querySelector('.av');
  if (avatarBtn) {
    avatarBtn.classList.add('tb-profile-trigger');
    avatarBtn.addEventListener('click', function(e) {
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
  if (!bellBtn) return;

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
        <div class="tb-notif-empty">Loading notifications...</div>
      </div>
    `;
    topbarRight.appendChild(dd);
  }

  const dot = bellBtn.querySelector('.notif-dot');
  const listEl = dd.querySelector('#topNotifList');
  const countEl = dd.querySelector('#topNotifCount');

  function renderNotifications(items) {
    if (!listEl || !countEl) return;

    if (!items.length) {
      listEl.innerHTML = '<div class="tb-notif-empty">No new alerts right now.</div>';
      countEl.textContent = '0';
      if (dot) dot.style.display = 'none';
      return;
    }

    listEl.innerHTML = items.map(item => `
      <a class="tb-notif-item" href="${item.href}">
        <div class="tb-notif-title">${item.title}</div>
        <div class="tb-notif-meta">${item.meta}</div>
      </a>
    `).join('');

    countEl.textContent = String(items.length);
    if (dot) dot.style.display = '';
  }

  async function loadNotifications() {
    const token = localStorage.getItem('access_token');
    if (!token) {
      renderNotifications([]);
      return;
    }

    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const currentUserRaw = localStorage.getItem('user');
      let currentUserId = null;
      try {
        const parsedUser = currentUserRaw ? JSON.parse(currentUserRaw) : null;
        currentUserId = parsedUser && parsedUser.id ? Number(parsedUser.id) : null;
      } catch (e) {
        currentUserId = null;
      }

      const [claimsRes, paymentsRes, schedulesRes] = await Promise.all([
        fetch('/api/claims?type=claim', { headers }),
        fetch('/api/payments', { headers }),
        fetch('/api/schedules', { headers })
      ]);

      const claims = claimsRes.ok ? await claimsRes.json() : [];
      const payments = paymentsRes.ok ? await paymentsRes.json() : [];
      const schedules = schedulesRes.ok ? await schedulesRes.json() : [];

      const claimAlerts = (Array.isArray(claims) ? claims : [])
        .filter(c => c.type === 'claim')
        .slice(0, 8)
        .map(c => ({
          title: `${formatClaimCategory(c.claim_category)} claim`,
          meta: `${c.status === 'open' ? 'Pending review' : c.status === 'under_review' ? 'Under review' : c.status} · ${toRelativeTime(c.reported_at)}`,
          href: getClaimsPageHref(),
          ts: c.reported_at ? new Date(c.reported_at).getTime() : 0
        }));

      const paymentAlerts = (Array.isArray(payments) ? payments : [])
        .slice(0, 8)
        .map(p => ({
          title: `Payment ${p.status || 'update'}`,
          meta: `${p.resident_name || 'Resident'} · ${(p.amount || 0).toLocaleString()} ${p.currency || 'RWF'} · ${toRelativeTime(p.submitted_at || p.updated_at)}`,
          href: getPaymentsPageHref(),
          ts: p.submitted_at ? new Date(p.submitted_at).getTime() : (p.updated_at ? new Date(p.updated_at).getTime() : 0)
        }));

      const scheduleAlerts = (Array.isArray(schedules) ? schedules : [])
        .filter(s => !currentUserId || Number(s.zone_operator_id) === currentUserId)
        .slice(0, 8)
        .map(s => ({
          title: `Schedule ${s.status || 'update'}`,
          meta: `${toDateTimeLabel(s.date_time_start)} - ${toDateTimeLabel(s.date_time_end)} · Priority ${Number(s.priority_score || 0).toFixed(1)}`,
          href: getSchedulesPageHref(),
          ts: s.date_time_start ? new Date(s.date_time_start).getTime() : 0
        }));

      const reportReminder = [{
        title: 'Weekly report reminder',
        meta: 'Send your latest zone report',
        href: getReportPageHref(),
        ts: Date.now() - 30000
      }];

      const alerts = [...claimAlerts, ...paymentAlerts, ...scheduleAlerts, ...reportReminder]
        .sort((a, b) => (b.ts || 0) - (a.ts || 0))
        .slice(0, 12);

      renderNotifications(alerts);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      renderNotifications([]);
    }
  }

  bellBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    const profileDd = document.getElementById('topProfileDd');
    if (profileDd) profileDd.classList.remove('show');
    dd.classList.toggle('show');
    if (dd.classList.contains('show')) {
      loadNotifications();
    }
  });

  loadNotifications();
}

removeSettingsOptions();
initProfileMenuNavigation();
initTopbarProfileDd();
initTopbarNotifications();

document.addEventListener('click', function() {
  const dd = document.getElementById('profileDd');
  if (dd) dd.classList.remove('show');

  const topDd = document.getElementById('topProfileDd');
  if (topDd) topDd.classList.remove('show');

  const topNotifDd = document.getElementById('topNotifDd');
  if (topNotifDd) topNotifDd.classList.remove('show');
});

/* ── Logout ── */
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    window.location.href = '/logout';
  }
}

/* ── Rejection Modal ── */
let currentRejectTarget = null;
let currentRejectType = null; // 'claim' or 'payment'
let zoneMapInstance = null; // Store map instance for fullscreen resize

function openRejectModal(targetElement, type) {
  currentRejectTarget = targetElement;
  // Auto-detect type if not provided
  if (type) {
    currentRejectType = type;
  } else if (targetElement.closest('.ci')) {
    currentRejectType = 'claim';
  } else if (targetElement.closest('.pi')) {
    currentRejectType = 'payment';
  } else {
    currentRejectType = 'claim'; // default
  }
  document.getElementById('rejectModal').classList.add('show');
  document.getElementById('rejectReason').value = '';
  document.getElementById('rejectDetails').value = '';
}

function closeRejectModal() {
  document.getElementById('rejectModal').classList.remove('show');
  currentRejectTarget = null;
  currentRejectType = null;
}

async function confirmReject() {
  const reason = document.getElementById('rejectReason').value;
  const details = document.getElementById('rejectDetails').value.trim();

  if (!reason) {
    alert('Please select a rejection reason.');
    return;
  }

  if (!currentRejectTarget) {
    closeRejectModal();
    return;
  }

  // Determine if this is a claim or payment rejection
  const claimElement = currentRejectTarget.closest('.ci');
  const paymentElement = currentRejectTarget.closest('.pi');
  
  let itemElement, itemType;

  if (claimElement && claimElement.dataset.claimId) {
    itemElement = claimElement;
    itemType = 'claim';
  } else if (paymentElement && paymentElement.dataset.paymentId) {
    itemElement = paymentElement;
    itemType = 'payment';
  } else {
    alert('Unable to identify item to reject.');
    closeRejectModal();
    return;
  }

  const token = localStorage.getItem('access_token');
  
  // Show loading state on the button
  const confirmBtn = document.querySelector('#rejectModal .modal-btn:last-child');
  const originalText = confirmBtn.textContent;
  confirmBtn.textContent = 'Rejecting...';
  confirmBtn.disabled = true;

  // Try API call if token exists
  if (token) {
    let apiUrl, requestBody;
    
    if (itemType === 'claim') {
      const claimId = claimElement.dataset.claimId;
      apiUrl = `/api/claims/${claimId}/reject`;
      requestBody = {
        rejection_category: reason,
        rejection_detail: details || reason
      };
    } else {
      const paymentId = paymentElement.dataset.paymentId;
      apiUrl = `/api/payments/${paymentId}/reject`;
      requestBody = {
        rejection_reason: details || reason
      };
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to reject ${itemType}`);
      }
    } catch (error) {
      console.error('Rejection API failed:', error);
      alert(error.message || `Failed to reject ${itemType}. Please try again.`);
      confirmBtn.textContent = originalText;
      confirmBtn.disabled = false;
      return;
    }
  }

  // Update UI
  if (itemType === 'claim') {
    const actsEl = itemElement.querySelector('.ci-acts');
    if (actsEl) {
      actsEl.innerHTML = '<span class="b op" style="font-size:.7rem;">Rejected</span>';
    }
    
    if (typeof updateClaimsCounts === 'function') {
      updateClaimsCounts();
    }
  } else {
    const statusSpan = itemElement.querySelector('.b');
    if (statusSpan) {
      statusSpan.className = 'b op';
      statusSpan.textContent = 'Rejected';
      statusSpan.style.fontSize = '.7rem';
    }
    itemElement.dataset.status = 'rejected';
  }

  if (typeof applyActiveFilter === 'function') {
    applyActiveFilter();
  }

  closeRejectModal();
  
  if (typeof showToast === 'function') {
    showToast(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} rejected successfully!`, 0);
  }

  confirmBtn.textContent = originalText;
  confirmBtn.disabled = false;
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

  const residentsWithClaimsEl = document.getElementById('residentsWithClaims');
  if (residentsWithClaimsEl) {
    const claimsCount = residents.filter(r => r.hasClaim).length;
    residentsWithClaimsEl.textContent = String(claimsCount);
  }

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
}