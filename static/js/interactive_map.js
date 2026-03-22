// 1. Initializing map centered on Kigali
const map = L.map('map').setView([-1.95, 30.08], 13);
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
            <button onclick="submitNewZone()" style="background: #27ae60; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                Confirm & Create
            </button>
        </div>
    `;
    tempMarker.bindPopup(createUI).openPopup();
});

// Function triggered by the popup button
async function submitNewZone() {
    const position = tempMarker.getLatLng();
    const token = localStorage.getItem('access_token'); 

    const zoneName = prompt("Enter a name for this new zone (e.g., Gahanga Central):");
    if (!zoneName) return; 

    const zoneData = {
        name: zoneName,
        district: "Kigali", 
        sector: "TBD",
        cell: "TBD",
        latitude: position.lat,
        longitude: position.lng
    };

    try {
        const response = await fetch('http://127.0.0.1:5000/api/zones/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(zoneData)
        });

        if (response.ok) {
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

// --- FEATURE 2: FETCH ZONES & ASSIGN OPERATOR EVENTS ---
async function loadZones() {
    const token = localStorage.getItem('access_token');
 
    
    if (!token) {
        alert("You are not logged in! The map will not load data.");
         // DEBUG TOOL: Check the console to see if the token exists
        console.log("Current Token in Memory :",token );
        return;
    }
       
   
    try {
        const response = await fetch('http://127.0.0.1:5000/api/zones/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error("Unauthorized or server error");
        const zones = await response.json();

        zones.forEach(zone => {
            if (zone.latitude && zone.longitude) {
                const circle = L.circle([zone.latitude, zone.longitude], {
                    color: '#2980b9', fillColor: '#3498db', fillOpacity: 0.35, weight: 2, radius: 800
                }).addTo(map);
                
                const isAssigned = zone.zone_operator_name ? true : false;
                const badgeClass = isAssigned ? 'status-badge' : 'status-badge pending';
                const badgeText = isAssigned ? 'Operator Assigned' : 'Pending Assignment';

                const popupContent = `
                    <div class="popup-content">
                        <h3>${zone.name}</h3>
                        <p><strong>District:</strong> ${zone.district}</p>
                        <span class="${badgeClass}">${badgeText}</span>
                        <br><br>
                        <button onclick="triggerAssignModal(${zone.id}, '${zone.name}')" 
                                style="width: 100%; padding: 5px; cursor: pointer;">
                            ${isAssigned ? 'Reassign Operator' : 'Assign Operator'}
                        </button>
                    </div>
                `;
                circle.bindPopup(popupContent);
            }
        });
    } catch (error) {
        console.error('Error fetching zones:', error);
    }
}

// Global function to trigger assignment
window.triggerAssignModal = function(zoneId, zoneName) {
    const operatorId = prompt(`Assigning operator to ${zoneName}.\nEnter the Operator ID:`);
    if(operatorId) {
        console.log(`Ready to assign operator ${operatorId} to zone ${zoneId}!`);
    }
};

// Fire the load function on startup
loadZones();