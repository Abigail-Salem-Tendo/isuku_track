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
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
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

  // ── Loyalty Points Progress ──
  function updateLoyaltyProgress(currentPoints, targetPoints = 100) {
    const percentage = Math.min((currentPoints / targetPoints) * 100, 100);
    const remaining = Math.max(targetPoints - currentPoints, 0);

    document.getElementById('loyaltyPoints').textContent = currentPoints;
    document.getElementById('loyaltyTarget').textContent = targetPoints;
    document.getElementById('loyaltyProgressFill').style.width = percentage + '%';
    document.getElementById('loyaltyRemaining').textContent = remaining;

    // Update label text based on progress
    const labelEl = document.querySelector('.loyalty-progress__label');
    if (remaining === 0) {
      labelEl.textContent = 'Reward unlocked! 🎉';
    } else {
      labelEl.innerHTML = '<span id="loyaltyRemaining">' + remaining + '</span> pts to next reward';
    }
  }

  // ── Load resident data from backend ──
  async function loadResidentData() {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.error('No access token found');
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const user = data.user;

        // Update name
        document.getElementById('welcomeName').textContent = user.username;
        document.getElementById('sidebarName').textContent = user.username;

        // Update avatar initials
        const initials = user.username.split(' ').map(n => n[0]).join('').toUpperCase();
        document.getElementById('sidebarAvatar').textContent = initials;

        // Store username for future use
        localStorage.setItem('userName', user.username);

        // Update loyalty points
        updateLoyaltyProgress(user.loyalty_points || 0, 100);

        // Update zone info if available
        if (user.zone) {
          document.getElementById('zoneName').textContent = user.zone.name;
          document.getElementById('zoneGeo').textContent =
            `${user.zone.district} · ${user.zone.sector} · ${user.zone.cell} · ${user.zone.village}`;
          document.getElementById('sidebarRole').textContent = `${user.zone.name} Resident`;

          // Update zone operator info if available
          if (user.zone.zone_operator) {
            document.getElementById('zoName').textContent = user.zone.zone_operator.name;
            document.getElementById('zoPhone').textContent = user.zone.zone_operator.phone;
          } else {
            document.getElementById('zoName').textContent = 'Not assigned';
            document.getElementById('zoPhone').textContent = '—';
          }
        } else {
          document.getElementById('zoneName').textContent = 'No zone assigned';
          document.getElementById('zoneGeo').textContent = '';
          document.getElementById('sidebarRole').textContent = 'Resident';
        }
      } else if (response.status === 401) {
        // Token expired or invalid, redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else {
        console.error('Failed to load resident data:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading resident data:', error);
    }
  }

  // Load resident data on page load
  loadResidentData();

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
      const loc = document.getElementById('claimLocation');
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