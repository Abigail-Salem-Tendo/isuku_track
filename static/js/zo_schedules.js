/* ============================================
   zo_schedules.js — Zone Operator Schedules
   Full integration with schedule management
   ============================================ */

let currentUserZoneId = null;
let currentUserZoneName = null;
let allSchedules = [];
let currentFilter = 'all'; // Default filter

/* ── Get current user's zone from JWT ── */
async function getCurrentUserZone() {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.warn('No access token found');
      return { zone_id: null, zone_name: null };
    }

    const response = await fetch('/api/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const user = data.user || {};
      const zone = user.zone || {};
      return {
        zone_id: zone.id || null,
        zone_name: zone.name || null
      };
    }

    return { zone_id: null, zone_name: null };
  } catch (err) {
    console.error('Error getting current user zone:', err);
    return { zone_id: null, zone_name: null };
  }
}

/* ── Fetch schedules from API ── */
async function fetchSchedules(zoneId) {
  try {
    const token = localStorage.getItem('access_token');
    let url = '/api/schedules';

    if (zoneId) {
      url += `?zone_id=${zoneId}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return [];
    }

    const schedules = await response.json();
    return Array.isArray(schedules) ? schedules : [];
  } catch (err) {
    console.error('Error fetching schedules:', err);
    return [];
  }
}

/* ── Format date/time for display ── */
function formatDateTime(isoString) {
  const date = new Date(isoString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  if (isToday) {
    return { time, date: 'Today' };
  } else if (isTomorrow) {
    return { time, date: 'Tomorrow' };
  } else {
    const day = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dateNum = date.getDate();
    return { time, date: `${day} ${dateNum}` };
  }
}

/* ── Get status mapping ── */
function getStatusBadgeClass(status) {
  if (status === 'completed') return 'ok';
  if (status === 'ongoing') return 'go';
  return 'pe'; // pending/not_started
}

function getStatusText(status) {
  if (status === 'completed') return 'Completed';
  if (status === 'ongoing') return 'Ongoing';
  return 'Not Started';
}

/* ── Update schedule counters ── */
function updateScheduleCounters() {
  const pendingCount = allSchedules.filter(s => s.status === 'not_started').length;
  const ongoingCount = allSchedules.filter(s => s.status === 'ongoing').length;
  const completedCount = allSchedules.filter(s => s.status === 'completed').length;

  const pendingEl = document.getElementById('schedPendingCount');
  const ongoingEl = document.getElementById('schedOngoingCount');
  const completedEl = document.getElementById('schedCompletedCount');

  if (pendingEl) pendingEl.textContent = pendingCount;
  if (ongoingEl) ongoingEl.textContent = ongoingCount;
  if (completedEl) completedEl.textContent = completedCount;
}

/* ── Render schedule items ── */
function renderSchedules(schedules) {
  const tbody = document.querySelector('.schedules-table tbody');
  if (!tbody) return;

  // Clear existing rows
  tbody.innerHTML = '';

  if (schedules.length === 0) {
    tbody.innerHTML = `
      <tr style="text-align:center;color:var(--txt-m);">
        <td colspan="6" style="padding:40px;">
          No schedules found for your zone
        </td>
      </tr>
    `;
    return;
  }

  // Render each schedule as a table row
  schedules.forEach((schedule) => {
    const { time, date } = formatDateTime(schedule.date_time_start);
    const statusClass = getStatusBadgeClass(schedule.status);
    const statusText = getStatusText(schedule.status);
    const priority = schedule.priority_score ? schedule.priority_score.toFixed(1) : '0.0';
    const vehicleDisplay = schedule.vehicle_id ? `RAD ${String(schedule.vehicle_id).padStart(3, '0')}` : '—';

    let actionButton = '';
    if (schedule.status === 'not_started') {
      actionButton = `<button class="action-btn start" id="btn-${schedule.id}" onclick="startSchedule(${schedule.id}, this)">Start Route</button>`;
    } else if (schedule.status === 'ongoing') {
      actionButton = `<button class="action-btn complete" id="btn-${schedule.id}" onclick="completeSchedule(${schedule.id}, this)">Mark Complete</button>`;
    }

    const row = document.createElement('tr');
    row.id = `schedule-${schedule.id}`;
    row.dataset.status = schedule.status;
    row.innerHTML = `
      <td class="schedule-id">Route ${String(schedule.id).padStart(2, '0')}</td>
      <td class="schedule-datetime"><div>${time}</div><div style="font-size:0.75rem;color:var(--txt-l);">${date}</div></td>
      <td class="schedule-priority">${priority}/10</td>
      <td>${vehicleDisplay}</td>
      <td><span class="b ${statusClass}" id="badge-${schedule.id}">${statusText}</span></td>
      <td style="text-align:right;">${actionButton}</td>
    `;
    tbody.appendChild(row);
  });

  updateScheduleCounters();
  updateScheduleStats();
}

/* ── Update schedule stats ── */
function updateScheduleStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const monthStart = new Date(today);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0);
  monthEnd.setHours(23, 59, 59, 999);

  // Calculate stats
  let upcomingCount = 0;
  let todayCount = 0;
  let todayDetail = '';
  let completedThisMonth = 0;
  let totalThisMonth = 0;

  allSchedules.forEach(schedule => {
    const schedDate = new Date(schedule.date_time_start);
    schedDate.setHours(0, 0, 0, 0);

    // Upcoming (next 7 days, not completed)
    if (schedDate >= today && schedDate <= nextWeek && schedule.status !== 'completed') {
      upcomingCount++;
    }

    // Today schedules
    if (schedDate.getTime() === today.getTime()) {
      todayCount++;
      if (!todayDetail) {
        const time = new Date(schedule.date_time_start).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        todayDetail = `${time} · Route ${schedule.id}`;
      }
    }

    // This month stats
    const createdAt = new Date(schedule.created_at);
    if (createdAt >= monthStart && createdAt <= monthEnd) {
      totalThisMonth++;
      if (schedule.status === 'completed') {
        completedThisMonth++;
      }
    }
  });

  // Calculate completion rate
  const completionRate = totalThisMonth > 0
    ? Math.round((completedThisMonth / totalThisMonth) * 100)
    : 0;

  // Update DOM
  const upcomingEl = document.getElementById('statUpcoming');
  const todayCountEl = document.getElementById('statTodayCount');
  const todayDetailEl = document.getElementById('statTodayDetail');
  const completedEl = document.getElementById('statCompleted');
  const rateEl = document.getElementById('statCompletionRate');
  const trendEl = document.getElementById('statCompletionTrend');

  if (upcomingEl) upcomingEl.textContent = upcomingCount;
  if (todayCountEl) todayCountEl.textContent = todayCount;
  if (todayDetailEl) todayDetailEl.textContent = todayDetail || 'No schedules';
  if (completedEl) completedEl.textContent = completedThisMonth;
  if (rateEl) rateEl.textContent = completionRate + '%';
  if (trendEl) {
    trendEl.textContent = completionRate >= 80 ? `↑${completionRate}%` : `↓${100 - completionRate}%`;
    trendEl.style.color = completionRate >= 80 ? 'var(--g1)' : 'var(--warn)';
  }
}

/* ── Filter schedules by status ── */
function applyScheduleFilter(status) {
  currentFilter = status;
  document.querySelectorAll('.si').forEach(item => {
    const itemStatus = item.dataset.status;
    let shouldShow = false;

    if (status === 'Pending') {
      shouldShow = itemStatus === 'not_started';
    } else if (status === 'Ongoing') {
      shouldShow = itemStatus === 'ongoing';
    } else if (status === 'Completed') {
      shouldShow = itemStatus === 'completed';
    }

    item.style.display = shouldShow ? '' : 'none';
  });
}

/* ── Start schedule (change status to ongoing) ── */
async function startSchedule(scheduleId, button) {
  try {
    button.disabled = true;
    button.textContent = 'Starting...';

    const token = localStorage.getItem('access_token');
    const response = await fetch(`/api/schedules/${scheduleId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'ongoing' })
    });

    if (!response.ok) {
      throw new Error(`Failed to start schedule: ${response.status}`);
    }

    // Update local data
    const schedule = allSchedules.find(s => s.id === scheduleId);
    if (schedule) {
      schedule.status = 'ongoing';
    }

    // Update badge
    const badge = document.getElementById(`badge-${scheduleId}`);
    if (badge) {
      badge.className = 'b go';
      badge.textContent = 'Ongoing';
    }

    // Update row data-status
    const row = document.getElementById(`schedule-${scheduleId}`);
    if (row) {
      row.dataset.status = 'ongoing';
    }

    // Replace button with Mark Complete button
    button.className = 'action-btn complete';
    button.id = `btn-${scheduleId}`;
    button.textContent = 'Mark Complete';
    button.onclick = function() { completeSchedule(scheduleId, this); };
    button.disabled = false;

    updateScheduleCounters();
    updateScheduleStats();
    applyScheduleFilter(currentFilter);

    showToast('Schedule started successfully');
  } catch (err) {
    console.error('Error starting schedule:', err);
    button.disabled = false;
    button.textContent = 'Start Route';
    showToast('Failed to start schedule', 'error');
  }
}

