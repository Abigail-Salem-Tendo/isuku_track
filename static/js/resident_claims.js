document.addEventListener('DOMContentLoaded', function () {
  var desktopBreakpoint = window.matchMedia('(min-width: 1024px)');
  var compactFormBreakpoint = window.matchMedia('(max-width: 639px)');

  var menuBtn = document.getElementById('menuBtn');
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  var logoutBtn = document.getElementById('logoutBtn');
  var sidebarName = document.getElementById('sidebarName');
  var sidebarAvatar = document.getElementById('sidebarAvatar');

  var toggleFormBtn = document.getElementById('toggleForm');
  var claimFormWrapper = document.getElementById('claimFormWrapper');
  var submitClaimForm = document.getElementById('submitClaimForm');
  var claimType = document.getElementById('claimType');
  var claimDescription = document.getElementById('claimDescription');
  var claimPhoto = document.getElementById('claimPhoto');

  var tabs = document.querySelectorAll('.tabs .tab[data-filter]');
  var claimsList = document.getElementById('claimsList');

  var token = localStorage.getItem('access_token');

  // Status maps for backend → UI
  var statusBadgeClass = {
    open: 'open',
    under_review: 'in-progress',
    approved: 'approved',
    rejected: 'rejected'
  };
  var statusLabel = {
    open: 'Open',
    under_review: 'Under Review',
    approved: 'Approved',
    rejected: 'Rejected'
  };

  // ── Sidebar toggle ──
  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
  }

  function toggleSidebar() {
    if (!sidebar || !overlay) return;
    var isOpen = sidebar.classList.toggle('open');
    overlay.classList.toggle('open', isOpen);
    if (menuBtn) menuBtn.setAttribute('aria-expanded', String(isOpen));
  }

  if (menuBtn) {
    menuBtn.setAttribute('aria-controls', 'sidebar');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.addEventListener('click', toggleSidebar);
  }
  if (overlay) overlay.addEventListener('click', closeSidebar);

  document.querySelectorAll('.sidebar__nav-item').forEach(function (item) {
    item.addEventListener('click', function () {
      if (!desktopBreakpoint.matches) closeSidebar();
    });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeSidebar();
  });

  if (typeof desktopBreakpoint.addEventListener === 'function') {
    desktopBreakpoint.addEventListener('change', function (e) {
      if (e.matches) closeSidebar();
    });
  }

  // ── Logout ──
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    });
  }

  // ── User info ──
  var name = localStorage.getItem('userName') || 'Resident';
  var initials = name.split(' ').map(function (p) { return p[0]; }).join('').toUpperCase();
  if (sidebarName) sidebarName.textContent = name;
  if (sidebarAvatar) sidebarAvatar.textContent = initials || 'R';

  // ── Form toggle ──
  var isFormExpanded = !compactFormBreakpoint.matches;

  function applyFormState() {
    if (!toggleFormBtn || !claimFormWrapper) return;
    claimFormWrapper.hidden = !isFormExpanded;
    toggleFormBtn.textContent = isFormExpanded ? 'Hide' : 'Show';
    toggleFormBtn.setAttribute('aria-expanded', String(isFormExpanded));
  }

  if (toggleFormBtn && claimFormWrapper) {
    toggleFormBtn.setAttribute('aria-controls', 'claimFormWrapper');
    toggleFormBtn.addEventListener('click', function () {
      isFormExpanded = !isFormExpanded;
      applyFormState();
    });
    applyFormState();
  }

  // ── Field error helpers ──
  function setFieldError(field, errorId, hasError) {
    var errorEl = document.getElementById(errorId);
    if (field) field.classList.toggle('error', hasError);
    if (errorEl) errorEl.classList.toggle('visible', hasError);
  }

  // ── Load categories from API ──
  async function loadCategories() {
    try {
      var res = await fetch('/api/claims/categories', {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!res.ok) {
        claimType.innerHTML = '<option value="">Failed to load</option>';
        return;
      }
      var data = await res.json();
      claimType.innerHTML = '<option value="">— Select claim type —</option>';
      data.claim.forEach(function (cat) {
        var opt = document.createElement('option');
        opt.value = cat.value;
        opt.textContent = cat.label;
        claimType.appendChild(opt);
      });
    } catch (err) {
      claimType.innerHTML = '<option value="">Failed to load</option>';
    }
  }

  // ── Load claims from API ──
  var allClaims = [];

  async function loadClaims() {
    if (!claimsList) return;
    try {
      var res = await fetch('/api/claims?type=claim', {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!res.ok) {
        claimsList.innerHTML = '<p class="card__sub" style="padding:12px;">Failed to load claims.</p>';
        return;
      }
      allClaims = await res.json();
      renderClaims('all');
    } catch (err) {
      claimsList.innerHTML = '<p class="card__sub" style="padding:12px;">Network error loading claims.</p>';
    }
  }

  function renderClaims(filter) {
    if (!claimsList) return;
    claimsList.innerHTML = '';

    var filtered = filter === 'all'
      ? allClaims
      : allClaims.filter(function (c) { return c.status === filter; });

    if (filtered.length === 0) {
      claimsList.innerHTML = '<p class="card__sub" style="padding:12px;">No claims match this filter.</p>';
      return;
    }

    filtered.forEach(function (claim) {
      var category = (claim.claim_category || '').replace(/_/g, ' ')
        .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      var date = claim.reported_at
        ? new Date(claim.reported_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '';
      var badgeClass = statusBadgeClass[claim.status] || 'open';
      var badgeText = statusLabel[claim.status] || claim.status;

      var card = document.createElement('div');
      card.className = 'card';
      card.setAttribute('data-status', claim.status);

      var html = '<div class="card__row"><div>' +
        '<div class="card__title">' + category + '</div>' +
        '<div class="card__sub">' + claim.description + '</div>' +
        '<div class="card__sub">Submitted ' + date + '</div>' +
        '</div><span class="badge badge--' + badgeClass + '">' + badgeText + '</span></div>';

      if (claim.status === 'approved' && claim.points_awarded) {
        html += '<div class="card__points">+' + claim.points_awarded + ' pts awarded</div>';
      }
      if (claim.status === 'rejected' && claim.rejection_detail) {
        html += '<div class="card__sub" style="padding:4px 16px 8px;color:var(--danger);">Reason: ' + claim.rejection_detail + '</div>';
      }

      card.innerHTML = html;
      claimsList.appendChild(card);
    });
  }

  // ── Tab filtering ──
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      renderClaims(tab.getAttribute('data-filter'));
    });
  });

  // ── Submit claim form ──
  if (submitClaimForm) {
    submitClaimForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      var typeVal = claimType ? claimType.value.trim() : '';
      var descVal = claimDescription ? claimDescription.value.trim() : '';
      var hasPhoto = claimPhoto && claimPhoto.files.length > 0;

      var typeErr = !typeVal;
      var descErr = !descVal;
      var photoErr = !hasPhoto;

      setFieldError(claimType, 'claimTypeError', typeErr);
      setFieldError(claimDescription, 'claimDescriptionError', descErr);
      setFieldError(claimPhoto, 'claimPhotoError', photoErr);

      if (typeErr || descErr || photoErr) return;

      var btn = submitClaimForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Submitting claim...';

      try {
        // Step 1: Upload photo
        var formData = new FormData();
        formData.append('photo', claimPhoto.files[0]);
        var uploadRes = await fetch('/api/upload/photo', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token },
          body: formData
        });
        var uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          alert(uploadData.error || 'Failed to upload photo');
          return;
        }

        // Step 2: Submit claim
        var claimRes = await fetch('/api/claims', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
          },
          body: JSON.stringify({
            claim_category: typeVal,
            description: descVal,
            photo_url: uploadData.photo_url
          })
        });
        var claimData = await claimRes.json();
        if (!claimRes.ok) {
          alert(claimData.error || 'Failed to submit claim');
          return;
        }

        alert('Claim submitted successfully!');
        submitClaimForm.reset();
        setFieldError(claimType, 'claimTypeError', false);
        setFieldError(claimDescription, 'claimDescriptionError', false);
        setFieldError(claimPhoto, 'claimPhotoError', false);

        // Reload claims and switch to open filter
        await loadClaims();
        tabs.forEach(function (t) {
          t.classList.toggle('active', t.getAttribute('data-filter') === 'open');
        });
        renderClaims('open');

        if (!desktopBreakpoint.matches) {
          isFormExpanded = false;
          applyFormState();
        }
      } catch (err) {
        alert('Network error — please try again');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Claim';
      }
    });
  }

  // ── Load everything on page load ──
  loadCategories();
  loadClaims();
});
