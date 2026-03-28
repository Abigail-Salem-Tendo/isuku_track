// ── resident-schedule.js ──

document.addEventListener('DOMContentLoaded', function () {

  // ── Sidebar toggle (mobile) ──
  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const logoutBtn = document.getElementById('logoutBtn');

  function closeSidebar() {
    if (sidebar) {
      sidebar.classList.remove('open');
    }
    if (overlay) {
      overlay.classList.remove('open');
    }
  }

  if (menuBtn && sidebar && overlay) {
    menuBtn.addEventListener('click', function () {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', closeSidebar);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    });
  }

  // Set user info from localStorage
  const name = localStorage.getItem('userName') || 'Resident';
  const sidebarName = document.getElementById('sidebarName');
  const sidebarAvatar = document.getElementById('sidebarAvatar');

  if (sidebarName) {
    sidebarName.textContent = name;
  }

  if (sidebarAvatar) {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    sidebarAvatar.textContent = initials;
  }

  // ── Filter tabs ──
  const tabs  = document.querySelectorAll('.tab');
  const cards = document.querySelectorAll('#scheduleList .card');

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {

      // Set active tab
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const filter = tab.getAttribute('data-filter');

      // Show or hide cards based on filter
      cards.forEach(function (card) {
        if (filter === 'all' || card.getAttribute('data-status') === filter) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // TODO: replace fake cards with fetch('/api/schedules') when backend is ready

});