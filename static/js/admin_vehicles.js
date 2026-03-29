
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
  let globalVehicles = [];
  let currentFilter = 'All';
  
  // --- API FETCH & RENDER ---
  async function fetchAndRenderVehicles() {
      try {
          globalVehicles = await API.get('/vehicles/');
          renderTable();
          updateCounters();
      } catch (error) {
          Swal.fire('Error', 'Failed to load fleet data', 'error');
      }
  }
  
    function getDisplayStatus(dbStatus) {
      const normalized = String(dbStatus || '').trim().toLowerCase();
      if (normalized === 'in_use' || normalized === 'in use') return 'In Use';
      if (normalized === 'maintenance') return 'Maintenance';
      return 'Available';
  }
  
  function renderTable() {
      const tbody = document.getElementById('vehicleTableBody');
      tbody.innerHTML = '';
      let visibleCount = 0;
  
      globalVehicles.forEach(v => {
          const displayStatus = getDisplayStatus(v.status);
          
          // Only show vehicles matching the selected top tab
        if (currentFilter !== 'All' && displayStatus !== currentFilter) return;
  
          let badgeClass = 'ok';
        if (displayStatus === 'In Use') badgeClass = 'go';
        if (displayStatus === 'Maintenance') badgeClass = 'op';
  
          const row = `
              <tr>
                  <td>${v.plate_number}</td>
                  <td>${v.driver_name}</td>
                  <td>${v.driver_phone}</td>
                  <td><span class="b ${badgeClass}">${displayStatus}</span></td>
              </tr>`;
          tbody.insertAdjacentHTML('beforeend', row);
        visibleCount += 1;
      });

      if (visibleCount === 0) {
        const message = currentFilter === 'All'
          ? 'No vehicles found yet.'
          : `No vehicles with status "${currentFilter}".`;
        tbody.insertAdjacentHTML('beforeend', `<tr><td colspan="4" style="text-align:center;color:#7a8780;">${message}</td></tr>`);
      }
  }
  
  function updateCounters() {
      const counts = { 'All': 0, 'Available': 0, 'In Use': 0, 'Maintenance': 0 };
      globalVehicles.forEach(v => {
        counts['All'] += 1;
          counts[getDisplayStatus(v.status)]++;
      });
  
      document.getElementById('vehicleAllCount').textContent = counts['All'];
      document.getElementById('vehicleAvailableCount').textContent = counts['Available'];
      document.getElementById('vehicleInUseCount').textContent = counts['In Use'];
      document.getElementById('vehicleMaintenanceCount').textContent = counts['Maintenance'];
  }
  
  // --- TAB FILTERING ---
  document.querySelectorAll('.zone-operator-status-ribbon .ftab').forEach(tab => {
      tab.addEventListener('click', (e) => {
          document.querySelectorAll('.zone-operator-status-ribbon .ftab').forEach(t => t.classList.remove('on'));
          const clickedTab = e.currentTarget;
          clickedTab.classList.add('on');
          
          currentFilter = clickedTab.getAttribute('data-vehicle-filter');
          renderTable(); // Re-render table with new filter
      });
  });
  
  // --- MODAL HELPERS ---
  function closeModal(modalId) {
      const modal = document.getElementById(modalId);
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
  }
  
  function openModal(modalId) {
      const modal = document.getElementById(modalId);
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
  }
  
  // --- CREATE VEHICLE ---
  document.getElementById('createVehicleBtn').addEventListener('click', () => {
      document.getElementById('vehicleModalForm').innerHTML = `
          <label class="mf-lbl">Plate Number<input class="mf-in" id="newPlate" required placeholder="RAD 001A" /></label>
          <label class="mf-lbl">Driver Name<input class="mf-in" id="newDriver" required placeholder="John Doe" /></label>
          <label class="mf-lbl">Phone Number<input class="mf-in" id="newPhone" required placeholder="0788..." /></label>
          <label class="mf-lbl">Status
              <select class="mf-in" id="newStatus">
                  <option value="available">Available</option>
                  <option value="in_use">In Use</option>
                  <option value="maintenance">Maintenance</option>
              </select>
          </label>
          <div class="mf-actions">
              <button type="button" class="mf-btn sec" onclick="closeModal('vehicleModal')">Cancel</button>
              <button type="submit" class="mf-btn">Add Vehicle</button>
          </div>`;
      openModal('vehicleModal');
  });
  
  document.getElementById('vehicleModalForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
          plate_number: document.getElementById('newPlate').value.trim().toUpperCase(),
          driver_name: document.getElementById('newDriver').value.trim(),
          driver_phone: document.getElementById('newPhone').value.trim(),
          status: document.getElementById('newStatus').value
      };
  
      try {
          await API.post('/vehicles/', payload);
          closeModal('vehicleModal');
          Swal.fire('Created!', 'Vehicle added successfully.', 'success');
          fetchAndRenderVehicles();
      } catch (error) { Swal.fire('Error', error.message, 'error'); }
  });
  
  // --- MODIFY VEHICLE ---
  document.getElementById('modifyVehicleBtn').addEventListener('click', () => {
      if (globalVehicles.length === 0) return Swal.fire('Info', 'No vehicles to modify', 'info');
      
      let options = '<option value="">Choose vehicle...</option>';
      globalVehicles.forEach(v => { options += `<option value="${v.id}">${v.plate_number}</option>`; });
  
      document.getElementById('modifyVehicleModalForm').innerHTML = `
          <label class="mf-lbl">Select Vehicle<select class="mf-in" id="modSelect" required>${options}</select></label>
          <label class="mf-lbl">Driver Name<input class="mf-in" id="modDriver" required /></label>
          <label class="mf-lbl">Phone Number<input class="mf-in" id="modPhone" required /></label>
          <label class="mf-lbl">Status
              <select class="mf-in" id="modStatus">
                  <option value="available">Available</option>
                  <option value="in_use">In Use</option>
                  <option value="maintenance">Maintenance</option>
              </select>
          </label>
          <div class="mf-actions">
              <button type="button" class="mf-btn sec" onclick="closeModal('modifyVehicleModal')">Cancel</button>
              <button type="submit" class="mf-btn" style="background:#1976d2;">Update</button>
          </div>`;
      
      // Auto-fill form when selection changes
      document.getElementById('modSelect').addEventListener('change', (e) => {
          const v = globalVehicles.find(x => x.id == e.target.value);
          if (v) {
              document.getElementById('modDriver').value = v.driver_name;
              document.getElementById('modPhone').value = v.driver_phone;
              document.getElementById('modStatus').value = v.status;
          }
      });
  
      openModal('modifyVehicleModal');
  });
  
  document.getElementById('modifyVehicleModalForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const vId = document.getElementById('modSelect').value;
      if (!vId) return;
  
      const payload = {
          driver_name: document.getElementById('modDriver').value.trim(),
          driver_phone: document.getElementById('modPhone').value.trim(),
          status: document.getElementById('modStatus').value
      };
  
      try {
          await API.put(`/vehicles/${vId}`, payload);
          closeModal('modifyVehicleModal');
          Swal.fire('Updated!', 'Vehicle updated.', 'success');
          fetchAndRenderVehicles();
      } catch (error) { Swal.fire('Error', error.message, 'error'); }
  });
  
  // --- DELETE VEHICLE ---
  document.getElementById('deleteVehicleBtn').addEventListener('click', () => {
      if (globalVehicles.length === 0) return Swal.fire('Info', 'No vehicles to delete', 'info');
      
      let options = '<option value="">Choose vehicle...</option>';
      globalVehicles.forEach(v => { options += `<option value="${v.id}">${v.plate_number}</option>`; });
  
      document.getElementById('deleteVehicleModalForm').innerHTML = `
          <label class="mf-lbl">Select Vehicle<select class="mf-in" id="delSelect" required>${options}</select></label>
          <div class="mf-actions">
              <button type="button" class="mf-btn sec" onclick="closeModal('deleteVehicleModal')">Cancel</button>
              <button type="submit" class="mf-btn" style="background:#d32f2f;">Delete</button>
          </div>`;
      openModal('deleteVehicleModal');
  });
  
  document.getElementById('deleteVehicleModalForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const vId = document.getElementById('delSelect').value;
      if (!vId) return;
  
      try {
          await API.delete(`/vehicles/${vId}`);
          closeModal('deleteVehicleModal');
          Swal.fire('Deleted!', 'Vehicle removed from fleet.', 'success');
          fetchAndRenderVehicles();
      } catch (error) { Swal.fire('Error', error.message, 'error'); }
  });
  
  // Boot App
  fetchAndRenderVehicles();
  