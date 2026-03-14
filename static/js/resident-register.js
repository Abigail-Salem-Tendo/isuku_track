
    // Password toggle — main password
    const togglePassword  = document.getElementById('togglePassword');
    const passwordInput   = document.getElementById('password');

    togglePassword.addEventListener('click', function () {
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        togglePassword.textContent = 'Hide';
      } else {
        passwordInput.type = 'password';
        togglePassword.textContent = 'Show';
      }
    });

    // Password toggle — confirm password
    const toggleConfirm   = document.getElementById('toggleConfirm');
    const confirmInput    = document.getElementById('confirmPassword');

    toggleConfirm.addEventListener('click', function () {
      if (confirmInput.type === 'password') {
        confirmInput.type = 'text';
        toggleConfirm.textContent = 'Hide';
      } else {
        confirmInput.type = 'password';
        toggleConfirm.textContent = 'Show';
      }
    });

    // Form validation
    const form = document.getElementById('residentForm');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      let valid = true;

      // Helper functions
      function showError(inputId, errorId) {
        document.getElementById(inputId).classList.add('error');
        document.getElementById(errorId).classList.add('visible');
      }

      function clearError(inputId, errorId) {
        document.getElementById(inputId).classList.remove('error');
        document.getElementById(errorId).classList.remove('visible');
      }

      // Full name
      const fullName = document.getElementById('fullName');
      if (!fullName.value.trim()) {
        showError('fullName', 'fullNameError');
        valid = false;
      } else {
        clearError('fullName', 'fullNameError');
      }

      // Email
      const email = document.getElementById('email');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.value || !emailRegex.test(email.value)) {
        showError('email', 'emailError');
        valid = false;
      } else {
        clearError('email', 'emailError');
      }

      // Phone
      const phone = document.getElementById('phone');
      if (!phone.value.trim()) {
        showError('phone', 'phoneError');
        valid = false;
      } else {
        clearError('phone', 'phoneError');
      }

      // Password
      const password = document.getElementById('password');
      if (password.value.length < 6) {
        showError('password', 'passwordError');
        valid = false;
      } else {
        clearError('password', 'passwordError');
      }

      // Confirm password
      const confirm = document.getElementById('confirmPassword');
      if (confirm.value !== password.value) {
        showError('confirmPassword', 'confirmPasswordError');
        valid = false;
      } else {
        clearError('confirmPassword', 'confirmPasswordError');
      }

      // Zone
      const zone = document.getElementById('zone');
      if (!zone.value) {
        showError('zone', 'zoneError');
        valid = false;
      } else {
        clearError('zone', 'zoneError');
      }

      if (valid) {
        // TODO: connect to backend
        console.log('Resident form valid — submitting');
      }
    });

