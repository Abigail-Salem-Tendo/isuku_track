document.addEventListener('DOMContentLoaded', function () {
  const notificationToggle = document.getElementById('notificationToggle');
  const notificationPanel = document.querySelector('.notification-panel');
  const notificationList = document.getElementById('notificationList');
  const markAllReadBtn = document.getElementById('markAllReadBtn');

  if (!notificationToggle || !notificationPanel) return;

  const STORAGE_KEY = 'notifications_read_at';
  let notifications = [];

  // Fetch derived notifications from API
  async function fetchNotifications() {
    try {
      const response = await API.get('/notifications/');
      notifications = response || [];
      renderNotifications();
    } catch (error) {
      console.log('Notifications fetch failed');
    }
  }

  // Check if an item is unread (newer than last mark-all-read timestamp)
  function isUnread(item) {
    const readAt = localStorage.getItem(STORAGE_KEY);
    if (!readAt) return true;
    return new Date(item.date) > new Date(readAt);
  }

  // Render notification list
  function renderNotifications() {
    if (!notificationList) return;

    if (notifications.length === 0) {
      notificationList.innerHTML = '<div style="padding:16px;text-align:center;color:#999;">No notifications</div>';
      return;
    }

    notificationList.innerHTML = notifications.map(n => `
      <div class="notification-item ${isUnread(n) ? 'unread' : 'read'}" data-id="${n.id}">
        <div class="notification-item__icon">
          ${getNotificationIcon(n.type)}
        </div>
        <div class="notification-item__content">
          <div class="notification-item__title">${escapeHtml(n.title)}</div>
          <div class="notification-item__message">${escapeHtml(n.message)}</div>
          <div class="notification-item__time">${getTimeAgo(n.date)}</div>
        </div>
      </div>
    `).join('');
  }

  // Get icon for notification type
  function getNotificationIcon(type) {
    const approved = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
    const rejected = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    const icons = {
      'payment_approved': approved,
      'payment_rejected': rejected,
      'claim_approved': approved,
      'claim_rejected': rejected
    };
    return icons[type] || approved;
  }

  // Convert timestamp to "X ago" format
  function getTimeAgo(timestamp) {
    const now = new Date();
    const notifTime = new Date(timestamp);
    const diff = Math.floor((now - notifTime) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }

  // Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Mark all as read (localStorage only — no API call)
  if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', function () {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      renderNotifications();
    });
  }

  // Toggle panel and fetch on open
  notificationToggle.addEventListener('click', function (e) {
    e.stopPropagation();
    const isOpening = !notificationPanel.classList.contains('show');
    notificationPanel.classList.toggle('show');
    if (isOpening) fetchNotifications();
  });

  // Close panel when clicking outside
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.notification-panel') && !e.target.closest('#notificationToggle')) {
      notificationPanel.classList.remove('show');
    }
  });
});
