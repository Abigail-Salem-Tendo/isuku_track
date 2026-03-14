// ── resident-dashboard.js ──

document.addEventListener('DOMContentLoaded', function () {

  // TODO: replace fake data with fetch() calls when backend is ready

  // Greet user by name from localStorage
  const name = localStorage.getItem('userName');
  if (name) {
    document.getElementById('greetingName').textContent = name;
    document.getElementById('userName').textContent     = name;

    // Set avatar initials
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    document.getElementById('userAvatar').textContent = initials;
  }

  // Fake stats — replace with fetch('/api/resident/stats')
  document.getElementById('loyaltyPoints').textContent  = '45 pts';
  document.getElementById('openClaims').textContent     = '2';
  document.getElementById('pendingPayments').textContent = '1';

});