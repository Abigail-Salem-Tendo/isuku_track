const API_BASE = 'http://127.0.0.1:5000'

// 1. Initializing map centered on Kigali
const map = L.map('map').setView([-1.95, 30.08], 13);

// --- CUSTOM ICONS DEFINTIONS ---
// Using FontAwesome icons wrapped in a Leaflet divIcon
const operatorIcon = L.divIcon({
    html: '<div class="custom-map-icon" style="background: #f39c12; color: white; width: 30px; height: 30px;"><i class="fa-solid fa-user-helmet-safety"></i></div>',
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15] 
});

const vehicleIcon = L.divIcon({
    html: '<div class="custom-map-icon" style="background: #9b59b6; color: white; width: 30px; height: 30px;"><i class="fa-solid fa-truck-ramp-box"></i></div>',
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

// A global array to store references to all our map markers/circles so we can open their popups later
const mapLayers = {};

let tempMarker = null; // Holds our "Create Zone" draggable pin
let tempCircle = null; // Holds the preview coverage area

// 2. Adding OpenStreetMap base layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18
}).addTo(map);

// --- FEATURE 1: VISUAL ZONE CREATION (ABSTRACTION) ---
map.on('click', function(e) {
    if (tempMarker) map.removeLayer(tempMarker);
    if (tempCircle) map.removeLayer(tempCircle);

    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    tempCircle = L.circle([lat, lng], { color: '#e74c3c', fillColor: '#e74c3c', fillOpacity: 0.2, radius: 800 }).addTo(map);
    tempMarker = L.marker([lat, lng], { draggable: true }).addTo(map);

    tempMarker.on('drag', function(event) {
        const position = event.target.getLatLng();
        tempCircle.setLatLng(position);
    });

    const createUI = `
    <div style="text-align: center;">
        <b>New Zone Preview</b><br>
        Drag pin to adjust.<br><br>
        <button onclick="triggerZoneModal(${lat}, ${lng})" style="background: #27ae60; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
            Confirm & Create
        </button>
    </div>
    `;
    tempMarker.bindPopup(createUI).openPopup();
});


// ---  MODAL INJECTION WITH AUTO-FILL -
async function triggerZoneModal(lat, lng) {
    const modal = document.getElementById('adminModal');
    const form = document.getElementById('modalForm');
    const title = document.getElementById('modalTitle');

    // Show the modal immediately with a loading state
    title.textContent = "Locating Address...";
    form.innerHTML = `<div style="text-align:center; padding: 20px; color: #666;">Fetching district and sector data...</div>`;
    modal.style.display = 'flex'; 

    let district = "";
    let sector = "";
    let cell = "";

    // REVERSE GEOCODING: Asking OpenStreetMap what is at these coordinates
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`);
        const data = await response.json();
        
        if (data && data.address) {
            console.log("OSM Address Data Found:", data.address);
            // Rwanda's OSM mapping uses these specific tags for administrative levels
            district = data.address.county || data.address.state_district || data.address.city_district || "";
            sector = data.address.suburb || data.address.village || data.address.town || data.address.city || "";
            cell = data.address.neighbourhood || "";
        }
    } catch (error) {
        console.error("Failed to fetch address details", error);
    }

    //  updating the modal with the actual form, injecting the data we just found
    title.textContent = "Create New Zone";
    form.innerHTML = `
        <div style="margin-bottom: 10px;">
            <label style="font-size: 12px; color: #666;">Coordinates (Auto-captured)</label>
            <input type="text" value="${lat.toFixed(5)}, ${lng.toFixed(5)}" disabled style="width: 100%; padding: 8px; background: #eee; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        
        <input type="hidden" id="zoneLat" value="${lat}">
        <input type="hidden" id="zoneLng" value="${lng}">

        <div style="margin-bottom: 10px;">
            <label>Zone Name *</label>
            <input type="text" id="zoneName" required placeholder="e.g., Kimironko Sector A" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        </div>

        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            <div style="flex: 1;">
                <label>District *</label>
                <input type="text" id="zoneDistrict" required value="${district}" placeholder="e.g., Gasabo" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div style="flex: 1;">
                <label>Sector *</label>
                <input type="text" id="zoneSector" required value="${sector}" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
        </div>

        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
            <div style="flex: 1;">
                <label>Cell / Area</label>
                <input type="text" id="zoneCell" value="${cell}" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div style="flex: 1;">
                <label>Radius (meters)</label>
                <input type="number" id="zoneRadius" value="800" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
        </div>

        <button type="submit" style="width: 100%; padding: 10px; background: #2e7d52; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
            Save Zone
        </button>
    `;

    // Attach the submit event listener
    form.onsubmit = async function(e) {
        e.preventDefault();
        await saveZoneToBackend();
    };
} 

// --- PROCESS THE FORM SUBMISSION ---
async function saveZoneToBackend() {
    const token = localStorage.getItem('access_token');
    
    
    const zoneData = {
        name: document.getElementById('zoneName').value,
        district: document.getElementById('zoneDistrict').value,
        sector: document.getElementById('zoneSector').value,
        cell: document.getElementById('zoneCell').value || "N/A",
        village: "N/A", // Can add a field for this later if needed
        latitude: parseFloat(document.getElementById('zoneLat').value),
        longitude: parseFloat(document.getElementById('zoneLng').value),
        radius: parseInt(document.getElementById('zoneRadius').value) // For future backend updates
    };

    try {
        const response = await fetch(`${API_BASE}/api/zones/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(zoneData)
        });

        if (response.ok) {
            // Hiding modal and refresh map
            document.getElementById('adminModal').style.display = 'none';
            alert("Zone created successfully!");
            location.reload(); 
        } else {
            const errorData = await response.json();
            alert(`Error: ${errorData.error}`);
        }
    } catch (error) {
        console.error("Creation failed", error);
    }
}

