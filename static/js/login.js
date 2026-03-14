
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


// ============================================================
//  REGISTRATION MODAL
// ============================================================

// ─── 7. MODAL CONTROLS ──────────────────────────────────────
const registerModal = document.getElementById('registerModal');
const openRegisterBtn = document.getElementById('openRegisterModal');
const closeRegisterBtn = document.getElementById('closeRegisterModal');
const registerForm = document.getElementById('registerForm');

// Open modal
openRegisterBtn.addEventListener('click', function(e) {
  e.preventDefault();
  registerModal.classList.add('active');
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
});

// Close modal
closeRegisterBtn.addEventListener('click', function() {
  registerModal.classList.remove('active');
  document.body.style.overflow = ''; // Restore scrolling
});

// Close modal when clicking outside
registerModal.addEventListener('click', function(e) {
  if (e.target === registerModal) {
    registerModal.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && registerModal.classList.contains('active')) {
    registerModal.classList.remove('active');
    document.body.style.overflow = '';
  }
});


// ─── 8. REGISTRATION FORM ELEMENTS ──────────────────────────
const fullNamesInput = document.getElementById('fullNames');
const registerEmailInput = document.getElementById('registerEmail');
const phoneNumberInput = document.getElementById('phoneNumber');
const zoneSelect = document.getElementById('zone');
const registerPasswordInput = document.getElementById('registerPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');

const fullNamesError = document.getElementById('fullNamesError');
const registerEmailError = document.getElementById('registerEmailError');
const phoneNumberError = document.getElementById('phoneNumberError');
const zoneError = document.getElementById('zoneError');
const registerPasswordError = document.getElementById('registerPasswordError');
const confirmPasswordError = document.getElementById('confirmPasswordError');

const toggleRegisterPassword = document.getElementById('toggleRegisterPassword');
const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
const registerSubmitBtn = registerForm.querySelector('button[type="submit"]');


// ─── 9. PASSWORD TOGGLE FOR REGISTRATION ────────────────────
toggleRegisterPassword.addEventListener('click', function() {
  if (registerPasswordInput.type === 'password') {
    registerPasswordInput.type = 'text';
    toggleRegisterPassword.textContent = 'Hide';
  } else {
    registerPasswordInput.type = 'password';
    toggleRegisterPassword.textContent = 'Show';
  }
});

toggleConfirmPassword.addEventListener('click', function() {
  if (confirmPasswordInput.type === 'password') {
    confirmPasswordInput.type = 'text';
    toggleConfirmPassword.textContent = 'Hide';
  } else {
    confirmPasswordInput.type = 'password';
    toggleConfirmPassword.textContent = 'Show';
  }
});


// ─── 10. REGISTRATION FORM VALIDATION ───────────────────────
// Real-time validation for full names
fullNamesInput.addEventListener('input', function() {
  const value = fullNamesInput.value.trim();
  if (!value) {
    fullNamesInput.classList.add('error');
    fullNamesError.textContent = 'Full names are required';
    fullNamesError.classList.add('visible');
  } else if (value.length < 3) {
    fullNamesInput.classList.add('error');
    fullNamesError.textContent = 'Please enter your full names';
    fullNamesError.classList.add('visible');
  } else {
    fullNamesInput.classList.remove('error');
    fullNamesError.classList.remove('visible');
  }
});

// Real-time validation for email
registerEmailInput.addEventListener('input', function() {
  const value = registerEmailInput.value.trim();
  if (!value) {
    registerEmailInput.classList.add('error');
    registerEmailError.textContent = 'Email address is required';
    registerEmailError.classList.add('visible');
  } else if (!emailRegex.test(value)) {
    registerEmailInput.classList.add('error');
    registerEmailError.textContent = 'Please enter a valid email address';
    registerEmailError.classList.add('visible');
  } else {
    registerEmailInput.classList.remove('error');
    registerEmailError.classList.remove('visible');
  }
});

// Real-time validation for phone number
const phoneRegex = /^[0-9+\-\s()]{10,}$/;
phoneNumberInput.addEventListener('input', function() {
  const value = phoneNumberInput.value.trim();
  if (!value) {
    phoneNumberInput.classList.add('error');
    phoneNumberError.textContent = 'Phone number is required';
    phoneNumberError.classList.add('visible');
  } else if (!phoneRegex.test(value)) {
    phoneNumberInput.classList.add('error');
    phoneNumberError.textContent = 'Please enter a valid phone number';
    phoneNumberError.classList.add('visible');
  } else {
    phoneNumberInput.classList.remove('error');
    phoneNumberError.classList.remove('visible');
  }
});

// Real-time validation for zone
zoneSelect.addEventListener('change', function() {
  if (!zoneSelect.value) {
    zoneSelect.classList.add('error');
    zoneError.classList.add('visible');
  } else {
    zoneSelect.classList.remove('error');
    zoneError.classList.remove('visible');
  }
});

// Real-time validation for password
registerPasswordInput.addEventListener('input', function() {
  const value = registerPasswordInput.value;
  
  if (!value) {
    registerPasswordInput.classList.add('error');
    registerPasswordError.textContent = 'Password is required';
    registerPasswordError.classList.add('visible');
  } else if (value.length < 8) {
    registerPasswordInput.classList.add('error');
    registerPasswordError.textContent = 'Password must be at least 8 characters';
    registerPasswordError.classList.add('visible');
  } else if (!/[A-Z]/.test(value)) {
    registerPasswordInput.classList.add('error');
    registerPasswordError.textContent = 'Password must contain at least one uppercase letter';
    registerPasswordError.classList.add('visible');
  } else if (!/[0-9]/.test(value)) {
    registerPasswordInput.classList.add('error');
    registerPasswordError.textContent = 'Password must contain at least one number';
    registerPasswordError.classList.add('visible');
  } else {
    registerPasswordInput.classList.remove('error');
    registerPasswordError.classList.remove('visible');
  }
  
  // Also check confirm password match if it has a value
  if (confirmPasswordInput.value) {
    confirmPasswordInput.dispatchEvent(new Event('input'));
  }
});

