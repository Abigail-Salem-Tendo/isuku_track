// Shared notification panel logic for Zone Operator and Admin pages
// Uses IDs: notifToggle, notifPanel, notifList, markAllReadBtn, notifDot

document.addEventListener('DOMContentLoaded', function () {
  const toggle = document.getElementById('notifToggle');
  const panel = document.getElementById('notifPanel');
  const list = document.getElementById('notifList');
  const dot = document.getElementById('notifDot');
  const markAllBtn = document.getElementById('markAllReadBtn');

  if (!toggle || !panel) return;

  const STORAGE_KEY = 'notifications_read_at';
  let notifications = [];

  async function fetchNotifications() {
    try {
      notifications = await API.get('/notifications/') || [];
      renderList();
      updateDot();
    } catch (e) {
      console.log('Notifications fetch failed');
    }
  }

  function isUnread(item) {
    const readAt = localStorage.getItem(STORAGE_KEY);
    if (!readAt) return true;
    return new Date(item.date) > new Date(readAt);
  }

  function updateDot() {
    if (!dot) return;
    const hasUnread = notifications.some(isUnread);
    dot.style.display = hasUnread ? 'block' : 'none';
  }

  function renderList() {
    if (!list) return;

    if (notifications.length === 0) {
      list.innerHTML = '<div class="notif-empty">No notifications</div>';
      return;
    }

    list.innerHTML = notifications.map(n => `
      <div class="notif-item ${isUnread(n) ? 'unread' : ''}">
        <div class="notif-icon">${getIcon(n.type)}</div>
        <div class="notif-content">
          <div class="notif-title">${escapeHtml(n.title)}</div>
          <div class="notif-msg">${escapeHtml(n.message)}</div>
          <div class="notif-time">${timeAgo(n.date)}</div>
        </div>
      </div>
    `).join('');
  }

  function getIcon(type) {
    const check = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
    const cross = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    const bell  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
    const cal   = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
    const map = {
      claim_approved: check, claim_rejected: cross,
      payment_approved: check, payment_rejected: cross,
      claim_incoming: bell, payment_incoming: bell,
      schedule_upcoming: cal, schedule_ongoing: cal, schedule_completed: check,
      suggestion_new: bell
    };
    return map[type] || bell;
  }

  function timeAgo(iso) {
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }

  function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  // Mark all as read
  if (markAllBtn) {
    markAllBtn.addEventListener('click', function () {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      renderList();
      updateDot();
    });
  }

  // Toggle panel and fetch on open
  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    const opening = !panel.classList.contains('show');
    panel.classList.toggle('show');
    if (opening) fetchNotifications();
  });

  // Close on outside click
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#notifPanel') && !e.target.closest('#notifToggle')) {
      panel.classList.remove('show');
    }
  });
});
