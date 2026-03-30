// ── Toast notification ──
function showToast(message, type) {
  var container = document.getElementById('toastContainer');
  if (!container) return;
  var isError = type === 'error';
  var toast = document.createElement('div');
  toast.className = 'toast ' + (isError ? 'toast--error' : 'toast--success');
  toast.innerHTML =
    '<span class="toast__text">' + message + '</span>' +
    '<button class="toast__close" onclick="this.parentElement.remove()">&#x2715;</button>' +
    '<div class="toast__progress"></div>';
  container.appendChild(toast);
  setTimeout(function() { toast.remove(); }, 3500);
}

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
      window.location.href = '/logout';
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

  const token = localStorage.getItem('access_token');

  // ── Load claim stats ──
  async function loadClaimStats() {
    try {
      const res = await fetch('/api/claims/stats', {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (res.ok) {
        const stats = await res.json();
        document.getElementById('openClaims').textContent = stats.open || 0;
      }
    } catch (err) {
      console.error('Error loading claim stats:', err);
    }
  }

  // ── Load recent claims (last 3) ──
  async function loadRecentClaims() {
    const container = document.getElementById('recentClaims');
    try {
      const res = await fetch('/api/claims?type=claim', {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!res.ok) {
        container.innerHTML = '<p class="card__sub" style="padding:12px;">Failed to load claims.</p>';
        return;
      }
      const claims = await res.json();
      container.innerHTML = '';

      if (claims.length === 0) {
        container.innerHTML = '<p class="card__sub" style="padding:12px;">No claims yet.</p>';
        return;
      }

      var statusMap = { open: 'open', under_review: 'in-progress', approved: 'approved', rejected: 'rejected' };
      var labelMap = { open: 'Open', under_review: 'Under Review', approved: 'Approved', rejected: 'Rejected' };

      claims.slice(0, 3).forEach(function (claim) {
        var category = (claim.claim_category || '').replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
        var date = claim.reported_at ? new Date(claim.reported_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
        var badgeClass = statusMap[claim.status] || 'open';
        var badgeLabel = labelMap[claim.status] || claim.status;

        var card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = '<div class="card__row"><div>' +
          '<div class="card__title">' + category + '</div>' +
          '<div class="card__sub">Submitted ' + date + '</div>' +
          '</div><span class="badge badge--' + badgeClass + '">' + badgeLabel + '</span></div>';
        container.appendChild(card);
      });
    } catch (err) {
      container.innerHTML = '<p class="card__sub" style="padding:12px;">Network error loading claims.</p>';
    }
  }

  // ── Load next schedule ──
  async function loadNextSchedule() {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!user.zone_id) {
        document.getElementById('collectionTime').textContent = 'No zone assigned';
        document.getElementById('collectionStatus').textContent = '—';
        return;
      }

      const res = await fetch('/api/schedules?zone_id=' + user.zone_id, {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!res.ok) return;

      const schedules = await res.json();
      var now = new Date();
      var upcoming = schedules.filter(function (s) {
        return new Date(s.date_time_start) >= now || s.status === 'ongoing';
      });

      if (upcoming.length === 0) {
        document.getElementById('collectionTime').textContent = 'No upcoming collection';
        document.getElementById('collectionStatus').textContent = '—';
        return;
      }

      var next = upcoming[0];
      var start = new Date(next.date_time_start);
      var timeStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
        ' at ' + start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      document.getElementById('collectionTime').textContent = timeStr;
      document.getElementById('collectionDetail').textContent = 'Schedule #' + next.id;

      var statusEl = document.getElementById('collectionStatus');
      if (next.status === 'ongoing') {
        statusEl.textContent = 'Ongoing';
        statusEl.className = 'badge badge--in-progress';
      } else {
        statusEl.textContent = 'Not Started';
        statusEl.className = 'badge badge--upcoming';
      }
    } catch (err) {
      console.error('Error loading schedule:', err);
    }
  }

  // ── Load claim categories ──
  async function loadCategories() {
    var select = document.getElementById('claimType');
    try {
      var res = await fetch('/api/claims/categories', {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!res.ok) {
        select.innerHTML = '<option value="">Failed to load</option>';
        return;
      }
      var data = await res.json();
      select.innerHTML = '<option value="">— Select issue type —</option>';
      data.claim.forEach(function (cat) {
        var opt = document.createElement('option');
        opt.value = cat.value;
        opt.textContent = cat.label;
        select.appendChild(opt);
      });
    } catch (err) {
      select.innerHTML = '<option value="">Failed to load</option>';
    }
  }

  // ── Quick claim form submission ──
  const form = document.getElementById('quickClaimForm');
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const type = document.getElementById('claimType');
      const desc = document.getElementById('claimDesc');
      const photo = document.getElementById('claimPhoto');
      let valid = true;

      if (!type.value) {
        type.classList.add('error');
        document.getElementById('claimTypeError').classList.add('visible');
        valid = false;
      } else {
        type.classList.remove('error');
        document.getElementById('claimTypeError').classList.remove('visible');
      }

      if (!desc.value.trim()) {
        desc.classList.add('error');
        document.getElementById('claimDescError').classList.add('visible');
        valid = false;
      } else {
        desc.classList.remove('error');
        document.getElementById('claimDescError').classList.remove('visible');
      }

      if (!photo.files.length) {
        photo.classList.add('error');
        document.getElementById('claimPhotoError').classList.add('visible');
        valid = false;
      } else {
        photo.classList.remove('error');
        document.getElementById('claimPhotoError').classList.remove('visible');
      }

      if (!valid) return;

      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Submitting claim...';

      try {
        // Upload photo
        var formData = new FormData();
        formData.append('photo', photo.files[0]);
        var uploadRes = await fetch('/api/upload/photo', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token },
          body: formData
        });
        var uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          showToast(uploadData.error || 'Failed to submit claim', 'error');
          return;
        }

        // Submit claim
        var claimRes = await fetch('/api/claims', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
          },
          body: JSON.stringify({
            claim_category: type.value,
            description: desc.value.trim(),
            photo_url: uploadData.photo_url
          })
        });
        var claimData = await claimRes.json();
        if (!claimRes.ok) {
          showToast(claimData.error || 'Failed to submit claim', 'error');
          return;
        }

        showToast('Claim submitted successfully!');
        form.reset();
        loadClaimStats();
        loadRecentClaims();
      } catch (err) {
        showToast('Network error — please try again', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Claim';
      }
    });
  }

  // ── Load all dashboard data ──
  loadClaimStats();
  loadRecentClaims();
  loadNextSchedule();
  loadCategories();

});