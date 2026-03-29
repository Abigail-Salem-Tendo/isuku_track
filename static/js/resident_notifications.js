document.addEventListener('DOMContentLoaded', function () {
  const notificationToggle = document.getElementById('notificationToggle');
  const notificationPanel = document.querySelector('.notification-panel');
  const notificationList = document.getElementById('notificationList');
  const notificationBadge = document.querySelector('.notification-badge');

  if (!notificationToggle || !notificationPanel) return;

  let notifications = [];

  // Fetch notifications from API
  async function fetchNotifications() {
    try {
      const response = await API.get('/payments/notifications');
      notifications = response || [];
      updateBadge();
      renderNotifications();
    } catch (error) {
      console.log('Notifications fetch failed');
    }
  }

  // Update badge with unread count
  function updateBadge() {
    const unreadCount = notifications.filter(n => !n.is_read).length;
    if (notificationBadge) {
      if (unreadCount > 0) {
        notificationBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        notificationBadge.style.display = 'block';
      } else {
        notificationBadge.style.display = 'none';
      }
    }
  }

  // Render notification list
  function renderNotifications() {
    if (!notificationList) return;

    if (notifications.length === 0) {
      notificationList.innerHTML = '<div style="padding:16px;text-align:center;color:#999;">No notifications</div>';
      return;
    }

    notificationList.innerHTML = notifications.map(n => `
      <div class="notification-item ${n.is_read ? 'read' : 'unread'}" data-id="${n.id}">
        <div class="notification-item__icon">
          ${getNotificationIcon(n.type)}
        </div>
        <div class="notification-item__content">
          <div class="notification-item__title">${escapeHtml(n.title)}</div>
          <div class="notification-item__time">${getTimeAgo(n.created_at)}</div>
        </div>
      </div>
    `).join('');
  }

  // Get icon for notification type
  function getNotificationIcon(type) {
    const icons = {
      'payment_approved': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      'payment_rejected': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      'claim_approved': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      'claim_rejected': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
    };
    return icons[type] || icons['payment_approved'];
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

  // Toggle panel
  notificationToggle.addEventListener('click', function (e) {
    e.stopPropagation();
    notificationPanel.classList.toggle('show');
  });

  // Close panel when clicking outside
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.notification-panel') && !e.target.closest('#notificationToggle')) {
      notificationPanel.classList.remove('show');
    }
  });

  // Mark notification as read on click
  document.addEventListener('click', function (e) {
    const item = e.target.closest('.notification-item');
    if (item) {
      const id = item.dataset.id;
      markAsRead(id);
    }
  });

  // Mark notification as read
  async function markAsRead(id) {
    try {
      await API.put(`/payments/notifications/${id}/read`, {});
      fetchNotifications();
    } catch (error) {
      console.log('Failed to mark notification as read');
    }
  }

  // Initial load and poll every 30 seconds
  fetchNotifications();
  setInterval(fetchNotifications, 30000);
});