// --- FEATURE: FETCH DATA & BUILD COMMAND CENTRE ---
async function loadZones() {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE}/api/zones/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const zones = await response.json();
        
        const sidebar = document.getElementById('sidebarContent');
        sidebar.innerHTML = ''; 

        // 1. Building the Active Zones Section in Sidebar
        let html = `<div class="panel-section-title">Active Zones (${zones.length})</div>`;

        zones.forEach(zone => {
            if (zone.latitude && zone.longitude) {
                
                // Draw the blue territory circle
                const circle = L.circle([zone.latitude, zone.longitude], {
                    color: '#2980b9', fillColor: '#3498db', fillOpacity: 0.35, weight: 2, radius: 800
                }).addTo(map);

                
                mapLayers[`zone_${zone.id}`] = circle;

                const isAssigned = zone.zone_operator_name ? true : false;
                
                // If assigned, drop a Human Icon  for zone operator dead center in the zone
                if (isAssigned) {
                    const opMarker = L.marker([zone.latitude, zone.longitude], { icon: operatorIcon }).addTo(map);
                    opMarker.bindPopup(`<b>Operator:</b> ${zone.zone_operator_name}<br><b>Zone:</b> ${zone.name}`);
                }

                
                const badgeClass = isAssigned ? 'status-badge' : 'status-badge pending';
                const badgeText = isAssigned ? 'Operator Assigned' : 'Pending Assignment';
                circle.bindPopup(`
                    <div class="popup-content">
                        <h3>${zone.name}</h3>
                        <p><strong>District:</strong> ${zone.district}</p>
                        <span class="${badgeClass}">${badgeText}</span>
                        <br><br>
                        <button onclick="triggerEditModal(${zone.id})" style="width: 100%; padding: 5px; cursor: pointer; margin-top: 10px;">
                            Edit & Assign Operator
                        </button>
                    </div>
                `);

                // Add to Sidebar HTML
                html += `
                    <div class="entity-item" onclick="flyToMapItem(${zone.latitude}, ${zone.longitude}, 'zone_${zone.id}')">
                        <div class="entity-icon bg-zone"><i class="fa-solid fa-map-location-dot"></i></div>
                        <div class="entity-details">
                            <div class="entity-name">${zone.name}</div>
                            <div class="entity-sub">${zone.district} · ${isAssigned ? zone.zone_operator_name : 'Unassigned'}</div>
                        </div>
                    </div>
                `;
            }
        });

        // Inject the HTML into the sidebar
        sidebar.innerHTML = html;

    } catch (error) {
        console.error('Error fetching zones:', error);
    }
}

// Global function to make the map fly to a coordinate and open its popup
window.flyToMapItem = function(lat, lng, layerId) {
    map.flyTo([lat, lng], 15, {
        duration: 1.5
    });
    
    // Wait for the flight to finish, then open the popup
    setTimeout(() => {
        if (mapLayers[layerId]) {
            mapLayers[layerId].openPopup();
        }
    }, 1500);
};

// --- FEATURE 3: SEARCH BAR (GEOCODING) ---
const geocoder = L.Control.geocoder({
    defaultMarkGeocode: false, // Red pin instead of blue
    placeholder: "Search for a sector or landmark in Kigali..."
}).addTo(map);

// This listens for when the user hits "Enter" on a search result
geocoder.on('markgeocode', function(e) {
    const latlng = e.geocode.center;
    
    // 1. Fly the map to the searched location and zoom in
    map.setView(latlng, 15); 

    // 2. Clear any existing temporary pins on the map
    if (tempMarker) map.removeLayer(tempMarker);
    if (tempCircle) map.removeLayer(tempCircle);

    const lat = latlng.lat;
    const lng = latlng.lng;

    // 3. Drop our draggable preview circle and marker right on the searched spot
    tempCircle = L.circle([lat, lng], { color: '#e74c3c', fillColor: '#e74c3c', fillOpacity: 0.2, radius: 800 }).addTo(map);
    tempMarker = L.marker([lat, lng], { draggable: true }).addTo(map);

    // Make the circle follow the marker if the Admin drags it to adjust the location
    tempMarker.on('drag', function(event) {
        const position = event.target.getLatLng();
        tempCircle.setLatLng(position);
    });

    // 4. Bind the popup with the Confirm button
    const createUI = `
        <div style="text-align: center;">
            <b>Location Found!</b><br>
            Drag pin to fine-tune.<br><br>
            <button onclick="triggerZoneModal(${lat}, ${lng})" style="background: #27ae60; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                Confirm & Create
            </button>
        </div>
    `;
    tempMarker.bindPopup(createUI).openPopup();
});

// Close the modal when the 'X' is clicked
document.getElementById('modalClose').addEventListener('click', () => {
    document.getElementById('adminModal').style.display = 'none';
});

// Global function to trigger assignment
window.triggerAssignModal = function(zoneId, zoneName) {
    const operatorId = prompt(`Assigning operator to ${zoneName}.\nEnter the Operator ID:`);
    if(operatorId) {
        console.log(`Ready to assign operator ${operatorId} to zone ${zoneId}!`);
    }
};

// Fire the load function on startup
loadZones();