const API_BASE = 'http://127.0.0.1:5000'

// --- GLOBAL STATE ---
let globalZones = [];
let globalOperators = [];
let currentTab = 'zones';

// 1. Initializing map centered on Kigali
const map = L.map('map').setView([-1.95, 30.08], 13);

// --- CUSTOM ICONS DEFINTIONS ---
// Using FontAwesome icons wrapped in a Leaflet divIcon
const operatorIcon = L.divIcon({
    html: '<div class="custom-map-icon" style="background: #f39c12; color: white; width: 30px; height: 30px;"><i class="fa-solid fa-person"></i></div>',
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
        
        // save the data directly into our global state
        globalZones = await response.json(); 
        
        // Draw the circles on the map
        globalZones.forEach(zone => {
            if (zone.latitude && zone.longitude) {
                
                
                const circle = L.circle([zone.latitude, zone.longitude], {
                    color: '#2980b9', fillColor: '#3498db', fillOpacity: 0.35, weight: 2, radius: 800
                }).addTo(map);

            
                mapLayers[`zone_${zone.id}`] = circle;

                const isAssigned = zone.zone_operator_name ? true : false;
                
                // If assigned, drop a Human Icon dead center in the zone
                if (isAssigned) {
                    const opMarker = L.marker([zone.latitude, zone.longitude], { icon: operatorIcon }).addTo(map);
                    opMarker.bindPopup(`<b>Operator:</b> ${zone.zone_operator_name}<br><b>Zone:</b> ${zone.name}`);
                }

                // Bind existing Zone Popup WITH the Edit Button
                const badgeClass = isAssigned ? 'status-badge' : 'status-badge pending';
                const badgeText = isAssigned ? 'Operator Assigned' : 'Pending Assignment';
                
                circle.bindPopup(`
                    <div class="popup-content" style="text-align: center;">
                        <h3 style="margin-bottom: 5px; color: #2c3e50;">${zone.name}</h3>
                        <p style="margin: 5px 0; color: #7f8c8d; font-size: 13px;"><strong>District:</strong> ${zone.district}</p>
                        <span class="${badgeClass}" style="display: inline-block; margin-bottom: 15px;">${badgeText}</span>
                        <br>
                        <button onclick="triggerEditModal(${zone.id})" style="width: 100%; padding: 8px; background: #2980b9; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;">
                            <i class="fa-solid fa-pen-to-square"></i> Edit / Delete Zone
                        </button>
                    </div>
                `);
            }
        });

    } catch (error) {
        console.error('Error fetching zones:', error);
    }
}

// --- FETCH OPERATORS FROM BACKEND ---
async function loadOperators() {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
    
       // Change the URL in your loadOperators() function to this:
        const response = await fetch(`${API_BASE}/api/auth/users?role=zone_operator`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
                
        if (response.ok) {
            globalOperators = await response.json();
        } else {
            console.error("Failed to fetch operators. Are they set up in the backend?");
            // FAKE DATA FOR TESTING DRAG & DROP (Remove this once backend is wired)
            globalOperators = [
                { id: 101, username: "Jean Paul", phone_number: "0788123456", zone_id: null },
                { id: 102, username: "Amina K.", phone_number: "0722987654", zone_id: 1 },
                { id: 103, username: "Eric M.", phone_number: "0755456789", zone_id: null }
            ];
        }
    } catch (error) {
        console.error('Error fetching operators:', error);
    }
}

