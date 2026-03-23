// resident_profile.js

document.addEventListener('DOMContentLoaded', function () {

  // ── Load profile from backend ──
  // TODO: replace with real fetch
  // fetch('/api/resident/profile', { headers: { Authorization: 'Bearer ' + localStorage.getItem('authToken') } })
  //   .then(r => r.json())
  //   .then(data => {
  //     document.getElementById('fullName').value  = data.full_name;
  //     document.getElementById('email').value     = data.email;
  //     document.getElementById('phone').value     = data.phone;
  //     document.getElementById('profileName').textContent = data.full_name;
  //     document.getElementById('profileZone').textContent = data.zone.name;
  //     document.getElementById('profilePoints').textContent = data.loyalty_points + ' pts';
  //     document.getElementById('profileAvatar').textContent = data.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
  //     document.getElementById('sidebarName').textContent = data.full_name;
  //     document.getElementById('sidebarAvatar').textContent = data.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
  //     // populate zone dropdown and set selected
  //   });

  // ── Load zones for dropdown ──
  // TODO: fetch('/api/zones') to populate zone select
  // Same as login page loadZones()

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

  profileForm.addEventListener('submit', function (e) {
    e.preventDefault();
    let valid = true;

    const fullName = document.getElementById('fullName');
    const phone    = document.getElementById('phone');
    const zone     = document.getElementById('zone');

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
      // TODO: fetch('/api/resident/profile', { method: 'PUT', ... })
      alert('Profile updated successfully!');
    }
  });

  // ── Password form validation ──
  const passwordForm = document.getElementById('passwordForm');

  passwordForm.addEventListener('submit', function (e) {
    e.preventDefault();
    let valid = true;

    const current  = document.getElementById('currentPassword');
    const newPass  = document.getElementById('newPassword');
    const confirm  = document.getElementById('confirmPassword');

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
      // TODO: fetch('/api/auth/change-password', { method: 'POST', ... })
      alert('Password updated successfully!');
      passwordForm.reset();
    }
  });

});