// ── resident-schedule.js ──

document.addEventListener('DOMContentLoaded', function () {

  // Set user info from localStorage
  const name = localStorage.getItem('userName');
  if (name) {
    document.getElementById('userName').textContent = name;
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    document.getElementById('userAvatar').textContent = initials;
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