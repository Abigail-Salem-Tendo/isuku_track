// login.js — Tab switching & password toggle for login.html

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

/**
 * Switch the visible pane and update tabs + heading text.
 * @param {'login' | 'register'} target
 */
function switchPane(target) {
  // Update tabs
  document.querySelectorAll('.auth-tab').forEach((tab) => {
    tab.classList.toggle('auth-tab--active', tab.dataset.tab === target);
  });

  // Update panes
  document.querySelectorAll('.auth-pane').forEach((pane) => {
    pane.classList.toggle('auth-pane--active', pane.id === `pane-${target}`);
  });

  // Update heading
  const config = PANE_CONFIG[target];
  document.getElementById('formTitle').textContent = config.title;
  document.getElementById('formSubtitle').textContent = config.subtitle;
}

// ── Tab button clicks ──
document.querySelectorAll('.auth-tab').forEach((tab) => {
  tab.addEventListener('click', () => switchPane(tab.dataset.tab));
});

// ── "Register here" / "Sign in" footer link clicks ──
document.querySelectorAll('[data-switch]').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    switchPane(link.dataset.switch);
  });
});

// ── Password visibility toggle ──
document.querySelectorAll('.toggle-password').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    btn.textContent = isHidden ? 'Hide' : 'Show';
  });
});