// --- TAB SWITCHER LOGIC ---
window.switchTab = function(tabName) {
    currentTab = tabName;
    
    // Update active tab visuals
    document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');

    const sidebar = document.getElementById('sidebarContent');
    let html = '';

    if (tabName === 'zones') {
        html = `<div class="panel-section-title">Active Zones (${globalZones.length})</div>`;
        globalZones.forEach(zone => {
            const isAssigned = zone.zone_operator_name ? true : false;
            html += `
                <div class="entity-item" onclick="flyToMapItem(${zone.latitude}, ${zone.longitude}, 'zone_${zone.id}')">
                    <div class="entity-icon bg-zone"><i class="fa-solid fa-map-location-dot"></i></div>
                    <div class="entity-details">
                        <div class="entity-name">${zone.name}</div>
                        <div class="entity-sub">${zone.district} · ${isAssigned ? zone.zone_operator_name : 'Unassigned'}</div>
                    </div>
                </div>
            `;
        });
    } 
    
    else if (tabName === 'operators') {
        html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div class="panel-section-title" style="margin: 0; border: none; padding: 0;">Personnel (${globalOperators.length})</div>
                <button onclick="openOperatorModal()" style="background: #2e7d52; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: bold;">
                    <i class="fa-solid fa-plus"></i> Add New
                </button>
            </div>
            <div style="font-size: 11px; color: #e67e22; margin-bottom: 10px; text-align: center;">
                <i class="fa-solid fa-hand-pointer"></i> Drag an operator onto a Zone to assign them.
            </div>`;
                 
        globalOperators.forEach(op => {
            const statusText = op.zone_id ? "Assigned" : "Unassigned";
            const borderStyle = op.zone_id ? "" : "border-left: 4px solid #f39c12;";
            
            html += `
                <div class="entity-item draggable-item" draggable="true" ondragstart="handleDragStart(event, ${op.id}, '${op.username}')" style="${borderStyle}; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center;">
                        <div class="entity-icon bg-operator"><i class="fa-solid fa-person"></i></div>
                        <div class="entity-details">
                            <div class="entity-name">${op.username}</div>
                            <div class="entity-sub">${op.phone_number || 'No phone'} · <b>${statusText}</b></div>
                        </div>
                    </div>
                    <button onclick="openOperatorModal(${op.id})" style="background: none; border: none; color: #7f8c8d; cursor: pointer; padding: 5px;">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                </div>
            `;
        });
    }

    else if (tabName === 'fleet') {
        html = `<div style="text-align:center; padding: 20px; color:#999;">Fleet tracking coming soon...</div>`;
    }

    sidebar.innerHTML = html;
};

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

// Global function to trigger assignment
window.triggerAssignModal = function(zoneId, zoneName) {
    const operatorId = prompt(`Assigning operator to ${zoneName}.\nEnter the Operator ID:`);
    if(operatorId) {
        console.log(`Ready to assign operator ${operatorId} to zone ${zoneId}!`);
    }
};




// DRAG & DROP ASSIGNMENT LOGIC

// Init drag data
window.handleDragStart = function(event, operatorId, operatorName) {
    event.dataTransfer.setData('operatorId', operatorId);
    event.dataTransfer.setData('operatorName', operatorName);
    event.dataTransfer.effectAllowed = 'move';
};

// Allow drop on map
const mapContainer = document.getElementById('map');
mapContainer.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
});

// Process drop event
mapContainer.addEventListener('drop', async function(e) {
    e.preventDefault();
    
    const operatorId = e.dataTransfer.getData('operatorId');
    const operatorName = e.dataTransfer.getData('operatorName');
    if (!operatorId) return;

    // Convert drop coordinates
    const dropLatLng = map.mouseEventToLatLng(e);
    let targetZone = null;
    
    // Check intersection with zones (800m radius)
    for (let i = 0; i < globalZones.length; i++) {
        const zone = globalZones[i];
        const zoneLatLng = L.latLng(zone.latitude, zone.longitude);
        
        if (dropLatLng.distanceTo(zoneLatLng) <= 800) {
            targetZone = zone;
            break; 
        }
    }

    if (targetZone) {
        // Custom confirmation modal
        const result = await Swal.fire({
            title: 'Confirm Assignment',
            text: `Assign ${operatorName} to ${targetZone.name}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#2e7d52',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, assign operator'
        });

        if (result.isConfirmed) {
            await assignOperatorToZone(operatorId, targetZone.id);
        }
    } else {
        // Custom error modal
        Swal.fire({
            title: 'Invalid Drop Location',
            text: 'Operator must be dropped inside a zone radius.',
            icon: 'warning',
            confirmButtonColor: '#2e7d52'
        });
    }
});

