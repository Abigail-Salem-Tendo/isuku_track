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
  forgot: {
    title: 'Reset your password',
    subtitle: 'Enter your email to receive reset instructions',
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
  document.getElementById('formTitle').textContent = config.title;
  document.getElementById('formSubtitle').textContent = config.subtitle;

  // Hide tabs on forgot pane, show on login/register
  const tabs = document.querySelector('.auth-tabs');
  if (tabs) tabs.style.display = target === 'forgot' ? 'none' : '';

  // Reset forgot password form when switching away
  const forgotForm = document.getElementById('forgotPasswordForm');
  const emailSentState = document.getElementById('emailSentState');
  if (target !== 'forgot') {
    if (forgotForm) { forgotForm.style.display = 'block'; forgotForm.reset(); }
    if (emailSentState) emailSentState.style.display = 'none';
  }
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

// ── Password visibility toggle (CSS class-driven SVG eye) ──

document.querySelectorAll('.toggle-password').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    if (input.type === 'password') {
      input.type = 'text';
      btn.classList.add('showing');
    } else {
      input.type = 'password';
      btn.classList.remove('showing');
    }
  });
});

// ── Phone formatting (register pane) ──
(function () {
  var phoneInput = document.getElementById('phone');
  if (!phoneInput) return;

  function formatPhone(digits) {
    digits = digits.replace(/\D/g, '').substring(0, 9);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return digits.substring(0, 3) + ' ' + digits.substring(3);
    return digits.substring(0, 3) + ' ' + digits.substring(3, 6) + ' ' + digits.substring(6);
  }

  phoneInput.addEventListener('input', function () {
    var raw = phoneInput.value.replace(/\D/g, '').substring(0, 9);
    var pos = phoneInput.selectionStart;
    var oldLen = phoneInput.value.length;
    phoneInput.value = formatPhone(raw);
    var newLen = phoneInput.value.length;
    phoneInput.setSelectionRange(Math.max(0, pos + (newLen - oldLen)), Math.max(0, pos + (newLen - oldLen)));
  });
})();

// ── Password strength meter (register pane) ──
(function () {
  var pwInput = document.getElementById('regPassword');
  var pwStrength = document.getElementById('regPwStrength');
  var pwFill = document.getElementById('regPwStrengthFill');
  var pwLabel = document.getElementById('regPwStrengthLabel');
  if (!pwInput || !pwStrength) return;

  pwInput.addEventListener('input', function () {
    var val = pwInput.value;
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
    pwFill.className = 'pw-strength__bar-fill pw-strength__bar-fill--' + level.cls;
    pwLabel.className = 'pw-strength__label pw-strength__label--' + level.cls;
    pwLabel.textContent = level.label;
  });
})();


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
  // Redirect to Flask routes, not template files
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
  const phone_number = '0' + document.getElementById('phone').value.replace(/\D/g, '');
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

// ── Forgot Password form submit ──

document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();

  const email = document.getElementById('forgotEmail').value.trim();

  if (!email) return showError('forgotEmailError', 'Please enter your email');

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Sending…';

  try {
    const res = await fetch(`${API_BASE}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (!res.ok) {
      showError('forgotEmailError', data.error || 'Failed to send reset link');
      return;
    }

    // Show email sent state
    document.getElementById('forgotPasswordForm').style.display = 'none';
    document.getElementById('sentEmailAddress').textContent = email;
    document.getElementById('emailSentState').style.display = 'block';

    document.getElementById('formTitle').textContent = 'Check your email';
    document.getElementById('formSubtitle').textContent = `We've sent reset instructions to ${email}`;

    setupResendState(email);

  } catch (err) {
    showError('forgotEmailError', 'Network error — please try again');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send Reset Link';
  }
});

let _resendExpiryTimer = null;

function setupResendState(email) {
  const resendBtn = document.getElementById('resendBtn');

  // Show resend button enabled immediately — no countdown
  resendBtn.disabled = false;
  resendBtn.textContent = 'Resend email';

  // After 30 minutes the link in the email expires — prompt user to start over
  if (_resendExpiryTimer) clearTimeout(_resendExpiryTimer);
  _resendExpiryTimer = setTimeout(() => {
    resendBtn.textContent = 'Enter email again';
    resendBtn.disabled = false;
    resendBtn.onclick = () => {
      document.getElementById('emailSentState').style.display = 'none';
      document.getElementById('forgotPasswordForm').style.display = 'block';
      document.getElementById('forgotPasswordForm').reset();
      document.getElementById('formTitle').textContent = 'Reset your password';
      document.getElementById('formSubtitle').textContent = 'Enter your email to receive reset instructions';
    };
  }, 30 * 60 * 1000);

  resendBtn.onclick = async () => {
    resendBtn.disabled = true;
    resendBtn.textContent = 'Sending…';
    try {
      const res = await fetch(`${API_BASE}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        resendBtn.textContent = 'Resend failed';
        setTimeout(() => setupResendState(email), 2000);
        return;
      }
    } catch {
      resendBtn.textContent = 'Resend failed';
      setTimeout(() => setupResendState(email), 2000);
      return;
    }
    // New token issued — restart the 30-min expiry clock
    setupResendState(email);
  };
}
