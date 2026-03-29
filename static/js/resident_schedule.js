// ── resident_schedule.js ──

document.addEventListener('DOMContentLoaded', function () {

  // ── Sidebar toggle (mobile) ──
  var menuBtn = document.getElementById('menuBtn');
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  var logoutBtn = document.getElementById('logoutBtn');

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  }

  if (menuBtn && sidebar && overlay) {
    menuBtn.addEventListener('click', function () {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
    });
  }
  if (overlay) overlay.addEventListener('click', closeSidebar);

  // ── Logout ──
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    });
  }

  // ── User info ──
  var name = localStorage.getItem('userName') || 'Resident';
  var sidebarName = document.getElementById('sidebarName');
  var sidebarAvatar = document.getElementById('sidebarAvatar');

  if (sidebarName) sidebarName.textContent = name;
  if (sidebarAvatar) {
    var initials = name.split(' ').map(function (n) { return n[0]; }).join('').toUpperCase();
    sidebarAvatar.textContent = initials;
  }

  // ── Status maps ──
  var statusBadgeClass = {
    not_started: 'upcoming',
    ongoing: 'ongoing',
    completed: 'completed'
  };
  var statusLabel = {
    not_started: 'Upcoming',
    ongoing: 'Ongoing',
    completed: 'Completed'
  };

  var token = localStorage.getItem('access_token');
  var scheduleList = document.getElementById('scheduleList');
  var tabs = document.querySelectorAll('.tabs .tab[data-filter]');
  var allSchedules = [];

  // ── Load schedules from API ──
  async function loadSchedules() {
    if (!scheduleList) return;
    try {
      var user = JSON.parse(localStorage.getItem('user') || '{}');
      var url = '/api/schedules';
      if (user.zone_id) url += '?zone_id=' + user.zone_id;

      var res = await fetch(url, {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!res.ok) {
        scheduleList.innerHTML = '<p class="card__sub" style="padding:12px;">Failed to load schedules.</p>';
        return;
      }
      allSchedules = await res.json();
      renderSchedules('all');
    } catch (err) {
      scheduleList.innerHTML = '<p class="card__sub" style="padding:12px;">Network error loading schedules.</p>';
    }
  }

  function renderSchedules(filter) {
    if (!scheduleList) return;
    scheduleList.innerHTML = '';

    var filtered = filter === 'all'
      ? allSchedules
      : allSchedules.filter(function (s) { return s.status === filter; });

    if (filtered.length === 0) {
      scheduleList.innerHTML = '<p class="card__sub" style="padding:12px;">No schedules match this filter.</p>';
      return;
    }

    filtered.forEach(function (schedule) {
      var start = new Date(schedule.date_time_start);
      var end = new Date(schedule.date_time_end);

      var dateStr = start.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
      });
      var timeStr = start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) +
        ' — ' + end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      var badgeClass = statusBadgeClass[schedule.status] || 'upcoming';
      var badgeText = statusLabel[schedule.status] || schedule.status;

      var card = document.createElement('div');
      card.className = 'card';
      card.setAttribute('data-status', schedule.status);

      card.innerHTML = '<div class="card__row"><div>' +
        '<div class="card__title">' + dateStr + '</div>' +
        '<div class="card__sub">' + timeStr + '</div>' +
        '<div class="card__sub" style="margin-top:6px;">Schedule #' + schedule.id + '</div>' +
        '</div><span class="badge badge--' + badgeClass + '">' + badgeText + '</span></div>';

      scheduleList.appendChild(card);
    });
  }

  // ── Tab filtering ──
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      renderSchedules(tab.getAttribute('data-filter'));
    });
  });

  // ── Load on page load ──
  loadSchedules();

});