/* ── Complete schedule (show vehicle details modal) ── */
function completeSchedule(scheduleId, button) {
  try {
    // Get the schedule details
    const schedule = allSchedules.find(s => s.id === scheduleId);
    if (!schedule) {
      showToast('Schedule not found', 'error');
      return;
    }

    // Store schedule ID for confirmation
    window.pendingCompleteScheduleId = scheduleId;
    window.pendingCompleteButton = button;

    // Show modal with vehicle details
    showVehicleModal(schedule);
  } catch (err) {
    console.error('Error showing vehicle details:', err);
    showToast('Failed to display vehicle details', 'error');
  }
}

/* ── Show vehicle modal ── */
function showVehicleModal(schedule) {
  const modal = document.getElementById('vehicleModal');
  const vehicleDetails = document.getElementById('vehicleDetails');

  if (!schedule.vehicle || !schedule.vehicle.id) {
    vehicleDetails.innerHTML = `
      <div style="padding:16px;background:#fff3cd;border-radius:4px;color:#856404;">
        <strong>No vehicle assigned</strong><br>
        <small>This schedule does not have a vehicle assigned yet.</small>
      </div>
    `;
  } else {
    const vehicle = schedule.vehicle;
    vehicleDetails.innerHTML = `
      <div style="border:1px solid #e0e0e0;border-radius:4px;padding:16px;background:#f9f9f9;">
        <div style="margin-bottom:12px;">
          <label style="display:block;font-size:0.75rem;text-transform:uppercase;color:var(--txt-l);margin-bottom:4px;">Plate Number</label>
          <div style="font-size:1.1rem;font-weight:600;color:var(--txt-d);">${vehicle.plate_number}</div>
        </div>
        <div style="margin-bottom:12px;">
          <label style="display:block;font-size:0.75rem;text-transform:uppercase;color:var(--txt-l);margin-bottom:4px;">Driver Name</label>
          <div style="font-size:0.95rem;color:var(--txt-d);">${vehicle.driver_name}</div>
        </div>
        <div>
          <label style="display:block;font-size:0.75rem;text-transform:uppercase;color:var(--txt-l);margin-bottom:4px;">Driver Phone</label>
          <div style="font-size:0.95rem;color:var(--txt-d);">
            <a href="tel:${vehicle.driver_phone}" style="color:#0066cc;text-decoration:none;">${vehicle.driver_phone}</a>
          </div>
        </div>
      </div>
    `;
  }

  modal.style.display = 'flex';
}