// Execute assignment API call
async function assignOperatorToZone(operatorId, zoneId) {
    const token = localStorage.getItem('access_token');
    
    try {
        const response = await fetch(`${API_BASE}/api/zones/${zoneId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ zone_operator_id: parseInt(operatorId) })
        });

        if (response.ok) {
            // Success toast & reload
            Swal.fire({
                title: 'Assigned!',
                text: 'Zone operator updated successfully.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                location.reload();
            });
        } else {
            const errorData = await response.json();
            Swal.fire('Update Failed', errorData.error, 'error');
        }
    } catch (error) {
        console.error("API Error:", error);
        Swal.fire('Error', 'Network or server error occurred.', 'error');
    }
}



// EDIT ZONE MODAL

window.triggerEditModal = function(zoneId) {
    console.log("Opening modal for Zone ID:", zoneId);

    // Use == so string IDs match integer IDs
    const zone = globalZones.find(z => z.id == zoneId); 
    
    if (!zone) {
        console.error("Zone not found in global array!");
        return; 
    }

    const modal = document.getElementById('adminModal');
    const form = document.getElementById('modalForm');
    const title = document.getElementById('modalTitle');

    title.textContent = "Edit Zone Details";

    // Build the dropdown of Operators
    let operatorOptions = `<option value="">-- Unassigned --</option>`;
    globalOperators.forEach(op => {
        if (!op.zone_id || op.zone_id === zone.id) {
            const isSelected = (op.id === zone.zone_operator_id) ? "selected" : "";
            operatorOptions += `<option value="${op.id}" ${isSelected}>${op.username} (${op.phone_number || 'No phone'})</option>`;
        }
    });

    // Inject the HTML into the modal, INCLUDING the Delete button
    form.innerHTML = `
        <input type="hidden" id="editZoneId" value="${zone.id}">

        <div style="margin-bottom: 10px;">
            <label>Zone Name *</label>
            <input type="text" id="editZoneName" required value="${zone.name}" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        </div>

        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            <div style="flex: 1;">
                <label>District</label>
                <input type="text" value="${zone.district}" disabled style="width: 100%; padding: 8px; background: #eee; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div style="flex: 1;">
                <label>Sector</label>
                <input type="text" value="${zone.sector}" disabled style="width: 100%; padding: 8px; background: #eee; border: 1px solid #ccc; border-radius: 4px;">
            </div>
        </div>

        <div style="margin-bottom: 15px;">
            <label>Assign Zone Operator</label>
            <select id="editZoneOperator" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                ${operatorOptions}
            </select>
            <small style="color: #666; display: block; margin-top: 5px;">Note: You can also assign operators by dragging them from the sidebar.</small>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button type="button" onclick="deleteZone(${zone.id}, '${zone.name}')" style="flex: 1; padding: 10px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                <i class="fa-solid fa-trash"></i> Delete
            </button>
            <button type="submit" style="flex: 2; padding: 10px; background: #2980b9; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                <i class="fa-solid fa-save"></i> Save Changes
            </button>
        </div>
    `;

    // Show the modal
    modal.style.display = 'flex';

    // Handle the form submission (Update)
    form.onsubmit = async function(e) {
        e.preventDefault();
        
        const updatedName = document.getElementById('editZoneName').value;
        const selectedOperatorId = document.getElementById('editZoneOperator').value;
        
        const payload = { name: updatedName };
        if (selectedOperatorId) {
            payload.zone_operator_id = parseInt(selectedOperatorId);
        } else {
            payload.zone_operator_id = null;
        }

        const token = localStorage.getItem('access_token');
        
        try {
            const response = await fetch(`${API_BASE}/api/zones/${zone.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                location.reload(); 
            } else {
                const errorData = await response.json();
                alert(`Update Failed: ${errorData.error}`);
            }
        } catch (error) {
            console.error("Update failed", error);
        }
    };
};


// FEATURE: DELETE ZONE LOGIC
window.deleteZone = async function(zoneId, zoneName) {
    // Hide the modal first
    document.getElementById('adminModal').style.display = 'none';

    // Ask for confirmation using SweetAlert
    const result = await Swal.fire({
        title: 'Delete Zone?',
        text: `Are you sure you want to delete ${zoneName}? This cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#7f8c8d',
        confirmButtonText: 'Yes, delete it'
    });

    // If they click Yes, send the DELETE request
    if (result.isConfirmed) {
        const token = localStorage.getItem('access_token');
        
        try {
            const response = await fetch(`${API_BASE}/api/zones/${zoneId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                Swal.fire({
                    title: 'Deleted!',
                    text: `${zoneName} has been removed from the map.`,
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    location.reload(); 
                });
            } else {
                const errorData = await response.json();
                Swal.fire('Error', errorData.error || 'Failed to delete', 'error');
            }
        } catch (error) {
            console.error("Delete failed", error);
            Swal.fire('Error', 'Network error occurred.', 'error');
        }
    }
};


