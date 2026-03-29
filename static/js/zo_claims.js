// Zone Operator Claims Management
document.addEventListener('DOMContentLoaded', function() {
  const token = localStorage.getItem('access_token');

  if (!token) {
    window.location.href = '/login';
    return;
  }

  let allClaims = [];
  let currentFilter = 'all';

  const API_BASE = '/api/claims';
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Category labels mapping
  const categoryLabels = {
    'missed_collection': 'Missed Collection',
    'overflow': 'Overflow',
    'illegal_dumping': 'Illegal Dumping',
    'damaged_infrastructure': 'Damaged Infrastructure',
    'environmental_hazard': 'Environmental Hazard',
    'other': 'Other'
  };

  const rejectionCategoryMap = {
    'insufficient_evidence': 'Insufficient Evidence',
    'duplicate_claim': 'Duplicate Claim',
    'not_in_zone': 'Not In Zone',
    'false_claim': 'False Claim',
    'resolved_already': 'Already Resolved',
    'other': 'Other'
  };

  // Get category icon SVG
  function getCategoryIcon(category) {
    const icons = {
      'overflow': '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#48a870" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>',
      'illegal_dumping': '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#48a870" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
      'missed_collection': '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#48a870" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
      'damaged_infrastructure': '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#48a870" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      'environmental_hazard': '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#48a870" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6"/></svg>',
      'other': '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#48a870" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>'
    };
    return icons[category] || icons['other'];
  }

  // Format date as relative time (e.g., "2h ago")
  function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return interval + 'y ago';

    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return interval + 'mo ago';

    interval = Math.floor(seconds / 86400);
    if (interval > 1) return interval + 'd ago';
    if (interval === 1) return 'Yesterday';

    interval = Math.floor(seconds / 3600);
    if (interval > 1) return interval + 'h ago';

    interval = Math.floor(seconds / 60);
    if (interval > 1) return interval + 'm ago';

    return 'Just now';
  }

  // Get user info from claim
  function getUserDisplay(claim) {
    // Try to get user name, fallback to User ID
    return claim.user?.name || `Resident #${claim.user_id}`;
  }

  // Render claims list
  function renderClaims() {
    const container = document.getElementById('claimsListContainer');
    if (!container) return;

    let filteredClaims = allClaims;

    // Apply filter
    if (currentFilter === 'pending') {
      filteredClaims = allClaims.filter(c => c.status === 'open');
    } else if (currentFilter === 'in-progress') {
      filteredClaims = allClaims.filter(c => c.status === 'under_review');
    } else if (currentFilter === 'resolved') {
      filteredClaims = allClaims.filter(c => c.status === 'approved' || c.status === 'rejected');
    }

    if (filteredClaims.length === 0) {
      container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--txt-l);">No claims found</div>';
      return;
    }

    container.innerHTML = filteredClaims.map(claim => {
      const statusClass = {
        'open': 'open',
        'under_review': 'in-progress',
        'approved': 'approved',
        'rejected': 'rejected'
      }[claim.status] || 'open';

      let actionsHtml = '';
      if (claim.status === 'open') {
        actionsHtml = `
          <div class="ci-acts">
            <button class="btn-ok" onclick="reviewClaim(${claim.id})">Review</button>
          </div>
        `;
      } else if (claim.status === 'under_review') {
        actionsHtml = `
          <div class="ci-acts">
            <button class="btn-ok" onclick="approveClaim(${claim.id}, ${claim.points_awarded || 10})">Approve</button>
            <button class="btn-no" onclick="openRejectModal(${claim.id})">Reject</button>
          </div>
        `;
      } else if (claim.status === 'approved') {
        actionsHtml = `
          <div class="ci-acts">
            <span class="b ok">Resolved</span>
            <span class="points-awarded">+${claim.points_awarded} pts awarded</span>
          </div>
        `;
      } else if (claim.status === 'rejected') {
        actionsHtml = `
          <div class="ci-acts">
            <span class="b" style="background:#ef4444;color:white;padding:4px 8px;border-radius:4px;font-size:.7rem;">Rejected</span>
          </div>
        `;
      }

      const categoryLabel = categoryLabels[claim.claim_category] || claim.claim_category;

      return `
        <div class="ci ${statusClass}" data-claim-id="${claim.id}" data-status="${claim.status}" style="cursor: pointer;" onclick="openClaimDetailModal(${claim.id})">
          <div class="ci-ico">
            ${getCategoryIcon(claim.claim_category)}
          </div>
          <div>
            <div class="ci-ttl">${categoryLabel} ${claim.description ? '— ' + claim.description.substring(0, 30) + (claim.description.length > 30 ? '...' : '') : ''}
              ${claim.status === 'approved' ? '<span class="points-badge">+' + claim.points_awarded + ' pts</span>' : ''}
            </div>
            <div class="ci-meta">${getUserDisplay(claim)} · ${formatTimeAgo(claim.reported_at)}</div>
          </div>
          ${actionsHtml}
        </div>
      `;
    }).join('');
  }

  // Fetch claims from API
  async function fetchClaims() {
    try {
      const response = await fetch(API_BASE, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      allClaims = await response.json();
      renderClaims();
    } catch (error) {
      console.error('Failed to fetch claims:', error);
      const container = document.getElementById('claimsListContainer');
      if (container) {
        container.innerHTML = '<div style="padding: 20px; color: red;">Failed to load claims. Please refresh.</div>';
      }
    }
  }

  // Fetch and update stats
  async function updateStats() {
    try {
      const response = await fetch(API_BASE + '/stats', { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const stats = await response.json();

      document.getElementById('pendingCount').textContent = stats.open || 0;
      document.getElementById('inProgressCount').textContent = stats.under_review || 0;
      document.getElementById('resolvedCount').textContent = (stats.approved || 0) + (stats.rejected || 0);

      // Calculate total points awarded
      const totalPoints = allClaims
        .filter(c => c.status === 'approved')
        .reduce((sum, c) => sum + (c.points_awarded || 0), 0);
      document.getElementById('totalPointsAwarded').textContent = totalPoints;

      // Update badge
      const pendingBadge = document.getElementById('pendingBadge');
      if (pendingBadge) {
        const pendingCount = stats.open || 0;
        pendingBadge.textContent = pendingCount + ' pending';
      }

      // Update page subtitle
      const subtitle = document.getElementById('pageSubtitle');
      if (subtitle) {
        const pendingCount = stats.open || 0;
        subtitle.textContent = `Zone A · ${pendingCount} pending claim${pendingCount !== 1 ? 's' : ''}`;
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }

  // Review claim (open -> under_review)
  window.reviewClaim = async function(claimId) {
    try {
      const response = await fetch(`${API_BASE}/${claimId}/review`, {
        method: 'PUT',
        headers
      });

      if (!response.ok) {
        alert('Failed to review claim');
        return;
      }

      await fetchClaims();
      await updateStats();
    } catch (error) {
      console.error('Error reviewing claim:', error);
      alert('Error reviewing claim');
    }
  };

  // Approve claim
  window.approveClaim = async function(claimId, points = 10) {
    const approveButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
      btn.textContent.includes('Approve') && !btn.textContent.includes('Close')
    );
    const approveBtn = approveButtons[0];

    if (approveBtn) {
      approveBtn.disabled = true;
      approveBtn.innerHTML = '<span style="display: inline-flex; align-items: center; gap: 6px;"><span style="width: 12px; height: 12px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite;"></span>Processing...</span>';
    }

    try {
      const response = await fetch(`${API_BASE}/${claimId}/approve`, {
        method: 'PUT',
        headers
      });

      if (!response.ok) {
        const error = await response.json();
        let errorMsg = error.error || 'Unknown error';

        // Handle specific status cases
        if (error.status === 'approved') {
          errorMsg = 'This claim has already been approved.';
        } else if (error.status === 'rejected') {
          errorMsg = 'This claim has already been rejected. You cannot approve a rejected claim.';
        }

        alert('Cannot approve claim:\n' + errorMsg);

        // Restore button
        if (approveBtn) {
          approveBtn.disabled = false;
          approveBtn.innerHTML = 'Approve';
        }
        return;
      }

      // Success - refresh data and close modal
      await fetchClaims();
      await updateStats();
      closeClaimDetailModal();
      alert('Claim approved successfully!');
    } catch (error) {
      console.error('Error approving claim:', error);
      alert('An error occurred while approving the claim. Please try again.');

      // Restore button
      if (approveBtn) {
        approveBtn.disabled = false;
        approveBtn.innerHTML = 'Approve';
      }
    }
  };

  // Reject claim
  window.rejectClaim = async function(claimId, rejectionCategory, rejectionDetail) {
    try {
      const response = await fetch(`${API_BASE}/${claimId}/reject`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          rejection_category: rejectionCategory,
          rejection_detail: rejectionDetail
        })
      });

      if (!response.ok) {
        const error = await response.json();
        let errorMsg = error.error || 'Unknown error';

        // Handle specific status cases
        if (error.status === 'approved') {
          errorMsg = 'This claim has already been approved. You cannot reject an approved claim.';
        } else if (error.status === 'rejected') {
          errorMsg = 'This claim has already been rejected.';
        }

        alert('Cannot reject claim:\n' + errorMsg);

        // Re-enable buttons
        const rejectModal = document.getElementById('rejectModal');
        const allButtons = rejectModal.querySelectorAll('button');
        allButtons.forEach(btn => {
          btn.disabled = false;
          if (btn.textContent.includes('Confirm')) btn.innerHTML = 'Confirm Rejection';
        });
        return;
      }

      // Success - close modal and refresh
      closeRejectModal();
      await fetchClaims();
      await updateStats();
      alert('Claim rejected successfully!');
    } catch (error) {
      console.error('Error rejecting claim:', error);
      alert('An error occurred while rejecting the claim. Please try again.');

      // Re-enable buttons
      const rejectModal = document.getElementById('rejectModal');
      const allButtons = rejectModal.querySelectorAll('button');
      allButtons.forEach(btn => {
        btn.disabled = false;
        if (btn.textContent.includes('Confirm')) btn.innerHTML = 'Confirm Rejection';
      });
    }
  };

  // Modal functions
  let currentRejectClaimId = null;

  window.openClaimDetailModal = function(claimId) {
    const claim = allClaims.find(c => c.id === claimId);
    if (!claim) return;

    // Populate modal with claim data
    document.getElementById('claimDetailCategory').textContent = categoryLabels[claim.claim_category] || claim.claim_category;
    document.getElementById('claimDetailStatus').textContent = claim.status.charAt(0).toUpperCase() + claim.status.slice(1).replace('_', ' ');
    document.getElementById('claimDetailReporter').textContent = getUserDisplay(claim);
    document.getElementById('claimDetailDate').textContent = new Date(claim.reported_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    document.getElementById('claimDetailDescription').textContent = claim.description || 'No description provided';

    // Handle image
    if (claim.photo_url) {
      const img = document.getElementById('claimDetailImage');
      const errorMsg = document.getElementById('imageErrorMsg');
      img.src = claim.photo_url;
      img.style.display = 'block';
      errorMsg.style.display = 'none';
      img.onerror = function() {
        img.style.display = 'none';
        errorMsg.style.display = 'block';
      };
    } else {
      document.getElementById('claimDetailImage').style.display = 'none';
      document.getElementById('imageErrorMsg').style.display = 'block';
    }

    // Show rejection info if rejected
    const rejectionSection = document.getElementById('rejectionInfoSection');
    if (claim.status === 'rejected') {
      document.getElementById('claimDetailRejectionCategory').textContent = rejectionCategoryMap[claim.rejection_category] || claim.rejection_category;
      document.getElementById('claimDetailRejectionDetail').textContent = claim.rejection_detail || 'No details provided';
      rejectionSection.style.display = 'block';
    } else {
      rejectionSection.style.display = 'none';
    }

    // Show points if approved
    const pointsSection = document.getElementById('pointsAwardedSection');
    if (claim.status === 'approved') {
      document.getElementById('claimDetailPoints').textContent = `+${claim.points_awarded} points`;
      pointsSection.style.display = 'block';
    } else {
      pointsSection.style.display = 'none';
    }

    // Show/hide action buttons based on status
    const actionsDiv = document.getElementById('claimDetailActions');
    if (claim.status === 'open') {
      actionsDiv.innerHTML = `
        <button class="modal-btn cancel" onclick="closeClaimDetailModal()">Close</button>
        <button class="modal-btn" style="background: var(--g2); color: white;" onclick="reviewClaim(${claim.id}); closeClaimDetailModal();">Review Claim</button>
      `;
    } else if (claim.status === 'under_review') {
      actionsDiv.innerHTML = `
        <button class="modal-btn" style="background: #ef4444; color: white;" onclick="openRejectModal(${claim.id})">Reject</button>
        <button class="modal-btn" style="background: var(--g2); color: white;" onclick="approveClaim(${claim.id}); closeClaimDetailModal();">Approve</button>
      `;
    } else {
      actionsDiv.innerHTML = `
        <button class="modal-btn cancel" onclick="closeClaimDetailModal()">Close</button>
      `;
    }

    // Open modal
    const modal = document.getElementById('claimDetailModal');
    if (modal) modal.classList.add('show');
  };

  window.closeClaimDetailModal = function() {
    const modal = document.getElementById('claimDetailModal');
    if (modal) modal.classList.remove('show');
  };

  window.openRejectModal = function(claimId) {
    currentRejectClaimId = claimId;
    closeClaimDetailModal();
    const modal = document.getElementById('rejectModal');
    if (modal) modal.classList.add('show');
  };

  window.closeRejectModal = function() {
    const modal = document.getElementById('rejectModal');
    if (modal) modal.classList.remove('show');
    document.getElementById('rejectReason').value = '';
    document.getElementById('rejectDetails').value = '';
    currentRejectClaimId = null;
  };

  window.confirmReject = function() {
    const reason = document.getElementById('rejectReason').value;
    const details = document.getElementById('rejectDetails').value;

    if (!reason) {
      alert('Please select a rejection reason');
      return;
    }

    if (!details.trim()) {
      alert('Please provide rejection details');
      return;
    }

    // Disable buttons while processing
    const rejectModal = document.getElementById('rejectModal');
    const allButtons = rejectModal.querySelectorAll('button');
    const confirmBtn = Array.from(allButtons).find(btn => btn.textContent.includes('Confirm'));
    const cancelBtn = Array.from(allButtons).find(btn => btn.textContent.includes('Cancel'));

    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span style="display: inline-flex; align-items: center; gap: 6px;"><span style="width: 12px; height: 12px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite;"></span>Processing...</span>';
    }
    if (cancelBtn) cancelBtn.disabled = true;

    rejectClaim(currentRejectClaimId, reason, details);
  };

  // Filter tabs
  const filterTabs = document.querySelectorAll('.ftab');
  filterTabs.forEach(tab => {
    tab.addEventListener('click', function(e) {
      if (this.onclick) return; // Skip if has inline onclick

      filterTabs.forEach(t => t.classList.remove('on'));
      this.classList.add('on');

      const filterMap = {
        'All': 'all',
        'Pending': 'pending',
        'In Progress': 'in-progress',
        'Resolved': 'resolved'
      };

      currentFilter = filterMap[this.textContent.trim()] || 'all';
      renderClaims();
    });
  });

  window.filterTab = function(element) {
    filterTabs.forEach(t => t.classList.remove('on'));
    element.classList.add('on');

    const filterMap = {
      'All': 'all',
      'Pending': 'pending',
      'In Progress': 'in-progress',
      'Resolved': 'resolved'
    };

    currentFilter = filterMap[element.textContent.trim()] || 'all';
    renderClaims();
  };

  // Modal overlay close
  const modalOverlay = document.getElementById('rejectModal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', function(e) {
      if (e.target === this) {
        closeRejectModal();
      }
    });
  }

  const claimDetailOverlay = document.getElementById('claimDetailModal');
  if (claimDetailOverlay) {
    claimDetailOverlay.addEventListener('click', function(e) {
      if (e.target === this) {
        closeClaimDetailModal();
      }
    });
  }

  // Initial load
  fetchClaims();
  updateStats();

  // Refresh every 30 seconds
  setInterval(() => {
    fetchClaims();
    updateStats();
  }, 30000);
});

// Logout function from zo_dash.js
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
}

// Sidebar toggle functions
function toggleSb() {
  const sidebar = document.querySelector('.sb');
  const overlay = document.getElementById('overlay');
  if (sidebar) sidebar.classList.toggle('active');
  if (overlay) overlay.classList.toggle('active');
}

function toggleProfileDd(event) {
  event.stopPropagation();
  const dd = document.getElementById('profileDd');
  if (dd) dd.classList.toggle('active');
}