/* ── Close vehicle modal ── */
function closeVehicleModal() {
  const modal = document.getElementById('vehicleModal');
  modal.style.display = 'none';
  window.pendingCompleteScheduleId = null;
  window.pendingCompleteButton = null;
}

/* ── Confirm and complete schedule ── */
async function confirmComplete() {
  const scheduleId = window.pendingCompleteScheduleId;
  const button = window.pendingCompleteButton;

  if (!scheduleId) {
    showToast('Error: Schedule ID not found', 'error');
    return;
  }

  try {
    button.disabled = true;
    button.textContent = 'Completing...';

    const token = localStorage.getItem('access_token');
    const response = await fetch(`/api/schedules/${scheduleId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'completed' })
    });

    if (!response.ok) {
      throw new Error(`Failed to complete schedule: ${response.status}`);
    }

    // Update local data
    const schedule = allSchedules.find(s => s.id === scheduleId);
    if (schedule) {
      schedule.status = 'completed';
    }

    // Update badge with correct selector
    const badge = document.getElementById(`badge-${scheduleId}`);
    if (badge) {
      badge.className = 'b ok';
      badge.textContent = 'Completed';
    }

    // Hide button
    button.style.display = 'none';

    // Close modal
    closeVehicleModal();

    // Update counters and filter
    updateScheduleCounters();
    updateScheduleStats();
    applyScheduleFilter(currentFilter);

    showToast('Schedule completed successfully');
  } catch (err) {
    console.error('Error completing schedule:', err);
    button.disabled = false;
    button.textContent = 'Mark Complete';
    showToast('Failed to complete schedule', 'error');
  }
}

/* ── Toast notification ── */
function showToast(message, type = 'success') {
  let toast = document.getElementById('scheduleToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'scheduleToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  const icon = type === 'error' ? '✗' : '✓';
  toast.innerHTML = `
    <span style="display:flex;align-items:center;gap:8px;">
      ${icon}
      ${message}
    </span>
  `;
  toast.className = `toast ${type}`;

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

/* ── Initialize page ── */
async function initSchedules() {
  try {
    // Get current user's zone
    const userZone = await getCurrentUserZone();
    const zoneId = userZone.zone_id;

    // Fetch schedules for this zone
    const schedules = zoneId
      ? await fetchSchedules(zoneId)
      : await fetchSchedules();

    // Store and render
    allSchedules = schedules;
    renderSchedules(schedules);

    // Setup filter buttons
    setupFilterButtons();
  } catch (err) {
    console.error('Error initializing schedules:', err);
    showToast('Failed to load schedules', 'error');
  }
}

/* ── Setup filter button event listeners ── */
function setupFilterButtons() {
  const filterButtons = document.querySelectorAll('.schedule-status-ribbon .ftab');
  filterButtons.forEach(btn => {
    btn.onclick = function() {
      // Remove 'on' class from all buttons
      filterButtons.forEach(b => b.classList.remove('on'));
      // Add 'on' class to clicked button
      this.classList.add('on');

      // Get filter label from the button
      const label = this.querySelector('.sc-lbl')?.textContent?.trim();
      if (label) {
        applyScheduleFilter(label);
      }
    };
  });
}

/* ── Run on page load ── */
document.addEventListener('DOMContentLoaded', initSchedules);
