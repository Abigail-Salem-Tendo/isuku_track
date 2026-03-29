
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
  let globalZones = [];
  let globalOperators = [];
  let currentFilter = 'All';
  
  // --- API FETCH & RENDER ---
  async function fetchAndRenderData() {
      try {
          const [zonesData, usersData] = await Promise.all([
              API.get('/zones/'),
              API.get('/auth/users?role=zone_operator')
          ]);
          
          globalZones = zonesData;
          globalOperators = usersData;
  
          renderTable();
          updateCounters();
      } catch (error) {
          Swal.fire('Error', 'Failed to load operator data', 'error');
      }
  }
  
  function renderTable() {
      const tbody = document.getElementById('zoneOperatorTableBody');
      tbody.innerHTML = '';
  
      globalOperators.forEach(op => {
          // Find if this operator is assigned to any zone
          const assignedZone = globalZones.find(z => z.zone_operator_id === op.id);
          const zoneName = assignedZone ? assignedZone.name : '<span style="color:#e74c3c;">None</span>';
          const zoneLoc = assignedZone && assignedZone.district ? `${assignedZone.district} · ${assignedZone.sector}` : '';
          
          const statusDisplay = assignedZone ? 'Assigned' : 'Unassigned';
          const badgeClass = assignedZone ? 'go' : 'pe';
          
          // Filter Logic
          if (currentFilter !== 'All' && statusDisplay !== currentFilter) return;
  
          const row = `
              <tr>
                  <td><div class="zn">${op.username}</div></td>
                  <td><div style="font-size:13px;">${op.email}</div><div class="ci-meta" style="margin-top:2px;">${op.phone_number || 'No phone'}</div></td>
                  <td><div class="zn" style="font-size:13px;">${zoneName}</div><div class="zg">${zoneLoc}</div></td>
                  <td><span class="b ${badgeClass}">${statusDisplay}</span></td>
              </tr>`;
          tbody.insertAdjacentHTML('beforeend', row);
      });
  
      if (tbody.innerHTML === '') {
          tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:#7f8c8d;">No operators match this filter.</td></tr>`;
      }
  }
  
  function updateCounters() {
      const counts = { 'All': globalOperators.length, 'Assigned': 0, 'Unassigned': 0 };
      
      globalOperators.forEach(op => { 
          const isAssigned = globalZones.some(z => z.zone_operator_id === op.id);
          if (isAssigned) counts['Assigned']++;
          else counts['Unassigned']++;
      });
  
      document.getElementById('zoTotalCount').textContent = counts['All'];
      document.getElementById('zoAssignedCount').textContent = counts['Assigned'];
      document.getElementById('zoUnassignedCount').textContent = counts['Unassigned'];
  }
  
  // --- TAB FILTERING ---
  document.querySelectorAll('.zone-operator-status-ribbon .ftab').forEach(tab => {
      tab.addEventListener('click', (e) => {
          document.querySelectorAll('.zone-operator-status-ribbon .ftab').forEach(t => t.classList.remove('on'));
          const clickedTab = e.currentTarget;
          clickedTab.classList.add('on');
          currentFilter = clickedTab.getAttribute('data-zo-filter');
          renderTable();
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
  
  // --- CREATE OPERATOR ---
  document.getElementById('createZoBtn').addEventListener('click', () => {
      document.getElementById('zoModalForm').innerHTML = `
          <label class="mf-lbl">Full Name<input class="mf-in" id="newZoName" required placeholder="Jean-Pierre K." /></label>
          <label class="mf-lbl">Email<input class="mf-in" id="newZoEmail" type="email" required placeholder="jean@example.com" /></label>
          <label class="mf-lbl">Phone Number<input class="mf-in" id="newZoPhone" required placeholder="0788..." /></label>
          <div style="background:#f5f5f5;padding:10px;border-radius:6px;margin:12px 0;font-size:.74rem;color:var(--txt-m);">
              <strong>Note:</strong> A secure setup link will be generated instantly for this operator.
          </div>
          <div class="mf-actions">
              <button type="button" class="mf-btn sec" onclick="closeModal('zoModal')">Cancel</button>
              <button type="submit" class="mf-btn">Create Operator</button>
          </div>`;
      openModal('zoModal');
  });
  
  document.getElementById('zoModalForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const payload = {
          username: document.getElementById('newZoName').value.trim(),
          email: document.getElementById('newZoEmail').value.trim(),
          phone_number: document.getElementById('newZoPhone').value.trim(),
          password: "TempPassword123!", 
          role: "zone_operator"
      };
  
      try {
          const data = await API.post('/auth/register', payload);
          closeModal('zoModal');
          fetchAndRenderData(); 
          
          if (data.reset_token) {
            const setupLink = `${window.location.origin}/reset-password?token=${data.reset_token}`;
              Swal.fire({
                  title: 'Operator Created!',
                  html: `Copy this secure setup link and send it to the operator:<br><br><input type="text" value="${setupLink}" style="width:100%; padding:8px; text-align:center; border: 1px solid #ccc; border-radius: 4px;" readonly onclick="this.select()">`,
                  icon: 'success',
                  confirmButtonText: 'Done'
              });
          } else {
              Swal.fire('Success', 'Operator created successfully!', 'success');
          }
      } catch (error) { Swal.fire('Error', error.message, 'error'); }
  });
  
  // --- MODIFY OPERATOR ---
  document.getElementById('modifyZoBtn').addEventListener('click', () => {
      if (globalOperators.length === 0) return Swal.fire('Info', 'No operators available', 'info');
      
      let options = '<option value="">Choose an operator...</option>';
      globalOperators.forEach(op => { options += `<option value="${op.id}">${op.username}</option>`; });
  
      document.getElementById('modifyZoModalForm').innerHTML = `
          <label class="mf-lbl">Select Operator<select class="mf-in" id="modZoSelect" required>${options}</select></label>
          <label class="mf-lbl">Full Name<input class="mf-in" id="modZoName" required /></label>
          <label class="mf-lbl">Phone Number<input class="mf-in" id="modZoPhone" required /></label>
          <div class="mf-actions">
              <button type="button" class="mf-btn sec" onclick="closeModal('modifyZoModal')">Cancel</button>
              <button type="submit" class="mf-btn" style="background:#1976d2;">Update</button>
          </div>`;
          
      document.getElementById('modZoSelect').addEventListener('change', (e) => {
          const op = globalOperators.find(o => o.id == e.target.value);
          if (op) {
              document.getElementById('modZoName').value = op.username;
              document.getElementById('modZoPhone').value = op.phone_number || '';
          }
      });
  
      openModal('modifyZoModal');
  });
  
  document.getElementById('modifyZoModalForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const opId = document.getElementById('modZoSelect').value;
      if (!opId) return;
  
      try {
          await API.put(`/auth/users/${opId}`, {
              username: document.getElementById('modZoName').value.trim(),
              phone_number: document.getElementById('modZoPhone').value.trim()
          });
          closeModal('modifyZoModal');
          Swal.fire('Updated!', 'Operator details updated.', 'success');
          fetchAndRenderData();
      } catch (error) { Swal.fire('Error', error.message, 'error'); }
  });
  
  // --- DELETE OPERATOR ---
  document.getElementById('deleteZoBtn').addEventListener('click', () => {
      if (globalOperators.length === 0) return Swal.fire('Info', 'No operators to delete', 'info');
      
      let options = '<option value="">Choose an operator...</option>';
      globalOperators.forEach(op => { options += `<option value="${op.id}">${op.username} (${op.email})</option>`; });
  
      document.getElementById('zoDeleteModalForm').innerHTML = `
          <label class="mf-lbl">Select Operator to Delete<select class="mf-in" id="delZoSelect" required>${options}</select></label>
          <div style="background:#fff3cd;padding:10px;border-radius:6px;margin:12px 0;font-size:.74rem;color:#856404;border:1px solid #ffc107;">
              <strong>⚠ Warning:</strong> Deleting an operator removes their system access.
          </div>
          <div class="mf-actions">
              <button type="button" class="mf-btn sec" onclick="closeModal('zoDeleteModal')">Cancel</button>
              <button type="submit" class="mf-btn" style="background:#d32f2f;">Delete</button>
          </div>`;
      openModal('zoDeleteModal');
  });
  
  document.getElementById('zoDeleteModalForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const opId = document.getElementById('delZoSelect').value;
      if (!opId) return;
  
      try {
          await API.delete(`/auth/users/${opId}`);
          closeModal('zoDeleteModal');
          Swal.fire('Deleted!', 'Operator account removed.', 'success');
          fetchAndRenderData();
      } catch (error) { Swal.fire('Error', error.message, 'error'); }
  });
  
  // Boot App
  fetchAndRenderData();
  