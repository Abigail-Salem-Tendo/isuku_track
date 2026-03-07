// Password show/hide toggle
    const toggleBtn   = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    toggleBtn.addEventListener('click', function () {
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.textContent = 'Hide';
      } else {
        passwordInput.type = 'password';
        toggleBtn.textContent = 'Show';
      }
    });

    // Form validation
    const loginForm     = document.getElementById('loginForm');
    const emailInput    = document.getElementById('email');
    const emailError    = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');

    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      let valid = true;

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailInput.value || !emailRegex.test(emailInput.value)) {
        emailInput.classList.add('error');
        emailError.classList.add('visible');
        valid = false;
      } else {
        emailInput.classList.remove('error');
        emailError.classList.remove('visible');
      }

      // Validate password
      if (!passwordInput.value) {
        passwordInput.classList.add('error');
        passwordError.classList.add('visible');
        valid = false;
      } else {
        passwordInput.classList.remove('error');
        passwordError.classList.remove('visible');
      }

      if (valid) {
        // TODO: connect to backend
        window.location.href = 'role-selector.html';
      }
    });