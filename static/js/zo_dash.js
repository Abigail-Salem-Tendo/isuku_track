/* ============================================
   zo_dash.js — Zone Operator Dashboard Logic
   Isuku Track · DevStrickers
   ============================================ */

/* ── Sidebar toggle (hamburger / overlay) ── */
function toggleSb() {
  document.querySelector('.sb').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('open');
}

/* ── Mobile bottom nav: highlight active tab ── */
document.querySelectorAll('.mn-item').forEach((el, i) => {
  if (i < 4) {
    el.addEventListener('click', () => {
      document.querySelectorAll('.mn-item').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
    });
  }
});

/* ── Schedule: start / complete route ── */
function startRoute(btn, badgeId) {
  const badge = document.getElementById(badgeId);

  /* First click: Not Started → Ongoing */
  badge.className = 'b go';
  badge.textContent = 'Ongoing';
  btn.textContent = 'Mark Complete';
  btn.classList.add('go');

  /* Second click: Ongoing → Completed */
  btn.onclick = function () {
    badge.className = 'b ok';
    badge.textContent = 'Completed';
    btn.style.display = 'none';
  };
}

/* ── Claims: approve / reject with visual feedback ── */
document.querySelectorAll('.btn-ok').forEach(btn => {
  btn.addEventListener('click', () => {
    const ci = btn.closest('.ci');
    const acts = ci.querySelector('.ci-acts');
    acts.innerHTML = '<span class="b ok">Approved</span>';
  });
});

document.querySelectorAll('.btn-no').forEach(btn => {
  btn.addEventListener('click', () => {
    const ci = btn.closest('.ci');
    const acts = ci.querySelector('.ci-acts');
    acts.innerHTML = '<span class="b op">Rejected</span>';
  });
});

/* ── Payments: verify & approve / reject ── */
document.querySelectorAll('.pay-actions').forEach(wrap => {
  const approveBtn = wrap.querySelector('.btn-approve-pay');
  const rejectBtn  = wrap.querySelector('.btn-reject-pay');

  if (approveBtn) {
    approveBtn.addEventListener('click', () => {
      wrap.innerHTML = '<span class="b ok">Approved</span>';
    });
  }
  if (rejectBtn) {
    rejectBtn.addEventListener('click', () => {
      wrap.innerHTML = '<span class="b op">Rejected</span>';
    });
  }
});

/* ── Weekly report: save remarks ── */
const saveBtn = document.querySelector('.btn-save');
if (saveBtn) {
  saveBtn.addEventListener('click', () => {
    saveBtn.textContent = 'Saved ✓';
    saveBtn.style.background = 'var(--g1)';
    setTimeout(() => {
      saveBtn.textContent = 'Save Remarks';
      saveBtn.style.background = '';
    }, 2000);
  });
}