
// --- UI TOGGLES & LOGOUT ---
function toggleSb() {
  var sb = document.querySelector('.sb');
  var overlay = document.getElementById('overlay');
  if (sb) sb.classList.toggle('open');
  if (overlay) overlay.classList.toggle('open');
}

document.getElementById('logoutBtn')?.addEventListener('click', function () {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userRole');
  localStorage.removeItem('adminName');
  window.location.href = '/login';
});

// --- SET DATE ---
(function () {
  var d = document.getElementById('dashboardDate');
  if (!d) return;
  var s = d.getAttribute('data-subtitle') || d.textContent.trim();
  var n = new Date();
  var l = n.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  d.textContent = l + ' — ' + s;
})();

// --- TOAST NOTIFICATION HELPER ---
function showToast(message, isError) {
    const toast = document.getElementById('zoneToast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('show', 'err');
    if (isError) toast.classList.add('err');
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => toast.classList.remove('show'), 2600);
}

// --- REDIRECT ACTIONS TO COMMAND CENTRE ---
// Zones require map coordinates to exist, so we send the Admin to the spatial tool!
document.getElementById('createZoneBtn').addEventListener('click', () => window.location.href = '/map');
document.getElementById('modifyZoneBtn').addEventListener('click', () => window.location.href = '/map');
document.getElementById('deleteZoneBtn').addEventListener('click', () => window.location.href = '/map');

// --- FETCH & RENDER LIVE DATA ---
async function loadAdminZones() {
    try {
        // Fetch real data using our global helper!
        const zones = await API.get('/zones/');
        const tbody = document.getElementById('zoneTableBody');
        tbody.innerHTML = ''; 

        // 1. Populate the Table
        zones.forEach(zone => {
            const isAssigned = zone.zone_operator_name ? true : false;
            const opText = isAssigned ? zone.zone_operator_name : '<span class="ci-meta">Unassigned</span>';
            const statusClass = isAssigned ? 'ok' : 'pe';
            const statusText = isAssigned ? 'Assigned' : 'Pending';

            const row = `<tr>
              <td><div class="zn">${zone.name}</div><div class="zg">${zone.cell || 'N/A'}</div></td>
              <td>${zone.district}</td>
              <td>${zone.sector}</td>
              <td>${opText}</td>
              <td><span class="b ${statusClass}">${statusText}</span></td>
            </tr>`;
            tbody.insertAdjacentHTML('beforeend', row);
        });

        // 2. Populate the Map (Using the tactical Voyager style)
        const mapContainer = document.getElementById('zonesMap');
        if (mapContainer) {
            const zonesMap = L.map('zonesMap').setView([-1.95, 30.08], 13);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 18
            }).addTo(zonesMap);

            zones.forEach(zone => {
                if (zone.latitude && zone.longitude) {
                    const circle = L.circle([zone.latitude, zone.longitude], {
                        color: '#2e7d52', fillColor: '#48a870', fillOpacity: 0.35, weight: 2, radius: 800
                    }).addTo(zonesMap);

                    const isAssigned = zone.zone_operator_name ? true : false;
                    const badgeBg = isAssigned ? '#e8f8f5' : '#fdf2e9';
                    const badgeCol = isAssigned ? '#117a65' : '#d35400';
                    const badgeText = isAssigned ? 'Operator Assigned' : 'Pending Assignment';

                    const popupContent = `
                        <div style="font-size:.85rem; text-align:center;">
                            <h3 style="margin:0 0 6px 0; color:#2c3e50; border-bottom:1px solid #eee; padding-bottom:4px;">${zone.name}</h3>
                            <p style="margin:4px 0; color:#34495e;">${zone.district} · ${zone.sector}</p>
                            <p style="margin:4px 0; color:#34495e;"><strong>Operator:</strong> ${zone.zone_operator_name || '<i>Unassigned</i>'}</p>
                            <span style="display:inline-block; margin-top:6px; padding:2px 8px; background-color:${badgeBg}; color:${badgeCol}; border-radius:12px; font-size:11px; font-weight:bold;">${badgeText}</span>
                        </div>`;
                    circle.bindPopup(popupContent);
                }
            });
        }
    } catch (error) {
        console.error('Error fetching zones:', error.message);
        showToast('Failed to load zones from server', true);
    }
}

// Boot the live data
loadAdminZones();
