/* zo_profile.js - Zone operator profile management */

(function () {
  function el(id) { return document.getElementById(id); }

  function showMsg(targetId, message, type) {
    const box = el(targetId);
    if (!box) return;
    box.textContent = message;
    box.className = `profile-msg show ${type === 'ok' ? 'ok' : 'err'}`;
  }

  function clearMsg(targetId) {
    const box = el(targetId);
    if (!box) return;
    box.textContent = '';
    box.className = 'profile-msg';
  }

  function getToken() {
    return localStorage.getItem('access_token') || '';
  }

  function loadFallbackFromStorage() {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return null;
      const user = JSON.parse(raw);
      if (!user || typeof user !== 'object') return null;
      return {
        username: user.username || 'Zone Operator',
        email: user.email || '',
        phone_number: user.phone_number || '',
        zone: user.zone || null
      };
    } catch (e) {
      return null;
    }
  }

  function updateIdentityUI(user) {
    const initials = (user.name || user.username || 'ZO')
      .split(' ')
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'ZO';

    const zoneLabel = user.zone && user.zone.name ? `${user.zone.name} Operator` : 'Zone Operator';

    // Update sidebar profile
    const sidebarAvatar = document.getElementById('sidebarProfileAvatar');
    if (sidebarAvatar) sidebarAvatar.textContent = initials;
    
    const sidebarName = document.getElementById('sidebarProfileName');
    if (sidebarName) sidebarName.textContent = user.name || user.username || 'Zone Operator';
    
    const sidebarRole = document.getElementById('sidebarProfileRole');
    if (sidebarRole) sidebarRole.textContent = zoneLabel;

    // Update topbar avatar
    const topbarAvatar = document.getElementById('topbarProfileAvatar');
    if (topbarAvatar) topbarAvatar.textContent = initials;

    // Update mobile profile dropdown
    const mobileAvatar = document.getElementById('mobileProfileAvatar');
    if (mobileAvatar) mobileAvatar.textContent = initials;
    
    const mobileName = document.getElementById('mobileProfileName');
    if (mobileName) mobileName.textContent = user.name || user.username || 'Zone Operator';
    
    const mobileRole = document.getElementById('mobileProfileRole');
    if (mobileRole) mobileRole.textContent = zoneLabel;

    // Update topbar subtitle
    const topSub = el('profileTopbarSub');
    if (topSub) {
      if (user.zone) {
        topSub.textContent = `${user.zone.name} · ${user.zone.district || ''} ${user.zone.cell ? '· ' + user.zone.cell : ''}`.trim();
      } else {
        topSub.textContent = 'Zone Operator Account Settings';
      }
    }
  }

  async function loadProfile() {
    clearMsg('profileMsg');
    const token = getToken();
    if (!token) {
      const fallbackUser = loadFallbackFromStorage() || {
        username: 'Zone Operator',
        email: '',
        phone_number: '',
        zone: null
      };
      updateIdentityUI(fallbackUser);

      const fullName = el('fullName');
      const email = el('email');
      const phone = el('phone');
      const zoneInfo = el('zoneInfo');

      if (fullName) fullName.value = fallbackUser.username || '';
      if (email) email.value = fallbackUser.email || '';
      if (phone) phone.value = fallbackUser.phone_number || '';
      if (zoneInfo) {
        zoneInfo.value = fallbackUser.zone
          ? `${fallbackUser.zone.name || 'Assigned Zone'}`
          : 'No assigned zone';
      }

      showMsg('profileMsg', 'Profile opened in local mode. Log in to sync changes.', 'err');
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        showMsg('profileMsg', 'Session expired. Please log in again to sync profile.', 'err');
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        showMsg('profileMsg', data.error || 'Failed to load profile.', 'err');
        return;
      }

      const user = data.user || {};
      updateIdentityUI(user);

      const fullName = el('fullName');
      const email = el('email');
      const phone = el('phone');
      const zoneInfo = el('zoneInfo');

      if (fullName) fullName.value = user.name || user.username || '';
      if (email) email.value = user.email || '';
      if (phone) phone.value = user.phone_number || '';
      if (zoneInfo) {
        zoneInfo.value = user.zone
          ? `${user.zone.name} (${user.zone.district || ''}${user.zone.sector ? ', ' + user.zone.sector : ''})`
          : 'No assigned zone';
      }
    } catch (error) {
      console.error('Failed to load profile', error);
      showMsg('profileMsg', 'Network error while loading profile.', 'err');
    }
  }

  function setupPasswordToggles() {
    document.querySelectorAll('.toggle-pass-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const input = targetId ? el(targetId) : null;
        if (!input) return;
        input.type = input.type === 'password' ? 'text' : 'password';
        btn.textContent = input.type === 'password' ? 'Show' : 'Hide';
      });
    });
  }

  function setupProfileSave() {
    const saveBtn = el('saveProfileBtn');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', async () => {
      clearMsg('profileMsg');

      const fullName = (el('fullName')?.value || '').trim();
      const phone = (el('phone')?.value || '').trim();

      if (!fullName) {
        showMsg('profileMsg', 'Full name is required.', 'err');
        return;
      }
      if (!phone) {
        showMsg('profileMsg', 'Phone number is required.', 'err');
        return;
      }

      const token = getToken();
      if (!token) {
        showMsg('profileMsg', 'Please log in to save profile changes.', 'err');
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      try {
        const response = await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: fullName,
            phone_number: phone
          })
        });

        const data = await response.json();
        if (!response.ok) {
          showMsg('profileMsg', data.error || 'Failed to save profile.', 'err');
        } else {
          showMsg('profileMsg', 'Profile updated successfully.', 'ok');
          await loadProfile();
        }
      } catch (error) {
        console.error('Failed to save profile', error);
        showMsg('profileMsg', 'Network error while saving profile.', 'err');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
      }
    });
  }

  function setupPasswordChange() {
    const passBtn = el('changePasswordBtn');
    if (!passBtn) return;

    passBtn.addEventListener('click', async () => {
      clearMsg('passwordMsg');

      const currentPassword = el('currentPassword')?.value || '';
      const newPassword = el('newPassword')?.value || '';
      const confirmPassword = el('confirmPassword')?.value || '';

      if (!currentPassword || !newPassword || !confirmPassword) {
        showMsg('passwordMsg', 'All password fields are required.', 'err');
        return;
      }
      if (newPassword.length < 6) {
        showMsg('passwordMsg', 'New password must be at least 6 characters.', 'err');
        return;
      }
      if (newPassword !== confirmPassword) {
        showMsg('passwordMsg', 'New password and confirmation do not match.', 'err');
        return;
      }

      const token = getToken();
      if (!token) {
        showMsg('passwordMsg', 'Please log in to change password.', 'err');
        return;
      }

      passBtn.disabled = true;
      passBtn.textContent = 'Updating...';

      try {
        const response = await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword
          })
        });

        const data = await response.json();
        if (!response.ok) {
          showMsg('passwordMsg', data.error || 'Failed to update password.', 'err');
        } else {
          showMsg('passwordMsg', 'Password updated successfully.', 'ok');
          if (el('currentPassword')) el('currentPassword').value = '';
          if (el('newPassword')) el('newPassword').value = '';
          if (el('confirmPassword')) el('confirmPassword').value = '';
          document.querySelectorAll('.toggle-pass-btn').forEach(btn => {
            btn.textContent = 'Show';
          });
        }
      } catch (error) {
        console.error('Failed to update password', error);
        showMsg('passwordMsg', 'Network error while updating password.', 'err');
      } finally {
        passBtn.disabled = false;
        passBtn.textContent = 'Update Password';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupPasswordToggles();
    setupProfileSave();
    setupPasswordChange();
    loadProfile();
  });
})();
