// resident_profile.js

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
      localStorage.removeItem('userName');
      window.location.href = '/login';
    });
  }

  // ── Load profile from backend ──
  async function loadProfile() {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.error('No access token found');
        window.location.href = '/login';
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

        // Populate form fields
        document.getElementById('fullName').value = user.username || '';
        document.getElementById('email').value = user.email || '';
        document.getElementById('phone').value = user.phone_number || '';

        // Set profile display info
        document.getElementById('profileName').textContent = user.username;
        document.getElementById('profilePoints').textContent = `${user.loyalty_points || 0} pts`;

        // Set avatar initials
        const initials = user.username.split(' ').map(n => n[0]).join('').toUpperCase();
        document.getElementById('profileAvatar').textContent = initials;
        document.getElementById('sidebarAvatar').textContent = initials;
        document.getElementById('sidebarName').textContent = user.username;

        // Set zone info
        if (user.zone) {
          document.getElementById('profileZone').textContent = user.zone.name;
          document.getElementById('sidebarRole').textContent = `${user.zone.name} Resident`;
          // Store current zone_id for form submission
          window.currentZoneId = user.zone.id;
        } else {
          document.getElementById('profileZone').textContent = 'No zone assigned';
          document.getElementById('sidebarRole').textContent = 'Resident';
        }

      } else if (response.status === 401) {
        // Token expired, redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else {
        console.error('Failed to load profile:', response.statusText);
        alert('Failed to load profile. Please try again.');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      alert('Error loading profile. Please try again.');
    }
  }

  // ── Load zones for dropdown ──
  async function loadZones() {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/zones', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const zones = await response.json();
        const zoneSelect = document.getElementById('zone');

        // Clear existing options
        zoneSelect.innerHTML = '<option value="">— Select a zone —</option>';

        // Populate zones
        zones.forEach(zone => {
          const option = document.createElement('option');
          option.value = zone.id;
          option.textContent = `${zone.name} (${zone.district}, ${zone.sector})`;
          zoneSelect.appendChild(option);
        });

        // Set the current zone as selected
        if (window.currentZoneId) {
          zoneSelect.value = window.currentZoneId;
        }
      } else {
        console.error('Failed to load zones:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading zones:', error);
    }
  }

  // Load profile and zones on page load
  loadProfile().then(() => loadZones());

  // ── Password toggles ──
  document.querySelectorAll('.toggle-password').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const input = document.getElementById(btn.getAttribute('data-target'));
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      btn.textContent = isHidden ? 'Hide' : 'Show';
    });
  });

  // ── Profile form validation ──
  const profileForm = document.getElementById('profileForm');

  profileForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    let valid = true;

    const fullName = document.getElementById('fullName');
    const phone = document.getElementById('phone');
    const zone = document.getElementById('zone');

    if (!fullName.value.trim()) {
      fullName.classList.add('error');
      document.getElementById('fullNameError').classList.add('visible');
      valid = false;
    } else {
      fullName.classList.remove('error');
      document.getElementById('fullNameError').classList.remove('visible');
    }

    if (!phone.value.trim()) {
      phone.classList.add('error');
      document.getElementById('phoneError').classList.add('visible');
      valid = false;
    } else {
      phone.classList.remove('error');
      document.getElementById('phoneError').classList.remove('visible');
    }

    if (!zone.value) {
      zone.classList.add('error');
      document.getElementById('zoneError').classList.add('visible');
      valid = false;
    } else {
      zone.classList.remove('error');
      document.getElementById('zoneError').classList.remove('visible');
    }

    if (valid) {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: fullName.value.trim(),
            phone_number: phone.value.trim(),
            zone_id: parseInt(zone.value)
          })
        });

        const data = await response.json();

        if (response.ok) {
          alert('Profile updated successfully!');
          // Reload profile to show updated data
          await loadProfile();
        } else {
          alert(data.error || 'Failed to update profile');
        }
      } catch (error) {
        console.error('Error updating profile:', error);
        alert('Error updating profile. Please try again.');
      }
    }
  });

  // ── Password form validation ──
  const passwordForm = document.getElementById('passwordForm');

  passwordForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    let valid = true;

    const current = document.getElementById('currentPassword');
    const newPass = document.getElementById('newPassword');
    const confirm = document.getElementById('confirmPassword');

    if (!current.value) {
      current.classList.add('error');
      document.getElementById('currentPasswordError').classList.add('visible');
      valid = false;
    } else {
      current.classList.remove('error');
      document.getElementById('currentPasswordError').classList.remove('visible');
    }

    if (!newPass.value || newPass.value.length < 6) {
      newPass.classList.add('error');
      document.getElementById('newPasswordError').classList.add('visible');
      valid = false;
    } else {
      newPass.classList.remove('error');
      document.getElementById('newPasswordError').classList.remove('visible');
    }

    if (confirm.value !== newPass.value) {
      confirm.classList.add('error');
      document.getElementById('confirmPasswordError').classList.add('visible');
      valid = false;
    } else {
      confirm.classList.remove('error');
      document.getElementById('confirmPasswordError').classList.remove('visible');
    }

    if (valid) {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            current_password: current.value,
            new_password: newPass.value
          })
        });

        const data = await response.json();

        if (response.ok) {
          alert('Password updated successfully!');
          passwordForm.reset();
        } else {
          alert(data.error || 'Failed to update password');
        }
      } catch (error) {
        console.error('Error updating password:', error);
        alert('Error updating password. Please try again.');
      }
    }
  });

});