// Real-time validation for confirm password
confirmPasswordInput.addEventListener('input', function() {
  const value = confirmPasswordInput.value;
  const passwordValue = registerPasswordInput.value;
  
  if (!value) {
    confirmPasswordInput.classList.add('error');
    confirmPasswordError.textContent = 'Please confirm your password';
    confirmPasswordError.classList.add('visible');
  } else if (value !== passwordValue) {
    confirmPasswordInput.classList.add('error');
    confirmPasswordError.textContent = 'Passwords do not match';
    confirmPasswordError.classList.add('visible');
  } else {
    confirmPasswordInput.classList.remove('error');
    confirmPasswordError.classList.remove('visible');
  }
});


// ─── 11. REGISTRATION FORM SUBMIT ────────────────────────────
registerForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  let valid = true;
  
  // Validate full names
  const fullNames = fullNamesInput.value.trim();
  if (!fullNames || fullNames.length < 3) {
    fullNamesInput.classList.add('error');
    fullNamesError.textContent = fullNames ? 'Please enter your full names' : 'Full names are required';
    fullNamesError.classList.add('visible');
    valid = false;
  } else {
    fullNamesInput.classList.remove('error');
    fullNamesError.classList.remove('visible');
  }
  
  // Validate email
  const email = registerEmailInput.value.trim();
  if (!email || !emailRegex.test(email)) {
    registerEmailInput.classList.add('error');
    registerEmailError.textContent = email ? 'Please enter a valid email address' : 'Email address is required';
    registerEmailError.classList.add('visible');
    valid = false;
  } else {
    registerEmailInput.classList.remove('error');
    registerEmailError.classList.remove('visible');
  }
  
  // Validate phone number
  const phone = phoneNumberInput.value.trim();
  if (!phone || !phoneRegex.test(phone)) {
    phoneNumberInput.classList.add('error');
    phoneNumberError.textContent = phone ? 'Please enter a valid phone number' : 'Phone number is required';
    phoneNumberError.classList.add('visible');
    valid = false;
  } else {
    phoneNumberInput.classList.remove('error');
    phoneNumberError.classList.remove('visible');
  }
  
  // Validate zone
  if (!zoneSelect.value) {
    zoneSelect.classList.add('error');
    zoneError.classList.add('visible');
    valid = false;
  } else {
    zoneSelect.classList.remove('error');
    zoneError.classList.remove('visible');
  }
  
  // Validate password
  const password = registerPasswordInput.value;
  if (!password) {
    registerPasswordInput.classList.add('error');
    registerPasswordError.textContent = 'Password is required';
    registerPasswordError.classList.add('visible');
    valid = false;
  } else if (password.length < 8) {
    registerPasswordInput.classList.add('error');
    registerPasswordError.textContent = 'Password must be at least 8 characters';
    registerPasswordError.classList.add('visible');
    valid = false;
  } else if (!/[A-Z]/.test(password)) {
    registerPasswordInput.classList.add('error');
    registerPasswordError.textContent = 'Password must contain at least one uppercase letter';
    registerPasswordError.classList.add('visible');
    valid = false;
  } else if (!/[0-9]/.test(password)) {
    registerPasswordInput.classList.add('error');
    registerPasswordError.textContent = 'Password must contain at least one number';
    registerPasswordError.classList.add('visible');
    valid = false;
  } else {
    registerPasswordInput.classList.remove('error');
    registerPasswordError.classList.remove('visible');
  }
  
  // Validate confirm password
  const confirmPassword = confirmPasswordInput.value;
  if (!confirmPassword) {
    confirmPasswordInput.classList.add('error');
    confirmPasswordError.textContent = 'Please confirm your password';
    confirmPasswordError.classList.add('visible');
    valid = false;
  } else if (confirmPassword !== password) {
    confirmPasswordInput.classList.add('error');
    confirmPasswordError.textContent = 'Passwords do not match';
    confirmPasswordError.classList.add('visible');
    valid = false;
  } else {
    confirmPasswordInput.classList.remove('error');
    confirmPasswordError.classList.remove('visible');
  }
  
  if (!valid) return;
  
  // Set loading state
  registerSubmitBtn.disabled = true;
  registerSubmitBtn.textContent = 'Creating Account…';
  registerSubmitBtn.style.opacity = '0.7';
  
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullNames: fullNames,
        email: email.toLowerCase(),
        phoneNumber: phone,
        zone: zoneSelect.value,
        password: password
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Success - show message and close modal
      alert('Account created successfully! Please sign in with your credentials.');
      registerModal.classList.remove('active');
      document.body.style.overflow = '';
      registerForm.reset();
      
      // Optionally pre-fill the login email
      emailInput.value = email;
    } else {
      // Server returned an error
      alert(data.message || 'Registration failed. Please try again.');
    }
    
  } catch (err) {
    console.error('Registration error:', err);
    alert('Unable to connect. Please check your internet connection and try again.');
    
  } finally {
    // Reset button state
    registerSubmitBtn.disabled = false;
    registerSubmitBtn.textContent = 'Create Account';
    registerSubmitBtn.style.opacity = '1';
  }
});