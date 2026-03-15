document.addEventListener('DOMContentLoaded', function () {

  // ── Sidebar toggle (mobile) ──
  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const logoutBtn = document.getElementById('logoutBtn');

  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
    });
  }
  if (overlay) {
    overlay.addEventListener('click', function () {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  }
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userRole');
      window.location.href = '/static/pages/login.html';
    });
  }

  // ── User info from localStorage ──
  const name = localStorage.getItem('userName') || 'Resident';
  document.getElementById('welcomeName').textContent = name;
  document.getElementById('sidebarName').textContent = name;
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
  document.getElementById('sidebarAvatar').textContent = initials;

  // ── Greeting ──
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'GOOD MORNING' : hour < 17 ? 'GOOD AFTERNOON' : 'GOOD EVENING';
  document.getElementById('greeting').textContent = greeting;

  // ── Today's date ──
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  document.getElementById('todayDate').textContent = today;

  // ── Load zone info from backend ──
  // TODO: replace with real fetch when backend is ready
  // fetch('/api/resident/profile', { headers: { Authorization: 'Bearer ' + localStorage.getItem('authToken') } })
  //   .then(r => r.json())
  //   .then(data => {
  //     document.getElementById('zoneName').textContent = data.zone.name;
  //     document.getElementById('zoneGeo').textContent = data.zone.district + ' · ' + data.zone.sector + ' · ' + data.zone.cell + ' · ' + data.zone.village;
  //     document.getElementById('sidebarRole').textContent = data.zone.name + ' Resident';
  //     document.getElementById('zoName').textContent = data.zone.operator_name;
  //     document.getElementById('zoPhone').textContent = data.zone.operator_phone;
  //   });

  // ── Load next schedule from backend ──
  // TODO: replace with real fetch when backend is ready
  // fetch('/api/schedules/next', { headers: { Authorization: 'Bearer ' + localStorage.getItem('authToken') } })
  //   .then(r => r.json())
  //   .then(data => {
  //     document.getElementById('collectionDetail').textContent = data.route_description + ' · Vehicle ' + data.vehicle_plate;
  //   });

  // ── Quick claim form validation ──
  const form = document.getElementById('quickClaimForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      let valid = true;

      const type = document.getElementById('claimType');
      const loc  = document.getElementById('claimLocation');
      const desc = document.getElementById('claimDesc');

      if (!type.value) {
        type.classList.add('error');
        document.getElementById('claimTypeError').classList.add('visible');
        valid = false;
      } else {
        type.classList.remove('error');
        document.getElementById('claimTypeError').classList.remove('visible');
      }

      if (!loc.value.trim()) {
        loc.classList.add('error');
        document.getElementById('claimLocationError').classList.add('visible');
        valid = false;
      } else {
        loc.classList.remove('error');
        document.getElementById('claimLocationError').classList.remove('visible');
      }

      if (!desc.value.trim()) {
        desc.classList.add('error');
        document.getElementById('claimDescError').classList.add('visible');
        valid = false;
      } else {
        desc.classList.remove('error');
        document.getElementById('claimDescError').classList.remove('visible');
      }

      if (valid) {
        // TODO: fetch('/api/claims', { method: 'POST', ... })
        alert('Claim submitted successfully!');
        form.reset();
      }
    });
  }

});