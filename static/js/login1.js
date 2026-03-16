// login.js — Tab switching, password toggle, zone loading

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

// ── Switch pane ──
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

// Tab button clicks
document.querySelectorAll('.auth-tab').forEach((tab) => {
  tab.addEventListener('click', () => switchPane(tab.dataset.tab));
});

// Footer link clicks
document.querySelectorAll('[data-switch]').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    switchPane(link.dataset.switch);
  });
});

// ── Password toggle ──
document.querySelectorAll('.toggle-password').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input   = document.getElementById(btn.dataset.target);
    const isHidden = input.type === 'password';
    input.type     = isHidden ? 'text' : 'password';
    btn.textContent = isHidden ? 'Hide' : 'Show';
  });
});

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