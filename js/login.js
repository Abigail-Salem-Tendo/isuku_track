
// ============================================================
//  Isuku Track — login.js
// ============================================================


// ─── 1. PASSWORD SHOW / HIDE TOGGLE ─────────────────────────
const toggleBtn     = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');

toggleBtn.addEventListener('click', function () {
  if (passwordInput.type === 'password') {
    passwordInput.type    = 'text';
    toggleBtn.textContent = 'Hide';
  } else {
    passwordInput.type    = 'password';
    toggleBtn.textContent = 'Show';
  }
});


// ─── 2. ELEMENT REFERENCES ──────────────────────────────────
const loginForm     = document.getElementById('loginForm');
const emailInput    = document.getElementById('email');
const emailError    = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const submitBtn     = loginForm.querySelector('button[type="submit"]');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


// ─── 3. REAL-TIME INLINE VALIDATION ─────────────────────────
// Validates as the user types — instant feedback without waiting for submit

emailInput.addEventListener('input', function () {
  if (emailRegex.test(emailInput.value)) {
    emailInput.classList.remove('error');
    emailError.classList.remove('visible');
  } else {
    emailInput.classList.add('error');
    emailError.textContent = 'Please enter a valid email address';
    emailError.classList.add('visible');
  }
});

passwordInput.addEventListener('input', function () {
  const value = passwordInput.value;

  if (!value) {
    passwordInput.classList.add('error');
    passwordError.textContent = 'Password is required';
    passwordError.classList.add('visible');
  } else if (value.length < 8) {
    passwordInput.classList.add('error');
    passwordError.textContent = 'Password must be at least 8 characters';
    passwordError.classList.add('visible');
  } else if (!/[A-Z]/.test(value)) {
    passwordInput.classList.add('error');
    passwordError.textContent = 'Password must contain at least one uppercase letter';
    passwordError.classList.add('visible');
  } else if (!/[0-9]/.test(value)) {
    passwordInput.classList.add('error');
    passwordError.textContent = 'Password must contain at least one number';
    passwordError.classList.add('visible');
  } else {
    passwordInput.classList.remove('error');
    passwordError.classList.remove('visible');
  }
});


// ─── 4. PASSWORD STRENGTH CHECKER ───────────────────────────
// Returns { score: 0-4, label, color } based on how strong the password is

function checkPasswordStrength(value) {
  let score = 0;
  if (value.length >= 8)          score++;   // long enough
  if (/[A-Z]/.test(value))        score++;   // has uppercase
  if (/[0-9]/.test(value))        score++;   // has number
  if (/[^A-Za-z0-9]/.test(value)) score++;   // has special character

  const levels = [
    { label: 'Very Weak', color: '#e74c3c' },
    { label: 'Weak',      color: '#e67e22' },
    { label: 'Fair',      color: '#f1c40f' },
    { label: 'Strong',    color: '#2ecc71' },
    { label: 'Very Strong', color: '#27ae60' },
  ];

  return { score, ...levels[score] };
}

// Inject a strength bar below the password field
const strengthBar   = document.createElement('div');
strengthBar.id      = 'strengthBar';
strengthBar.style.cssText = `
  height: 4px; border-radius: 4px;
  margin-top: 6px; width: 0%;
  transition: width 0.3s, background-color 0.3s;
`;

const strengthLabel   = document.createElement('span');
strengthLabel.id      = 'strengthLabel';
strengthLabel.style.cssText = 'font-size: 0.75rem; margin-top: 2px; display: block;';

passwordInput.parentElement.after(strengthBar, strengthLabel);

passwordInput.addEventListener('input', function () {
  const { score, label, color } = checkPasswordStrength(passwordInput.value);
  const pct = ((score) / 4) * 100;

  strengthBar.style.width           = pct + '%';
  strengthBar.style.backgroundColor = color;
  strengthLabel.textContent         = passwordInput.value ? label : '';
  strengthLabel.style.color         = color;
});


// ─── 5. LOADING STATE HELPERS ───────────────────────────────
function setLoading(isLoading) {
  if (isLoading) {
    submitBtn.disabled     = true;
    submitBtn.textContent  = 'Signing in…';
    submitBtn.style.opacity = '0.7';
  } else {
    submitBtn.disabled     = false;
    submitBtn.textContent  = 'Sign In';
    submitBtn.style.opacity = '1';
  }
}


// ─── 6. FORM SUBMIT + REAL API AUTHENTICATION ───────────────
loginForm.addEventListener('submit', async function (e) {
  e.preventDefault();
  let valid = true;

  // ── Validate email ──
  if (!emailInput.value || !emailRegex.test(emailInput.value)) {
    emailInput.classList.add('error');
    emailError.textContent = 'Please enter a valid email address';
    emailError.classList.add('visible');
    valid = false;
  } else {
    emailInput.classList.remove('error');
    emailError.classList.remove('visible');
  }

  // ── Validate password ──
  const pwd = passwordInput.value;
  if (!pwd) {
    passwordInput.classList.add('error');
    passwordError.textContent = 'Password is required';
    passwordError.classList.add('visible');
    valid = false;
  } else if (pwd.length < 8) {
    passwordInput.classList.add('error');
    passwordError.textContent = 'Password must be at least 8 characters';
    passwordError.classList.add('visible');
    valid = false;
  } else if (!/[A-Z]/.test(pwd)) {
    passwordInput.classList.add('error');
    passwordError.textContent = 'Password must contain at least one uppercase letter';
    passwordError.classList.add('visible');
    valid = false;
  } else if (!/[0-9]/.test(pwd)) {
    passwordInput.classList.add('error');
    passwordError.textContent = 'Password must contain at least one number';
    passwordError.classList.add('visible');
    valid = false;
  } else {
    passwordInput.classList.remove('error');
    passwordError.classList.remove('visible');
  }

  if (!valid) return; // stop here if form has errors

  // ── Call backend API ──
  setLoading(true);

  try {
    const response = await fetch('/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        email:    emailInput.value.trim().toLowerCase(),
        password: passwordInput.value,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      // Save the token so other pages know the user is logged in
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userRole',  data.role);   // e.g. "admin" | "driver"

      // Redirect to role selector (or dashboard if role is already known)
      window.location.href = 'role-selector.html';

    } else {
      // Server returned an error (wrong email/password, account locked, etc.)
      alert(data.message || 'Invalid email or password. Please try again.');
    }

  } catch (err) {
    // Network failure or server is down
    console.error('Login error:', err);
    alert('Unable to connect. Please check your internet connection and try again.');

  } finally {
    // Always re-enable the button whether it succeeded or failed
    setLoading(false);
  }
});