// FEATURE: CRUD OPERATOR MODAL

window.openOperatorModal = function(operatorId = null) {
    const modal = document.getElementById('adminModal');
    const form = document.getElementById('modalForm');
    const title = document.getElementById('modalTitle');

    let op = null;
    if (operatorId) {
        op = globalOperators.find(o => o.id == operatorId);
        title.textContent = "Edit Zone Operator";
    } else {
        title.textContent = "Add New Zone Operator";
    }

    // Notice we added the Email field and removed the Password field!
    form.innerHTML = `
        <div style="margin-bottom: 10px;">
            <label style="font-size: 13px; color: #555;">Username *</label>
            <input type="text" id="opUsername" required value="${op ? op.username : ''}" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        
        <div style="margin-bottom: 10px;">
            <label style="font-size: 13px; color: #555;">Email *</label>
            <input type="email" id="opEmail" required value="${op ? (op.email || '') : ''}" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        </div>

        <div style="margin-bottom: 15px;">
            <label style="font-size: 13px; color: #555;">Phone Number *</label>
            <input type="text" id="opPhone" required value="${op ? (op.phone_number || '') : ''}" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        
        ${!op ? `<small style="display:block; margin-bottom:15px; color:#27ae60;"><i class="fa-solid fa-lock"></i> A secure setup link will be generated automatically.</small>` : ''}

        <div style="display: flex; gap: 10px; margin-top: 20px;">
            ${op ? `
            <button type="button" onclick="deleteOperator(${op.id}, '${op.username}')" style="flex: 1; padding: 10px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                <i class="fa-solid fa-trash"></i> Delete
            </button>
            ` : ''}
            <button type="submit" style="flex: 2; padding: 10px; background: #2980b9; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                <i class="fa-solid fa-save"></i> ${op ? 'Save Changes' : 'Create Operator'}
            </button>
        </div>
    `;

    modal.style.display = 'flex';

    form.onsubmit = async function(e) {
        e.preventDefault();
        
        const payload = {
            username: document.getElementById('opUsername').value,
            email: document.getElementById('opEmail').value,
            phone_number: document.getElementById('opPhone').value
        };

        const token = localStorage.getItem('access_token');
        // Point to YOUR specific create route if it's a new operator
        const url = op ? `${API_BASE}/api/auth/users/${op.id}` : `${API_BASE}/api/auth/create-zone-operator`;
        const method = op ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                // If a reset link was generated, show it to the admin!
                if (data.reset_link) {
                    Swal.fire({
                        title: 'Operator Created!',
                        html: `Send this setup link to the operator so they can set their password:<br><br><input type="text" value="http://127.0.0.1:5500${data.reset_link}" style="width:100%; padding:5px; text-align:center;" readonly>`,
                        icon: 'success',
                        confirmButtonText: 'Done'
                    }).then(() => location.reload());
                } else {
                    Swal.fire({ title: 'Updated!', text: 'Operator successfully updated.', icon: 'success', timer: 1500, showConfirmButton: false })
                    .then(() => location.reload());
                }
            } else {
                Swal.fire('Error', data.error || 'Operation failed', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Network error occurred.', 'error');
        }
    };
};

