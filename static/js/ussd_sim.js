(() => {
  // ── Demo resident data ──
  const DEMO = {
    name: 'Jean Pierre K.',
    zone: 'Zone A – Kimironko',
    zo_contact: '0789 001 234',
    points: 45,
    zone_fee: 2500,
    currency: 'RWF',
    claims: [
      { date: 'Mar 20', category: 'missed_collection', status: 'open' },
      { date: 'Feb 15', category: 'overflow',          status: 'approved' },
      { date: 'Jan 08', category: 'other',             status: 'rejected' },
    ],
    next_pickup: 'Apr 01 07:00 – 09:00',
  };

  const CAT = {
    '1': 'Missed collection',
    '2': 'Overflow',
    '3': 'Illegal dumping',
    '4': 'Damaged infrastructure',
    '5': 'Environmental hazard',
    '6': 'Other',
  };

  // ── State machine — mirrors ussd.py logic ──
  function ussd(tokens) {
    const MAIN =
      'Welcome to IsukuTrack\n' +
      '1. Pay monthly fee\n' +
      '2. Submit claim\n' +
      '3. Check claim status\n' +
      '4. View schedule\n' +
      '5. Profile & zone info\n' +
      '6. Loyalty points\n' +
      '0. Exit';

    if (tokens.length === 0) return con(MAIN);

    const c = tokens[0];

    if (c === '0') return end('Goodbye.');

    // 1 — Pay monthly fee
    if (c === '1') {
      if (tokens.length === 1) return con('Enter month (1-12):');
      const month = parseInt(tokens[1]);
      if (isNaN(month) || month < 1 || month > 12) return con('Invalid month.\nEnter 1-12:');
      if (tokens.length === 2) return con('Enter year (YYYY):');
      const year = parseInt(tokens[2]);
      if (isNaN(year) || year < 2000 || year > 2100) return con('Invalid year.\nEnter YYYY:');
      if (tokens.length === 3)
        return con(`Fee for ${month}/${year}:\n${DEMO.zone_fee.toLocaleString()} ${DEMO.currency}\n\n1. Confirm\n0. Cancel`);
      if (tokens[3] === '0') return end('Cancelled.');
      if (tokens[3] === '1')
        return end(`Payment submitted!\n${DEMO.zone_fee.toLocaleString()} RWF\nfor ${month}/${year}.\nPending review.`);
      return end('Invalid option.');
    }

    // 2 — Submit claim
    if (c === '2') {
      if (tokens.length === 1)
        return con(
          'Choose category:\n' +
          '1. Missed collection\n' +
          '2. Overflow\n' +
          '3. Illegal dumping\n' +
          '4. Damaged infra\n' +
          '5. Environmental\n' +
          '6. Other'
        );
      if (!CAT[tokens[1]]) return end('Invalid category.\nRestart.');
      if (tokens.length === 2) return con('Describe the issue:', true); // true = freeText
      return end(
        'Claim submitted!\nRef: #CLM-' +
        Math.floor(Math.random() * 9000 + 1000) +
        '\nWe will review it.'
      );
    }

    // 3 — Check claim status
    if (c === '3') {
      const lines = DEMO.claims.map(cl =>
        `${cl.date} ${cl.category.replace('_', ' ')}:\n  ${cl.status.toUpperCase()}`
      );
      return end('Your last claims:\n\n' + lines.join('\n'));
    }

    // 4 — View schedule
    if (c === '4') {
      return end(`Next pickup:\n${DEMO.next_pickup}\n\nZone: ${DEMO.zone}`);
    }

    // 5 — Profile & zone info
    if (c === '5') {
      return end(`Name: ${DEMO.name}\nZone: ${DEMO.zone}\nZO: ${DEMO.zo_contact}`);
    }

    // 6 — Loyalty points
    if (c === '6') {
      return end(`Points: ${DEMO.points} pts\n\nEarn 5 pts per\non-time payment.`);
    }

    return end('Invalid option.');
  }

  function con(text, freeText = false) { return { text, end: false, freeText }; }
  function end(text)                   { return { text, end: true,  freeText: false }; }

  // ── DOM refs ──
  const phoneInput = document.getElementById('phoneInput');
  const screenBody = document.getElementById('screenBody');
  const inputRow   = document.getElementById('inputRow');
  const typedEl    = document.getElementById('typedDisplay');
  const statusPill = document.getElementById('statusPill');
  const pathBar    = document.getElementById('pathBar');
  const textHint   = document.getElementById('textHint');
  const dialBtn    = document.getElementById('dialBtn');
  const endBtn     = document.getElementById('endBtn');
  const clearBtn   = document.getElementById('clearBtn');
  const backBtn    = document.getElementById('backBtn');
  const keypadEl   = document.getElementById('keypad');

  // ── Session state ──
  let accumText    = '';
  let typed        = '';
  let active       = false;
  let sessionEnded = false;
  let freeTextMode = false; // when true, accept any keyboard chars

  // ── Helpers ──
  function showScreen(text, dim = false) {
    screenBody.textContent = text;
    screenBody.className   = 'screen-body' + (dim ? ' dim' : '');
  }

  function setStatus(s) {
    const map = { idle: 'IDLE', active: 'LIVE', ended: 'ENDED', loading: '...' };
    statusPill.className   = 'status-pill ' + s;
    statusPill.textContent = map[s] || s;
  }

  function updateTyped() { typedEl.textContent = typed; }

  function updatePath() {
    pathBar.textContent = accumText
      ? 'Path: ' + accumText.split('*').join(' › ')
      : '—';
  }

  function lockKeypad(locked) {
    keypadEl.querySelectorAll('.key').forEach(k =>
      locked ? k.classList.add('disabled') : k.classList.remove('disabled')
    );
  }

  function setFreeTextMode(on) {
    freeTextMode = on;
    textHint.style.display = on ? 'block' : 'none';
    // dim keypad in text mode — numbers still work but text is primary
    keypadEl.style.opacity = on ? '0.45' : '1';
  }

  // ── Process step ──
  function processStep(tokens) {
    const result = ussd(tokens);
    showScreen(result.text);
    setFreeTextMode(result.freeText || false);

    if (result.end) {
      sessionEnded = true;
      active       = false;
      setStatus('ended');
      inputRow.style.display = 'none';
      dialBtn.textContent = 'New Session';
      dialBtn.disabled    = false;
      lockKeypad(true);
    } else {
      setStatus('active');
      lockKeypad(false);
    }
  }

  // ── Start session ──
  function startSession() {
    const phone = phoneInput.value.trim();
    if (!phone) {
      phoneInput.style.borderColor = '#c0392b';
      setTimeout(() => { phoneInput.style.borderColor = ''; }, 1200);
      return;
    }
    accumText    = '';
    typed        = '';
    active       = true;
    sessionEnded = false;

    inputRow.style.display = 'flex';
    dialBtn.textContent    = 'Send';
    dialBtn.disabled       = false;

    updateTyped();
    updatePath();
    processStep([]);
  }

  // ── Submit current input ──
  function submitInput() {
    if (!active) return;
    const step = typed.trim();
    if (!step) return;

    const next   = accumText ? accumText + '*' + step : step;
    accumText    = next;
    typed        = '';
    updateTyped();
    updatePath();
    setFreeTextMode(false);

    processStep(accumText.split('*').filter(Boolean));
  }

  // ── Reset ──
  function resetSession() {
    accumText    = '';
    typed        = '';
    active       = false;
    sessionEnded = false;

    showScreen('Press Dial to start', true);
    inputRow.style.display = 'none';
    setStatus('idle');
    lockKeypad(false);
    setFreeTextMode(false);
    updatePath();
    updateTyped();
    dialBtn.textContent = 'Dial *123#';
    dialBtn.disabled    = false;
  }

  // ── Keypad clicks ──
  keypadEl.addEventListener('click', e => {
    const key = e.target.closest('.key');
    if (!key || key.classList.contains('disabled') || !active) return;
    const v = key.dataset.k;
    if (v === 'del') typed = typed.slice(0, -1);
    else typed += v;
    updateTyped();
  });

  // ── Physical keyboard ──
  document.addEventListener('keydown', e => {
    if (!active) return;

    if (e.key === 'Enter') { submitInput(); e.preventDefault(); return; }
    if (e.key === 'Backspace') { typed = typed.slice(0, -1); updateTyped(); e.preventDefault(); return; }

    if (freeTextMode) {
      // Allow any printable character
      if (e.key.length === 1) { typed += e.key; updateTyped(); e.preventDefault(); }
    } else {
      // Numeric only
      if (/^[0-9*]$/.test(e.key)) { typed += e.key; updateTyped(); e.preventDefault(); }
    }
  });

  // ── Button events ──
  dialBtn.addEventListener('click', () => {
    if (!active && !sessionEnded) startSession();
    else if (sessionEnded)        resetSession();
    else                          submitInput();
  });

  endBtn.addEventListener('click', resetSession);

  clearBtn.addEventListener('click', () => { typed = ''; updateTyped(); });

  backBtn.addEventListener('click', () => {
    if (!active) return;
    const parts = accumText.split('*').filter(Boolean);
    parts.pop();
    accumText = parts.join('*');
    typed     = '';
    setFreeTextMode(false);
    updateTyped();
    updatePath();
    processStep(parts);
  });
})();
