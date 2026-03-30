// Zone Operator Residents Management
document.addEventListener('DOMContentLoaded', function() {
  const token = localStorage.getItem('access_token');

  if (!token) {
    window.location.href = '/login';
    return;
  }

  let allResidents = [];
  let currentFilter = 'all';
  let map = null;
  let markers = [];

  const API_BASE = '/api/residents';
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Get initials from name
  function getInitials(name) {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  // Format date
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // Determine resident status based on payment/joining date
  function getResidentStatus(resident) {
    const joinDate = new Date(resident.created_at);
    const now = new Date();
    const daysSinceJoin = Math.floor((now - joinDate) / (1000 * 60 * 60 * 24));

    if (daysSinceJoin < 30) {
      return 'new';
    }

    // If loyalty_points is 0 or account inactive, mark as pending/inactive
    if (!resident.loyalty_points || resident.loyalty_points === 0) {
      return 'pending';
    }

    return 'active';
  }

  // Update statistics
  function updateStats() {
    const totalResidents = allResidents.length;
    const activeResidents = allResidents.filter(r => getResidentStatus(r) === 'active').length;
    const inactiveResidents = totalResidents - activeResidents;
    const totalLoyaltyPoints = allResidents.reduce((sum, r) => sum + (r.loyalty_points || 0), 0);

    // Find top earner
    const topEarner = allResidents.reduce((max, r) => {
      return (r.loyalty_points || 0) > (max.loyalty_points || 0) ? r : max;
    }, { name: '--', loyalty_points: 0 });

    document.getElementById('totalResidents').textContent = totalResidents;
    document.getElementById('activeResidents').textContent = activeResidents;
    document.getElementById('totalLoyaltyPoints').textContent = totalLoyaltyPoints;
    document.getElementById('topEarnerName').textContent = topEarner.name || '--';
    document.getElementById('topEarnerPoints').textContent = (topEarner.loyalty_points || 0) + ' pts';

    // Update map legend
    document.getElementById('mapHomesCount').textContent = totalResidents + ' homes';
    document.getElementById('mapActiveCount').textContent = activeResidents;
    document.getElementById('mapInactiveCount').textContent = inactiveResidents;
  }

  // Fetch and display zone name
  async function fetchAndDisplayZoneName() {
    try {
      // First get user from token
      const token = localStorage.getItem('access_token');
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const user = JSON.parse(userStr);

      // Fetch zones and find the one assigned to this operator
      const response = await fetch('/api/zones', { headers });
      if (!response.ok) return;

      const zones = await response.json();
      const myZone = zones.find(z => z.zone_operator_id === user.id);

      if (myZone) {
        document.getElementById('zoneName').textContent = myZone.cell || myZone.name;

        // Update page subtitle
        const subtitle = document.getElementById('pageSubtitle');
        if (subtitle) {
          const residentsCount = allResidents.length;
          subtitle.textContent = `${myZone.name} · ${myZone.cell} · ${residentsCount} registered`;
        }
      }
    } catch (error) {
      console.error('Error fetching zone name:', error);
    }
  }

  // Render residents list as table
  function renderResidents() {
    const container = document.getElementById('residentsContainer');
    if (!container) return;

    // Get current search value before rendering
    const currentSearchInput = document.getElementById('residentSearchInput');
    const searchValue = currentSearchInput ? currentSearchInput.value : '';

    let filteredResidents = allResidents;

    // Apply filter
    if (currentFilter === 'active') {
      filteredResidents = allResidents.filter(r => getResidentStatus(r) === 'active');
    } else if (currentFilter === 'inactive') {
      filteredResidents = allResidents.filter(r => getResidentStatus(r) !== 'active' && getResidentStatus(r) !== 'new');
    } else if (currentFilter === 'new') {
      filteredResidents = allResidents.filter(r => getResidentStatus(r) === 'new');
    }

    // Apply search
    if (searchValue) {
      const searchTerm = searchValue.toLowerCase();
      filteredResidents = filteredResidents.filter(r =>
        (r.name && r.name.toLowerCase().includes(searchTerm)) ||
        (r.email && r.email.toLowerCase().includes(searchTerm)) ||
        (r.phone_number && r.phone_number.toLowerCase().includes(searchTerm))
      );
    }

    // Update header count
    const countElement = document.getElementById('residentsCount');
    if (countElement) {
      countElement.textContent = `Showing ${filteredResidents.length} of ${allResidents.length}`;
    }

    if (filteredResidents.length === 0) {
      container.innerHTML = `
        <input class="search-inp" type="text" id="residentSearchInput" placeholder="Search by name, email, or phone..." style="margin-bottom: 12px;" value="${searchValue}">
        <div style="padding: 20px; text-align: center; color: var(--txt-l);">No residents found</div>
      `;
      attachSearchListener();
      return;
    }

    const tableRows = filteredResidents.map(resident => {
      const joinDate = formatDate(resident.created_at);
      const points = resident.loyalty_points || 0;
      return `
        <tr>
          <td class="resident-name">${resident.name || '--'}</td>
          <td>${resident.email || '--'}</td>
          <td>${resident.phone_number || '--'}</td>
          <td>${joinDate}</td>
          <td style="text-align: center;">
            <span style="display: inline-flex; align-items: center; gap: 6px; background: #fffbeb; padding: 6px 10px; border-radius: 4px; font-weight: 600; color: #f59e0b;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              ${points}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <input class="search-inp" type="text" id="residentSearchInput" placeholder="Search by name, email, or phone..." style="margin-bottom: 12px;" value="${searchValue}">
      <table class="residents-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Join Date</th>
            <th>Loyalty Points</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;

    attachSearchListener();
  }

  // Attach search listener
  function attachSearchListener() {
    const searchInput = document.getElementById('residentSearchInput');
    if (searchInput) {
      searchInput.oninput = function() {
        renderResidents();
      };
    }
  }

  // Initialize map
  function initializeMap() {
    // Only initialize map once
    if (map) return;

    const mapContainer = document.getElementById('residentsMap');
    if (!mapContainer) return;

    try {
      // Create map centered on Kigali, Rwanda
      map = L.map('residentsMap').setView([-1.9536, 30.0605], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      // Update markers for residents
      updateMapMarkers();
    } catch (mapError) {
      console.error('Map initialization error:', mapError);
      if (map) {
        try {
          map.remove();
          map = null;
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }

  function updateMapMarkers() {
    if (!map) return; // Map not initialized yet

    // Clear old markers
    markers.forEach(marker => marker.remove());
    markers = [];

    // Add markers for each resident
    allResidents.forEach(resident => {
      if (resident.latitude && resident.longitude) {
        const status = getResidentStatus(resident);
        const color = status === 'active' ? '#48a870' : '#ef4444';

        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="width: 20px; height: 20px; border-radius: 50%; background: ${color}; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        const marker = L.marker([resident.latitude, resident.longitude], { icon: customIcon })
          .bindPopup(`
            <div style="font-weight:500;">${resident.name}</div>
            <div style="font-size:0.85rem;color:#666;">${resident.address || 'Address not provided'}</div>
            <div style="font-size:0.85rem;margin-top:4px;">Points: ${resident.loyalty_points || 0}</div>
          `)
          .addTo(map);

        markers.push(marker);
      }
    });

    // Fit map bounds if markers exist
    if (markers.length > 0) {
      const group = new L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  // Fetch residents from API
  async function fetchResidents() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(API_BASE, { 
        headers,
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      allResidents = await response.json();
      if (!Array.isArray(allResidents)) allResidents = [];
      updateStats();
      renderResidents();
      initializeMap();
      updateMapMarkers();
      fetchAndDisplayZoneName();
    } catch (error) {
      console.error('Failed to fetch residents:', error);
      allResidents = [];
      const container = document.getElementById('residentsContainer');
      if (container) {
        container.innerHTML = '<div style="padding: 20px; color: red;">Failed to load residents. Please refresh.</div>';
      }
    }
  }

  // Filter tabs
  window.filterTab = function(element) {
    const filterTabs = document.querySelectorAll('.ftab');
    filterTabs.forEach(t => t.classList.remove('on'));
    element.classList.add('on');

    const filterMap = {
      'All': 'all',
      'Active': 'active',
      'Inactive': 'inactive',
      'New': 'new'
    };

    currentFilter = filterMap[element.textContent.trim()] || 'all';
    renderResidents();
  };

  // Initial load
  fetchResidents();
});

// Logout function
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/logout';
  }
}

// Sidebar toggle
function toggleSb() {
  const sidebar = document.querySelector('.sb');
  const overlay = document.getElementById('overlay');
  if (sidebar) sidebar.classList.toggle('active');
  if (overlay) overlay.classList.toggle('active');
}

// Profile dropdown toggle
function toggleProfileDd(event) {
  event.stopPropagation();
  const dd = document.getElementById('profileDd');
  if (dd) dd.classList.toggle('active');
}
