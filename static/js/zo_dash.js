/* ============================================
   zo_dash.js — Zone Operator Dashboard Logic
   Isuku Track · DevStrickers
   ============================================ */

/* ── Sidebar toggle (hamburger / overlay) ── */
function toggleSb() {
  document.querySelector('.sb').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('open');
}

function textOf(el) {
  return el ? el.textContent.trim() : '';
}

function currentFilterLabel() {
  const active = document.querySelector('.ftab.on');
  return active ? textOf(active) : 'All';
}

function claimsStatus(item) {
  const actions = item.querySelector('.ci-acts');
  const badge = actions ? actions.querySelector('.b') : null;
  if (!badge) return 'Pending';

  const value = textOf(badge).toLowerCase();
  if (value.indexOf('progress') !== -1) return 'In Progress';
  if (value.indexOf('resolved') !== -1 || value.indexOf('approved') !== -1 || value.indexOf('rejected') !== -1) {
    return 'Resolved';
  }
  return 'Pending';
}

function schedulesStatus(item) {
  const badge = item.querySelector('.si-right .b');
  if (badge && textOf(badge).toLowerCase().indexOf('completed') !== -1) {
    return 'Completed';
  }

  const when = textOf(item.querySelector('.si-time .sd')).toLowerCase();
  if (when.indexOf('today') !== -1) return 'Today';
  return 'Upcoming';
}

function paymentsStatus(item) {
  if (item.querySelector('.pay-actions')) return 'Pending';

  const badge = item.querySelector('.b');
  const value = textOf(badge).toLowerCase();
  if (value.indexOf('approved') !== -1) return 'Approved';
  if (value.indexOf('rejected') !== -1) return 'Rejected';
  return 'Pending';
}

function residentsStatus(item) {
  const badge = item.querySelector('.b');
  const value = textOf(badge).toLowerCase();
  if (value.indexOf('inactive') !== -1) return 'Inactive';
  if (value.indexOf('pending') !== -1) return 'New';
  return 'Active';
}

function residentsSearchTerm() {
  const input = document.querySelector('.search-inp');
  return input ? input.value.trim().toLowerCase() : '';
}

function applyClaimsFilter(filterName) {
  document.querySelectorAll('.ci').forEach(item => {
    const status = claimsStatus(item);
    item.style.display = (filterName === 'All' || status === filterName) ? '' : 'none';
  });
}

function applySchedulesFilter(filterName) {
  document.querySelectorAll('.si').forEach(item => {
    const status = schedulesStatus(item);
    item.style.display = (filterName === 'All' || status === filterName) ? '' : 'none';
  });
}

function applyPaymentsFilter(filterName) {
  document.querySelectorAll('.pi').forEach(item => {
    const status = paymentsStatus(item);
    item.style.display = (filterName === 'All' || status === filterName) ? '' : 'none';
  });
}

function applyResidentsFilter(filterName) {
  const search = residentsSearchTerm();
  document.querySelectorAll('.ri').forEach(item => {
    const status = residentsStatus(item);
    const matchesStatus = (filterName === 'All' || status === filterName);
    const text = textOf(item).toLowerCase();
    const matchesSearch = !search || text.indexOf(search) !== -1;
    item.style.display = (matchesStatus && matchesSearch) ? '' : 'none';
  });
}

function applyActiveFilter() {
  const filterName = currentFilterLabel();
  if (document.querySelector('.ri')) {
    applyResidentsFilter(filterName);
    return;
  }
  if (document.querySelector('.pi')) {
    applyPaymentsFilter(filterName);
    return;
  }
  if (document.querySelector('.si')) {
    applySchedulesFilter(filterName);
    return;
  }
  if (document.querySelector('.ci')) {
    applyClaimsFilter(filterName);
  }
}

function filterTab(el) {
  document.querySelectorAll('.ftab').forEach(t => t.classList.remove('on'));
  el.classList.add('on');
  applyActiveFilter();
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
  applyActiveFilter();

  /* Second click: Ongoing → Completed */
  btn.onclick = function () {
    badge.className = 'b ok';
    badge.textContent = 'Completed';
    btn.style.display = 'none';
    applyActiveFilter();
  };
}

/* ── Claims: approve / reject with visual feedback ── */
document.querySelectorAll('.btn-ok').forEach(btn => {
  btn.addEventListener('click', () => {
    const ci = btn.closest('.ci');
    if (!ci) return;
    const acts = ci.querySelector('.ci-acts');
    acts.innerHTML = '<span class="b ok">Approved</span>';
    applyActiveFilter();
  });
});

document.querySelectorAll('.btn-no').forEach(btn => {
  btn.addEventListener('click', () => {
    const ci = btn.closest('.ci');
    if (!ci) return;
    const acts = ci.querySelector('.ci-acts');
    acts.innerHTML = '<span class="b op">Rejected</span>';
    applyActiveFilter();
  });
});

/* ── Payments: verify & approve / reject ── */
document.querySelectorAll('.pay-actions').forEach(wrap => {
  const approveBtn = wrap.querySelector('.btn-approve-pay');
  const rejectBtn  = wrap.querySelector('.btn-reject-pay');

  if (approveBtn) {
    approveBtn.addEventListener('click', () => {
      wrap.innerHTML = '<span class="b ok">Approved</span>';
      applyActiveFilter();
    });
  }
  if (rejectBtn) {
    rejectBtn.addEventListener('click', () => {
      wrap.innerHTML = '<span class="b op">Rejected</span>';
      applyActiveFilter();
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

if (document.querySelector('.ftabs')) {
  applyActiveFilter();
}

const residentsSearchInput = document.querySelector('.search-inp');
if (residentsSearchInput && document.querySelector('.ri')) {
  residentsSearchInput.addEventListener('input', applyActiveFilter);
}