// resident_profile.js

document.addEventListener('DOMContentLoaded', function () {

  // ── Sidebar toggle (mobile) ──
  var menuBtn = document.getElementById('menuBtn');
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  var logoutBtn = document.getElementById('logoutBtn');

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
      if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('userName');
        window.location.href = '/login';
      }
    });
  }

  // ── Toast notifications ──
  function showToast(message, type) {
    var container = document.getElementById('toastContainer');
    if (!container) return;

    var iconSvg = type === 'success'
      ? '<svg class="toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
      : '<svg class="toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';

    var toast = document.createElement('div');
    toast.className = 'toast toast--' + type;
    toast.innerHTML = iconSvg +
      '<span class="toast__text">' + message + '</span>' +
      '<button class="toast__close" aria-label="Close">&times;</button>' +
      '<div class="toast__progress"></div>';

    container.appendChild(toast);

    toast.querySelector('.toast__close').addEventListener('click', function () {
      dismissToast(toast);
    });

    setTimeout(function () { dismissToast(toast); }, 3500);
  }

  function dismissToast(toast) {
    if (!toast || toast.dataset.dismissed) return;
    toast.dataset.dismissed = 'true';
    toast.style.animation = 'toastOut 0.25s ease forwards';
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 250);
  }

  // ── Button loading state ──
  function setLoading(btn, loading) {
    if (loading) {
      btn.classList.add('btn--loading');
      btn.disabled = true;
    } else {
      btn.classList.remove('btn--loading');
      btn.disabled = false;
    }
  }

  // ── Animated eye toggle (CSS class-driven) ──
  document.querySelectorAll('.toggle-password').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = document.getElementById(btn.getAttribute('data-target'));
      if (input.type === 'password') {
        input.type = 'text';
        btn.classList.add('showing');
      } else {
        input.type = 'password';
        btn.classList.remove('showing');
      }
    });
  });

  // ── Phone number formatting ──
  var phoneInput = document.getElementById('phone');

  function formatPhoneDisplay(digits) {
    digits = digits.replace(/\D/g, '').substring(0, 9);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return digits.substring(0, 3) + ' ' + digits.substring(3);
    return digits.substring(0, 3) + ' ' + digits.substring(3, 6) + ' ' + digits.substring(6);
  }

  function stripToLocal(stored) {
    if (!stored) return '';
    var d = stored.replace(/\D/g, '');
    if (d.startsWith('250') && d.length >= 12) return d.substring(3);
    if (d.startsWith('0') && d.length >= 10) return d.substring(1);
    return d.substring(0, 9);
  }

  if (phoneInput) {
    phoneInput.addEventListener('input', function () {
      var raw = phoneInput.value.replace(/\D/g, '').substring(0, 9);
      var pos = phoneInput.selectionStart;
      var oldLen = phoneInput.value.length;
      phoneInput.value = formatPhoneDisplay(raw);
      var newLen = phoneInput.value.length;
      var newPos = Math.max(0, pos + (newLen - oldLen));
      phoneInput.setSelectionRange(newPos, newPos);
    });
  }

  // ── Password strength meter ──
  var newPasswordInput = document.getElementById('newPassword');
  var pwStrength = document.getElementById('pwStrength');
  var pwStrengthFill = document.getElementById('pwStrengthFill');
  var pwStrengthLabel = document.getElementById('pwStrengthLabel');

  if (newPasswordInput && pwStrength) {
    newPasswordInput.addEventListener('input', function () {
      var val = newPasswordInput.value;
      if (!val) { pwStrength.style.display = 'none'; return; }
      pwStrength.style.display = 'block';

      var score = 0;
      if (val.length >= 6) score++;
      if (val.length >= 10) score++;
      if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
      if (/[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val)) score++;

      var levels = [
        { min: 0, cls: 'weak',   label: 'Weak' },
        { min: 2, cls: 'fair',   label: 'Fair' },
        { min: 3, cls: 'good',   label: 'Good' },
        { min: 4, cls: 'strong', label: 'Strong' }
      ];

      var level = levels[0];
      for (var i = levels.length - 1; i >= 0; i--) {
        if (score >= levels[i].min) { level = levels[i]; break; }
      }

      pwStrengthFill.className = 'pw-strength__bar-fill pw-strength__bar-fill--' + level.cls;
      pwStrengthLabel.className = 'pw-strength__label pw-strength__label--' + level.cls;
      pwStrengthLabel.textContent = level.label;
    });
  }

  // ── Loyalty progress bar (gamified, 100pt milestones) ──
  var REWARD_MILESTONE = 100;

  function updateLoyaltyBar(points) {
    var pts = points || 0;

    var currentMilestone = Math.ceil((pts + 1) / REWARD_MILESTONE) * REWARD_MILESTONE;
    if (pts > 0 && pts % REWARD_MILESTONE === 0) {
      currentMilestone = pts + REWARD_MILESTONE;
    }
    var prevMilestone = currentMilestone - REWARD_MILESTONE;
    var progressInMilestone = pts - prevMilestone;
    var pct = Math.min(100, Math.round((progressInMilestone / REWARD_MILESTONE) * 100));
    var remaining = currentMilestone - pts;

    var ptsNum = document.getElementById('profilePtsNum');
    if (ptsNum) ptsNum.textContent = pts;

    var targetEl = document.getElementById('profileLoyaltyTarget');
    if (targetEl) targetEl.textContent = 'Next reward: ' + currentMilestone + ' pts';

    var fillEl = document.getElementById('profileLoyaltyFill');
    if (fillEl) {
      setTimeout(function () { fillEl.style.width = pct + '%'; }, 100);
    }

    var emojiEl = document.getElementById('profileLoyaltyEmoji');
    var msgEl = document.getElementById('profileLoyaltyMsg');
    var emoji, msg;

    if (remaining <= 5) {
      emoji = '\uD83D\uDD25';
      msg = 'Almost there! Just <strong>' + remaining + ' pts</strong> to your next reward!';
    } else if (remaining <= 20) {
      emoji = '\uD83D\uDE80';
      msg = 'So close! Only <strong>' + remaining + ' pts</strong> to go — keep reporting!';
    } else if (remaining <= 50) {
      emoji = '\u2B50';
      msg = '<strong>' + remaining + ' pts</strong> to your next reward — you\'re doing great!';
    } else if (pts === 0) {
      emoji = '\uD83C\uDF31';
      msg = 'Submit your first claim to start earning points!';
    } else {
      emoji = '\uD83C\uDFC6';
      msg = '<strong>' + remaining + ' pts</strong> to your next reward — keep it up!';
    }

    if (emojiEl) emojiEl.textContent = emoji;
    if (msgEl) msgEl.innerHTML = msg;
  }

  // ── Load profile from backend ──
  async function loadProfile() {
    try {
      var token = localStorage.getItem('access_token');
      if (!token) { window.location.href = '/login'; return; }

      var response = await fetch('/api/auth/me', {
        headers: { 'Authorization': 'Bearer ' + token }
      });

      if (response.ok) {
        var data = await response.json();
        var user = data.user;

        // Form fields
        document.getElementById('fullName').value = user.username || '';
        document.getElementById('email').value = user.email || '';

        // Phone: convert stored format to local 9-digit display
        var localPhone = stripToLocal(user.phone_number || '');
        document.getElementById('phone').value = formatPhoneDisplay(localPhone);

        // Hero card
        document.getElementById('profileName').textContent = user.username;

        // Zone details
        var zoneDetailsEl = document.getElementById('profileZoneDetails');
        if (user.zone && zoneDetailsEl) {
          zoneDetailsEl.textContent = user.zone.district + ' · ' + user.zone.sector + ' · ' + user.zone.cell + ' · ' + user.zone.village;
        } else if (zoneDetailsEl) {
          zoneDetailsEl.textContent = '';
        }

        // Loyalty progress bar
        updateLoyaltyBar(user.loyalty_points || 0);

        // Avatar initials
        var initials = user.username.split(' ').map(function (n) { return n[0]; }).join('').toUpperCase();
        document.getElementById('profileAvatar').textContent = initials;
        document.getElementById('sidebarAvatar').textContent = initials;
        document.getElementById('sidebarName').textContent = user.username;

        // Zone info
        if (user.zone) {
          document.getElementById('profileZone').textContent = user.zone.name;
          document.getElementById('sidebarRole').textContent = user.zone.name + ' Resident';
          window.currentZoneId = user.zone.id;
        } else {
          document.getElementById('profileZone').textContent = 'No zone assigned';
          document.getElementById('sidebarRole').textContent = 'Resident';
        }

      } else if (response.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else {
        showToast('Failed to load profile. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      showToast('Error loading profile. Please try again.', 'error');
    }
  }

  // ── Load zones for dropdown ──
  async function loadZones() {
    try {
      var token = localStorage.getItem('access_token');
      var response = await fetch('/api/zones', {
        headers: { 'Authorization': 'Bearer ' + token }
      });

      if (response.ok) {
        var zones = await response.json();
        var zoneSelect = document.getElementById('zone');
        zoneSelect.innerHTML = '<option value="">— Select a zone —</option>';

        zones.forEach(function (zone) {
          var option = document.createElement('option');
          option.value = zone.id;
          option.textContent = zone.name + ' (' + zone.district + ', ' + zone.sector + ')';
          zoneSelect.appendChild(option);
        });

        if (window.currentZoneId) {
          zoneSelect.value = window.currentZoneId;
        }
      }
    } catch (error) {
      console.error('Error loading zones:', error);
    }
  }

  loadProfile().then(function () { loadZones(); });

  // ── Profile form submission ──
  var profileForm = document.getElementById('profileForm');
  var profileSaveBtn = document.getElementById('profileSaveBtn');

  profileForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    var valid = true;

    var fullName = document.getElementById('fullName');
    var phone = document.getElementById('phone');
    var zone = document.getElementById('zone');
    var phoneWrap = document.getElementById('phoneFieldWrap');

    if (!fullName.value.trim()) {
      fullName.classList.add('error');
      document.getElementById('fullNameError').classList.add('visible');
      valid = false;
    } else {
      fullName.classList.remove('error');
      document.getElementById('fullNameError').classList.remove('visible');
    }

    var rawPhone = phone.value.replace(/\D/g, '');
    if (rawPhone.length < 9) {
      if (phoneWrap) phoneWrap.classList.add('error');
      document.getElementById('phoneError').classList.add('visible');
      valid = false;
    } else {
      if (phoneWrap) phoneWrap.classList.remove('error');
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
      var phoneToSend = '0' + rawPhone;

      setLoading(profileSaveBtn, true);
      try {
        var token = localStorage.getItem('access_token');
        var response = await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: fullName.value.trim(),
            phone_number: phoneToSend,
            zone_id: parseInt(zone.value)
          })
        });

        var data = await response.json();

        if (response.ok) {
          showToast('Profile updated successfully!', 'success');
          await loadProfile();
        } else {
          showToast(data.error || 'Failed to update profile.', 'error');
        }
      } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Network error. Please try again.', 'error');
      } finally {
        setLoading(profileSaveBtn, false);
      }
    }
  });

  // ── Password form submission ──
  var passwordForm = document.getElementById('passwordForm');
  var passwordSaveBtn = document.getElementById('passwordSaveBtn');

  passwordForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    var valid = true;

    var current = document.getElementById('currentPassword');
    var newPass = document.getElementById('newPassword');
    var confirm = document.getElementById('confirmPassword');

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
      setLoading(passwordSaveBtn, true);
      try {
        var token = localStorage.getItem('access_token');
        var response = await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            current_password: current.value,
            new_password: newPass.value
          })
        });

        var data = await response.json();

        if (response.ok) {
          showToast('Password updated successfully!', 'success');
          passwordForm.reset();
          if (pwStrength) pwStrength.style.display = 'none';
          document.querySelectorAll('.toggle-password').forEach(function (btn) {
            var inp = document.getElementById(btn.getAttribute('data-target'));
            if (inp) inp.type = 'password';
            btn.classList.remove('showing');
          });
        } else {
          showToast(data.error || 'Failed to update password.', 'error');
        }
      } catch (error) {
        console.error('Error updating password:', error);
        showToast('Network error. Please try again.', 'error');
      } finally {
        setLoading(passwordSaveBtn, false);
      }
    }
  });

});
