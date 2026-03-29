
// --- UI TOGGLES & LOGOUT ---
function toggleSb() {
    document.querySelector('.sb')?.classList.toggle('open');
    document.getElementById('overlay')?.classList.toggle('open');
}

document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '/login';
});

(function setDate() {
    const d = document.getElementById('dashboardDate');
    if (!d) return;
    const s = d.getAttribute('data-subtitle') || d.textContent.trim();
    const l = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    d.textContent = `${l} — ${s}`;
})();

// --- GLOBAL STATE ---
let globalData = {
    users: [],
    payments: [],
    vehicles: [],
    zones: [],
    claims: []
};

// --- MASTER DATA FETCH ---
async function fetchAllReportData() {
    try {
        const [users, payments, vehicles, zones, claims] = await Promise.all([
            API.get('/auth/users'),
            API.get('/payments/'),
            API.get('/vehicles/'),
            API.get('/zones/'),
            API.get('/claims/')
        ]);

        globalData = { users, payments, vehicles, zones, claims };
        
        // Trigger initial render
        const periodSelect = document.getElementById('reportPeriodFilter');
        if(periodSelect) updateReportView(periodSelect.value);

    } catch (error) {
        console.error("Failed to load report data:", error);
        Swal.fire('Error', 'Could not load aggregate report data.', 'error');
    }
}

// --- DATA CRUNCHING & RENDERING ---
function updateReportView(periodStr) {
    const now = new Date();
    let cutoffDate = new Date();

    if (periodStr === 'weekly') {
        cutoffDate.setDate(now.getDate() - 7);
    } else if (periodStr === 'monthly') {
        cutoffDate.setMonth(now.getMonth() - 1);
    } else if (periodStr === 'yearly') {
        cutoffDate.setFullYear(now.getFullYear() - 1);
    }

    // 1. Calculate Top Stats
    // Since users don't have a created_at yet, we count all active residents for now
    const newUsers = globalData.users.filter(u => u.role === 'resident').length;
    
    const relevantPayments = globalData.payments.filter(p => new Date(p.submitted_at) >= cutoffDate && p.status === 'approved');
    const totalRevenue = relevantPayments.reduce((sum, p) => sum + p.amount, 0);

    const activeVehicles = globalData.vehicles.filter(v => v.status === 'in_use').length;
    
    // Placeholder for physical waste (backend doesn't track kg yet)
    const mockWasteMultiplier = periodStr === 'weekly' ? 4050 : (periodStr === 'monthly' ? 16200 : 194400);

    document.getElementById('statNewUsers').textContent = newUsers;
    document.getElementById('statTotalRevenue').textContent = totalRevenue.toLocaleString() + ' RWF';
    document.getElementById('statActiveVehicles').textContent = activeVehicles;
    document.getElementById('statWasteCollected').textContent = mockWasteMultiplier.toLocaleString() + ' kg';

    // 2. Render Zone Operator Summaries
    const reportsList = document.getElementById('reportsList');
    reportsList.innerHTML = '';

    const zonesWithOperators = globalData.zones.filter(z => z.zone_operator_id);
    
    if (zonesWithOperators.length === 0) {
        reportsList.innerHTML = `<div style="padding:20px; text-align:center; color:#7f8c8d;">No Zone Operators assigned yet.</div>`;
    }

    zonesWithOperators.forEach(z => {
        // Filter claims for this zone
        const zoneClaims = globalData.claims.filter(c => c.zone_id === z.id && new Date(c.reported_at) >= cutoffDate);
        const claimsCount = zoneClaims.filter(c => c.type === 'claim').length;
        const resolvedCount = zoneClaims.filter(c => c.type === 'claim' && c.status === 'approved').length;
        
        // Find suggestions (if any) to use as the "note"
        const suggestions = zoneClaims.filter(c => c.type === 'suggestion');
        const note = suggestions.length > 0 ? suggestions[0].title || 'Suggestion logged' : 'No recent issues noted';

        // Filter payments for this zone
        const zonePayments = relevantPayments.filter(p => p.zone_id === z.id);
        const paymentsCount = zonePayments.length;
        const zoneRevenue = zonePayments.reduce((sum, p) => sum + p.amount, 0);

        const html = `
        <div class="rr">
          <div>
            <div class="rz">${z.name} — ${z.zone_operator_name}</div>
            <div class="rm">Generated today · ${note}</div>
          </div>
          <div class="rs">
            <div>Claims: <span>${claimsCount}</span></div>
            <div>Resolved: <span>${resolvedCount}</span></div>
            <div>Payments: <span>${paymentsCount}</span></div>
            <div>Revenue: <span>${zoneRevenue.toLocaleString()} RWF</span></div>
          </div>
        </div>`;
        reportsList.insertAdjacentHTML('beforeend', html);
    });

    // 3. Render Vehicle Performance
    const vehicleList = document.getElementById('vehiclePerformance');
    vehicleList.innerHTML = '';

    if (globalData.vehicles.length === 0) {
        vehicleList.innerHTML = `<div style="padding:20px; text-align:center; color:#7f8c8d;">No vehicles registered.</div>`;
    }

    globalData.vehicles.forEach(v => {
        let statusDisplay = 'Available';
        let badgeClass = 'ok';
        
        if (v.status === 'in_use') { statusDisplay = 'Active'; badgeClass = 'go'; }
        if (v.status === 'maintenance') { statusDisplay = 'Maintenance'; badgeClass = 'op'; }

        // Mock stats for trips since backend doesn't track trips explicitly yet
        const mockTrips = v.status === 'in_use' ? Math.floor(Math.random() * 15) + 5 : 0;
        const assignedZone = globalData.zones.length > 0 ? globalData.zones[Math.floor(Math.random() * globalData.zones.length)].name : 'N/A';

        const html = `
        <div class="vi" style="padding: 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between;">
          <div style="flex: 1;">
            <div class="vi-plate" style="font-weight: 700; color: var(--txt);">${v.plate_number}</div>
            <div class="vi-driver" style="font-size: .85rem; color: var(--txt-m); margin-top: 2px;">${v.driver_name}</div>
          </div>
          <div class="vi-stats" style="flex: 1.5; font-size: .85rem; color: var(--txt-m);">
            <div style="margin-bottom: 4px;"><strong style="color:var(--txt);">Trips:</strong> <span>${mockTrips}</span></div>
            <div><strong style="color:var(--txt);">Assigned:</strong> <span>${v.status === 'in_use' ? assignedZone : 'None'}</span></div>
          </div>
          <span class="b ${badgeClass}" style="flex-shrink: 0;">${statusDisplay}</span>
        </div>`;
        
        vehicleList.insertAdjacentHTML('beforeend', html);
    });
}

// --- LISTENERS ---
document.getElementById('reportPeriodFilter')?.addEventListener('change', (e) => {
    updateReportView(e.target.value);
});

// Boot App
fetchAllReportData();