// Handle DELETE Operator
window.deleteOperator = async function(opId, opName) {
    document.getElementById('adminModal').style.display = 'none';

    const result = await Swal.fire({
        title: 'Delete Operator?',
        text: `Are you sure you want to remove ${opName}? They will be unassigned from any zones.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#7f8c8d',
        confirmButtonText: 'Yes, delete'
    });

    if (result.isConfirmed) {
        const token = localStorage.getItem('access_token');
        try {
            const response = await fetch(`${API_BASE}/api/auth/users/${opId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                Swal.fire({ title: 'Deleted!', text: 'Operator removed.', icon: 'success', timer: 1500, showConfirmButton: false })
                .then(() => location.reload());
            } else {
                const errorData = await response.json();
                Swal.fire('Error', errorData.error || 'Failed to delete', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Network error.', 'error');
        }
    }
};


// FEATURE: CRUD VEHICLE MODAL 

window.openVehicleModal = function(vehicleId = null) {
    const modal = document.getElementById('adminModal');
    const form = document.getElementById('modalForm');
    const title = document.getElementById('modalTitle');

    let v = null;
    if (vehicleId) {
        v = globalVehicles.find(x => x.id == vehicleId);
        title.textContent = "Edit Fleet Vehicle";
    } else {
        title.textContent = "Add New Vehicle";
    }

    form.innerHTML = `
        <div style="margin-bottom: 10px;">
            <label style="font-size: 13px; color: #555;">Plate Number *</label>
            <input type="text" id="vPlate" ${v ? 'disabled' : 'required'} value="${v ? v.plate_number : ''}" placeholder="e.g., RAB 123 C" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; ${v ? 'background-color: #eee;' : ''}">
        </div>

        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            <div style="flex: 1;">
                <label style="font-size: 13px; color: #555;">Driver Name *</label>
                <input type="text" id="vDriver" required value="${v ? v.driver_name : ''}" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div style="flex: 1;">
                <label style="font-size: 13px; color: #555;">Driver Phone *</label>
                <input type="text" id="vPhone" required value="${v ? v.driver_phone : ''}" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
        </div>

        <div style="margin-bottom: 15px;">
            <label style="font-size: 13px; color: #555;">Status *</label>
            <select id="vStatus" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                <option value="available" ${v && v.status === 'available' ? 'selected' : ''}>Available</option>
                <option value="in_use" ${v && v.status === 'in_use' ? 'selected' : ''}>In Use</option>
                <option value="maintenance" ${v && v.status === 'maintenance' ? 'selected' : ''}>Maintenance</option>
            </select>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 20px;">
            ${v ? `
            <button type="button" onclick="deleteVehicle(${v.id}, '${v.plate_number}')" style="flex: 1; padding: 10px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                <i class="fa-solid fa-trash"></i> Delete
            </button>
            ` : ''}
            <button type="submit" style="flex: 2; padding: 10px; background: #2980b9; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                <i class="fa-solid fa-save"></i> ${v ? 'Save Changes' : 'Add to Fleet'}
            </button>
        </div>
    `;

    modal.style.display = 'flex';

    form.onsubmit = async function(e) {
        e.preventDefault();

        // Build the payload mapping exactly to your Flask backend expectations
        const payload = {
            driver_name: document.getElementById('vDriver').value,
            driver_phone: document.getElementById('vPhone').value,
            status: document.getElementById('vStatus').value
        };

        // Only include plate number if we are creating a new truck
        if (!v) {
            payload.plate_number = document.getElementById('vPlate').value;
        }

        const token = localStorage.getItem('access_token');
        const url = v ? `${API_BASE}/api/vehicles/${v.id}` : `${API_BASE}/api/vehicles/`;
        const method = v ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                Swal.fire({ 
                    title: v ? 'Updated!' : 'Created!', 
                    text: data.message, // Using the exact message from your backend
                    icon: 'success', 
                    timer: 1500, 
                    showConfirmButton: false 
                }).then(() => location.reload());
            } else {
                // Catches your 400 missing fields or 409 duplicate errors
                Swal.fire('Error', data.error || 'Operation failed', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Network error.', 'error');
        }
    };
};

window.deleteVehicle = async function(vId, plate) {
    document.getElementById('adminModal').style.display = 'none';

    const result = await Swal.fire({
        title: 'Delete Vehicle?',
        text: `Are you absolutely sure you want to remove ${plate} from the fleet?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#7f8c8d',
        confirmButtonText: 'Yes, delete'
    });

    if (result.isConfirmed) {
        const token = localStorage.getItem('access_token');
        try {
            const response = await fetch(`${API_BASE}/api/vehicles/${vId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                Swal.fire({ title: 'Deleted!', icon: 'success', timer: 1500, showConfirmButton: false }).then(() => location.reload());
            } else {
                const data = await response.json();
                Swal.fire('Error', data.error || 'Failed to delete', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Network error.', 'error');
        }
    }
};

async function initializeMapApp() {
    await loadZones();      // Fetch Zones and draw the blue circles
    await loadOperators();  // Fetch the Operator roster
    switchTab('zones');     // Render the sidebar UI
}

initializeMapApp();