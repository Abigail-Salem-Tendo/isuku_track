document.addEventListener('DOMContentLoaded', function () {
  const desktopBreakpoint = window.matchMedia('(min-width: 1024px)');
  const compactFormBreakpoint = window.matchMedia('(max-width: 639px)');

  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const logoutBtn = document.getElementById('logoutBtn');
  const sidebarName = document.getElementById('sidebarName');
  const sidebarAvatar = document.getElementById('sidebarAvatar');

  const toggleFormBtn = document.getElementById('toggleForm');
  const claimFormWrapper = document.getElementById('claimFormWrapper');
  const submitClaimForm = document.getElementById('submitClaimForm');
  const claimType = document.getElementById('claimType');
  const claimLocation = document.getElementById('claimLocation');
  const claimDescription = document.getElementById('claimDescription');

  const tabs = document.querySelectorAll('.tabs .tab[data-filter]');
  const claimsList = document.getElementById('claimsList');
  let claimCards = Array.from(document.querySelectorAll('#claimsList .card'));

  const emptyState = document.createElement('div');
  emptyState.className = 'empty-state';
  emptyState.hidden = true;
  emptyState.innerHTML = '<p>No claims match this filter yet.</p>';

  if (claimsList) {
    claimsList.appendChild(emptyState);
  }

  function closeSidebar() {
    if (sidebar) {
      sidebar.classList.remove('open');
    }
    if (overlay) {
      overlay.classList.remove('open');
    }
    if (menuBtn) {
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  }

  function toggleSidebar() {
    if (!sidebar || !overlay) {
      return;
    }

    const isOpen = sidebar.classList.toggle('open');
    overlay.classList.toggle('open', isOpen);

    if (menuBtn) {
      menuBtn.setAttribute('aria-expanded', String(isOpen));
    }
  }

  if (menuBtn) {
    menuBtn.setAttribute('aria-controls', 'sidebar');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.addEventListener('click', toggleSidebar);
  }

  if (overlay) {
    overlay.addEventListener('click', closeSidebar);
  }

  document.querySelectorAll('.sidebar__nav-item').forEach(function (item) {
    item.addEventListener('click', function () {
      if (!desktopBreakpoint.matches) {
        closeSidebar();
      }
    });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeSidebar();
    }
  });

  function syncSidebarForViewport(event) {
    if (event.matches) {
      closeSidebar();
    }
  }

  if (typeof desktopBreakpoint.addEventListener === 'function') {
    desktopBreakpoint.addEventListener('change', syncSidebarForViewport);
  } else {
    desktopBreakpoint.addListener(syncSidebarForViewport);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
      window.location.href = '/static/pages/login1.html';
    });
  }

  const name = localStorage.getItem('userName') || 'Resident';
  const initials = name.split(' ').map(function (part) {
    return part[0];
  }).join('').toUpperCase();

  if (sidebarName) {
    sidebarName.textContent = name;
  }

  if (sidebarAvatar) {
    sidebarAvatar.textContent = initials || 'R';
  }

  let isFormExpanded = !compactFormBreakpoint.matches;

  function applyFormState() {
    if (!toggleFormBtn || !claimFormWrapper) {
      return;
    }

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

  function setFieldError(field, errorId, hasError) {
    const errorElement = document.getElementById(errorId);

    if (field) {
      field.classList.toggle('error', hasError);
    }

    if (errorElement) {
      errorElement.classList.toggle('visible', hasError);
    }
  }

  function applyFilter(filter) {
    let visibleCount = 0;

    claimCards.forEach(function (card) {
      const matches = filter === 'all' || card.getAttribute('data-status') === filter;
      card.style.display = matches ? 'block' : 'none';
      if (matches) {
        visibleCount += 1;
      }
    });

    if (emptyState) {
      emptyState.hidden = visibleCount !== 0;
    }
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (item) {
        item.classList.remove('active');
      });
      tab.classList.add('active');
      applyFilter(tab.getAttribute('data-filter'));
    });
  });

  applyFilter('all');

  function createClaimCard(typeLabel, locationLabel, descriptionLabel) {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-status', 'open');

    const row = document.createElement('div');
    row.className = 'card__row';

    const content = document.createElement('div');

    const title = document.createElement('div');
    title.className = 'card__title';
    title.textContent = typeLabel;

    const location = document.createElement('div');
    location.className = 'card__sub';
    location.textContent = locationLabel;

    const submitted = document.createElement('div');
    submitted.className = 'card__sub';
    submitted.textContent = 'Submitted ' + new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric'
    });

    const description = document.createElement('div');
    description.className = 'card__sub';
    description.textContent = descriptionLabel;

    const badge = document.createElement('span');
    badge.className = 'badge badge--open';
    badge.textContent = 'Open';

    content.appendChild(title);
    content.appendChild(location);
    content.appendChild(submitted);
    content.appendChild(description);
    row.appendChild(content);
    row.appendChild(badge);
    card.appendChild(row);

    return card;
  }

  if (submitClaimForm) {
    submitClaimForm.addEventListener('submit', function (event) {
      event.preventDefault();

      const selectedType = claimType ? claimType.value.trim() : '';
      const locationValue = claimLocation ? claimLocation.value.trim() : '';
      const descriptionValue = claimDescription ? claimDescription.value.trim() : '';

      const typeHasError = !selectedType;
      const locationHasError = !locationValue;
      const descriptionHasError = !descriptionValue;
      const isValid = !typeHasError && !locationHasError && !descriptionHasError;

      setFieldError(claimType, 'claimTypeError', typeHasError);
      setFieldError(claimLocation, 'claimLocationError', locationHasError);
      setFieldError(claimDescription, 'claimDescriptionError', descriptionHasError);

      if (!isValid) {
        return;
      }

      const selectedOption = claimType.options[claimType.selectedIndex];
      const typeLabel = selectedOption ? selectedOption.textContent : 'Claim';
      const newCard = createClaimCard(typeLabel, locationValue, descriptionValue);

      if (claimsList) {
        claimsList.insertBefore(newCard, claimsList.firstChild);
        claimCards = Array.from(document.querySelectorAll('#claimsList .card'));
      }

      tabs.forEach(function (tab) {
        tab.classList.toggle('active', tab.getAttribute('data-filter') === 'open');
      });
      applyFilter('open');

      submitClaimForm.reset();
      setFieldError(claimType, 'claimTypeError', false);
      setFieldError(claimLocation, 'claimLocationError', false);
      setFieldError(claimDescription, 'claimDescriptionError', false);

      if (!desktopBreakpoint.matches) {
        isFormExpanded = false;
        applyFormState();
      }
    });
  }
});
