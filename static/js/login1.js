const API_BASE = '/api/auth';

const PANE_CONFIG = {
  login: {
    title: 'Welcome back',
    subtitle: 'Sign in to your account to continue',
  },
  register: {
    title: 'Create your account',
    subtitle: 'Register as a resident in Kimironko',
  },
};

// ── Tab switching ──
function switchPane(target) {
  document.querySelectorAll('.auth-tab').forEach((tab) => {
    tab.classList.toggle('auth-tab--active', tab.dataset.tab === target);
  });
  document.querySelectorAll('.auth-pane').forEach((pane) => {
    pane.classList.toggle('auth-pane--active', pane.id === `pane-${target}`);
  });
  const config = PANE_CONFIG[target];
  document.getElementById('formTitle').textContent    = config.title;
  document.getElementById('formSubtitle').textContent = config.subtitle;
}

document.querySelectorAll('.auth-tab').forEach((tab) => {
  tab.addEventListener('click', () => switchPane(tab.dataset.tab));
});

document.querySelectorAll('[data-switch]').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    switchPane(link.dataset.switch);
  });
});

// ── Password visibility toggle ──

document.querySelectorAll('.toggle-password').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input   = document.getElementById(btn.dataset.target);
    const isHidden = input.type === 'password';
    input.type     = isHidden ? 'text' : 'password';
    btn.textContent = isHidden ? 'Hide' : 'Show';
  });
});

// ── Helper: show error on a field ──

function showError(fieldId, message) {
  const errorEl = document.getElementById(fieldId);
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
}

function clearErrors() {
  document.querySelectorAll('.error-message').forEach((el) => {
    el.style.display = 'none';
  });
}

// ── Helper: store tokens and redirect by role ──

function handleAuthSuccess(data) {
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('refresh_token', data.refresh_token);
  localStorage.setItem('user', JSON.stringify(data.user));

  const role = data.user.role;
  if (role === 'admin') {
    window.location.href = '/admin/dashboard';
  } else if (role === 'zone_operator') {
    window.location.href = '/zone-operator/dashboard';
  } else {
    window.location.href = '/resident/dashboard';
  }
}

// ── Load zones into the dropdown ──

async function loadZones() {
  const select = document.getElementById('zone');
  try {
    const res = await fetch('/api/zones');
    if (!res.ok) throw new Error('Failed to load zones');
    const zones = await res.json();

    select.innerHTML = '<option value="">— Select zone —</option>';
    zones.forEach((z) => {
      const opt = document.createElement('option');
      opt.value = z.id;
      opt.textContent = `${z.name} — ${z.district} · ${z.sector} · ${z.cell} · ${z.village}`;
      select.appendChild(opt);
    });
  } catch (err) {
    select.innerHTML = '<option value="">— Failed to load zones —</option>';
  }
}

// Load zones on page load
loadZones();

// ── Login form submit ──

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email) return showError('emailError', 'Please enter your email');
  if (!password) return showError('passwordError', 'Please enter your password');

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      showError('passwordError', data.error || 'Login failed');
      return;
    }

    handleAuthSuccess(data);
  } catch (err) {
    showError('passwordError', 'Network error — please try again');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
});

// ── Register form submit ──

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();

  const username = document.getElementById('fullName').value.trim();
  const phone_number = document.getElementById('phone').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const zone_id = document.getElementById('zone').value;
  const password = document.getElementById('regPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  // Client-side validation
  if (!username) return showError('fullNameError', 'Full name is required');
  if (!phone_number) return showError('phoneError', 'Phone number is required');
  if (!email) return showError('regEmailError', 'Email is required');
  if (!zone_id) return showError('zoneError', 'Please select a zone');
  if (!password) return showError('regPasswordError', 'Password is required');
  if (password !== confirmPassword) return showError('confirmPasswordError', 'Passwords do not match');

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Creating account…';

  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email,
        password,
        phone_number,
        zone_id: parseInt(zone_id),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Map backend errors to the right field
      const err = data.error || 'Registration failed';
      if (err.includes('email') || err.includes('Email')) {
        showError('regEmailError', err);
      } else if (err.includes('Username') || err.includes('username')) {
        showError('fullNameError', err);
      } else if (err.includes('Password') || err.includes('password')) {
        showError('regPasswordError', err);
      } else if (err.includes('Phone') || err.includes('phone')) {
        showError('phoneError', err);
      } else if (err.includes('zone') || err.includes('Zone')) {
        showError('zoneError', err);
      } else {
        showError('regEmailError', err);
      }
      return;
    }

    handleAuthSuccess(data);
  } catch (err) {
    showError('regEmailError', 'Network error — please try again');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
});
