<<<<<<< Updated upstream
// login.js — Tab switching, password toggle, zone loading
=======
const API_BASE = '/api/auth';
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
// ── Switch pane ──
=======
// ── Tab switching ──
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
// Tab button clicks
=======
>>>>>>> Stashed changes
document.querySelectorAll('.auth-tab').forEach((tab) => {
  tab.addEventListener('click', () => switchPane(tab.dataset.tab));
});

<<<<<<< Updated upstream
// Footer link clicks
=======
>>>>>>> Stashed changes
document.querySelectorAll('[data-switch]').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    switchPane(link.dataset.switch);
  });
});

<<<<<<< Updated upstream
// ── Password toggle ──
=======
// ── Password visibility toggle ──

>>>>>>> Stashed changes
document.querySelectorAll('.toggle-password').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input   = document.getElementById(btn.dataset.target);
    const isHidden = input.type === 'password';
    input.type     = isHidden ? 'text' : 'password';
    btn.textContent = isHidden ? 'Hide' : 'Show';
  });
});

<<<<<<< Updated upstream
// ── Load zones from backend ──
// Fetches all zones and populates the dropdown with name + geographic info
function loadZones() {
  const select = document.getElementById('zone');

  // TODO: replace with real fetch when backend is ready
  // fetch('/api/zones')
  //   .then(r => r.json())
  //   .then(zones => {
  //     select.innerHTML = '<option value="">— Select zone —</option>';
  //     zones.forEach(zone => {
  //       const option = document.createElement('option');
  //       option.value = zone.id;
  //       option.textContent = zone.name + ' — ' + zone.district + ', ' + zone.sector + ', ' + zone.cell + ', ' + zone.village;
  //       select.appendChild(option);
  //     });
  //   })
  //   .catch(() => {
  //     select.innerHTML = '<option value="">— Could not load zones —</option>';
  //   });

  // Placeholder until backend is ready
  select.innerHTML = '<option value="">— Select zone —</option>';
}

loadZones();

// ── Login form validation ──
const loginForm  = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passInput  = document.getElementById('password');

loginForm.addEventListener('submit', function (e) {
  e.preventDefault();
  let valid = true;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailInput.value || !emailRegex.test(emailInput.value)) {
    emailInput.classList.add('error');
    document.getElementById('emailError').classList.add('visible');
    valid = false;
  } else {
    emailInput.classList.remove('error');
    document.getElementById('emailError').classList.remove('visible');
  }

  if (!passInput.value) {
    passInput.classList.add('error');
    document.getElementById('passwordError').classList.add('visible');
    valid = false;
  } else {
    passInput.classList.remove('error');
    document.getElementById('passwordError').classList.remove('visible');
  }

  if (valid) {
    // TODO: connect to backend
    // fetch('/api/auth/login', { method: 'POST', ... })
    // localStorage.setItem('authToken', data.token)
    // localStorage.setItem('userRole', data.role)
    // localStorage.setItem('userName', data.name)
    // redirect based on role
    console.log('Login valid — ready for backend');
  }
});

// ── Register form validation ──
const registerForm = document.getElementById('registerForm');

registerForm.addEventListener('submit', function (e) {
  e.preventDefault();
  let valid = true;

  function showError(id, errId) {
    document.getElementById(id).classList.add('error');
    document.getElementById(errId).classList.add('visible');
  }
  function clearError(id, errId) {
    document.getElementById(id).classList.remove('error');
    document.getElementById(errId).classList.remove('visible');
  }

  const fullName = document.getElementById('fullName');
  if (!fullName.value.trim()) { showError('fullName', 'fullNameError'); valid = false; }
  else { clearError('fullName', 'fullNameError'); }

  const phone = document.getElementById('phone');
  if (!phone.value.trim()) { showError('phone', 'phoneError'); valid = false; }
  else { clearError('phone', 'phoneError'); }

  const regEmail = document.getElementById('regEmail');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regEmail.value || !emailRegex.test(regEmail.value)) { showError('regEmail', 'regEmailError'); valid = false; }
  else { clearError('regEmail', 'regEmailError'); }

  const zone = document.getElementById('zone');
  if (!zone.value) { showError('zone', 'zoneError'); valid = false; }
  else { clearError('zone', 'zoneError'); }

  const regPass    = document.getElementById('regPassword');
  const confirmPass = document.getElementById('confirmPassword');
  if (!regPass.value || regPass.value.length < 6) { showError('regPassword', 'regPasswordError'); valid = false; }
  else { clearError('regPassword', 'regPasswordError'); }

  if (confirmPass.value !== regPass.value) {
    confirmPass.classList.add('error');
    document.getElementById('confirmPasswordError').classList.add('visible');
    valid = false;
  } else {
    confirmPass.classList.remove('error');
    document.getElementById('confirmPasswordError').classList.remove('visible');
  }

  if (valid) {
    // TODO: connect to backend
    // fetch('/api/auth/register', { method: 'POST', ... })
    console.log('Register valid — ready for backend');
  }
});
=======
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
>>>>>>> Stashed changes
