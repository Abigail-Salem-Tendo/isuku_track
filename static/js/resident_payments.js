// resident_payments.js

document.addEventListener('DOMContentLoaded', function () {

  // ── Filter tabs ──
  const tabs  = document.querySelectorAll('.tabs .tab[data-filter]');
  const cards = document.querySelectorAll('#paymentsList .card');

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.getAttribute('data-filter');
      cards.forEach(function (card) {
        card.style.display = (filter === 'all' || card.getAttribute('data-status') === filter)
          ? 'block' : 'none';
      });
    });
  });

  // ── Form validation ──
  const form = document.getElementById('paymentForm');

  function showError(inputId, errorId) {
    document.getElementById(inputId).classList.add('error');
    document.getElementById(errorId).classList.add('visible');
  }

  function clearError(inputId, errorId) {
    document.getElementById(inputId).classList.remove('error');
    document.getElementById(errorId).classList.remove('visible');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    let valid = true;

    // Payer name
    const payerName = document.getElementById('payerName');
    if (!payerName.value.trim()) {
      showError('payerName', 'payerNameError'); valid = false;
    } else {
      clearError('payerName', 'payerNameError');
    }

    // Payment time
    const paymentTime = document.getElementById('paymentTime');
    if (!paymentTime.value) {
      showError('paymentTime', 'paymentTimeError'); valid = false;
    } else {
      clearError('paymentTime', 'paymentTimeError');
    }

    // Amount
    const amount = document.getElementById('amount');
    if (!amount.value || parseFloat(amount.value) <= 0) {
      showError('amount', 'amountError'); valid = false;
    } else {
      clearError('amount', 'amountError');
    }

    if (valid) {
      // TODO: connect to backend
      // fetch('/api/payments', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('authToken') },
      //   body: JSON.stringify({
      //     payer_name: payerName.value,
      //     payment_time: paymentTime.value,
      //     amount: parseFloat(amount.value)
      //   })
      // })
      alert('Payment proof submitted! Your Zone Operator will verify it shortly.');
      form.reset();
    }
  });

  // TODO: load payment history from backend
  // fetch('/api/payments', { headers: { Authorization: 'Bearer ' + token } })
  //   .then(r => r.json())
  //   .then(data => renderPayments(data));

});