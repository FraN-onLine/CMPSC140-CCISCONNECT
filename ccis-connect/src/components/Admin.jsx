import React, { useState } from 'react';

export default function Admin({ 
  rooms, 
  equipment, 
  requests, 
  currentUser, 
  onApproveRequest, 
  onRejectRequest, 
  onReturnEquipment,
  onToggleRoom,
  onUpdateEquipmentStatus 
}) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [returnForm, setReturnForm] = useState({ equipmentId: '', quantity: 1 });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRequestDetails, setShowRequestDetails] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState('');
  
  // Equipment status management state
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [showStatusUpdateModal, setShowStatusUpdateModal] = useState(false);
  const [statusUpdateData, setStatusUpdateData] = useState({
    status: '',
    available: true,
    quantity: 0,
    reason: ''
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [statusError, setStatusError] = useState('');
  const [statusSuccess, setStatusSuccess] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [auditLog, setAuditLog] = useState([]);

  if (currentUser.role !== 'admin') {
    return (
      <div className="admin-view">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You must be logged in as an administrator to access this section.</p>
        </div>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');
  
  const availableRooms = rooms.filter(r => r.available).length;
  const occupiedRooms = rooms.filter(r => !r.available).length;
  const totalEquipment = equipment.reduce((sum, eq) => sum + eq.quantity, 0);
  const borrowedEquipment = equipment.filter(eq => !eq.available || eq.quantity === 0).length;

  const handleReturn = () => {
    if (!returnForm.equipmentId) {
      alert('Please select equipment to return.');
      return;
    }
    onReturnEquipment(returnForm.equipmentId, returnForm.quantity);
    alert(`Marked ${returnForm.quantity} item(s) as returned.`);
    setReturnForm({ equipmentId: '', quantity: 1 });
  };

  // Open status update modal
  const handleStatusUpdateClick = (eq) => {
    // Check for pending requests
    const pendingForEquipment = requests.filter(
      r => r.equipmentId === eq.id && r.status === 'pending'
    );

    if (pendingForEquipment.length > 0 && eq.quantity > 0) {
      const count = pendingForEquipment.length;
      setConfirmationMessage(
        `Warning: This equipment has ${count} pending request${count > 1 ? 's' : ''}. ` +
        `Changing status to "Unavailable" or "Under Maintenance" will affect these requests.`
      );
    }

    setSelectedEquipment(eq);
    setStatusUpdateData({
      status: eq.available ? 'Available' : 'Unavailable',
      available: eq.available,
      quantity: eq.quantity,
      reason: ''
    });
    setShowStatusUpdateModal(true);
    setStatusError('');
    setStatusSuccess('');
  };

  // Handle status update submission
  const handleSubmitStatusUpdate = () => {
    if (!selectedEquipment) return;

    // Validate reason for status change
    if (!statusUpdateData.reason.trim()) {
      setStatusError('Please provide a reason for the status update.');
      return;
    }

    // Show confirmation dialog
    setShowConfirmation(true);
  };

  // Confirm and execute status update
  const confirmStatusUpdate = () => {
    if (!selectedEquipment) return;

    try {
      const updatePayload = {
        equipmentId: selectedEquipment.id,
        status: statusUpdateData.status,
        available: statusUpdateData.available,
        quantity: statusUpdateData.quantity,
        reason: statusUpdateData.reason,
        updatedBy: currentUser.name,
        timestamp: new Date().toISOString()
      };

      // Log the change
      const logEntry = {
        id: Date.now(),
        equipmentId: selectedEquipment.id,
        equipmentName: selectedEquipment.name,
        oldStatus: selectedEquipment.available ? 'Available' : 'Unavailable',
        newStatus: statusUpdateData.status,
        oldQuantity: selectedEquipment.quantity,
        newQuantity: statusUpdateData.quantity,
        reason: statusUpdateData.reason,
        staffId: currentUser.name,
        timestamp: new Date().toLocaleString()
      };
      setAuditLog(prev => [logEntry, ...prev]);

      // Call the update handler
      if (onUpdateEquipmentStatus) {
        onUpdateEquipmentStatus(updatePayload);
      }

      setStatusSuccess(`Equipment status updated successfully. All users can now see the updated status.`);
      
      // Close modals after brief delay
      setTimeout(() => {
        setShowConfirmation(false);
        setShowStatusUpdateModal(false);
        setSelectedEquipment(null);
        setStatusSuccess('');
      }, 2000);

    } catch (error) {
      setStatusError('Unable to update equipment status. System error occurred. Please try again or contact system administrator.');
      setShowConfirmation(false);
    }
  };

  // Cancel status update
  const cancelStatusUpdate = () => {
    setShowStatusUpdateModal(false);
    setShowConfirmation(false);
    setSelectedEquipment(null);
    setStatusUpdateData({
      status: '',
      available: true,
      quantity: 0,
      reason: ''
    });
    setStatusError('');
    setStatusSuccess('');
    setConfirmationMessage('');
  };

  // Bulk status update
  const handleBulkStatusUpdate = () => {
    if (selectedItems.length === 0) {
      setStatusError('Please select at least one equipment item.');
      return;
    }

    if (!bulkStatus) {
      setStatusError('Please select a status to apply.');
      return;
    }

    setShowBulkUpdate(true);
  };

  const confirmBulkUpdate = () => {
    selectedItems.forEach(itemId => {
      const eq = equipment.find(e => e.id === itemId);
      if (eq && onUpdateEquipmentStatus) {
        const updatePayload = {
          equipmentId: itemId,
          status: bulkStatus,
          available: bulkStatus === 'Available',
          quantity: eq.quantity,
          reason: 'Bulk status update',
          updatedBy: currentUser.name,
          timestamp: new Date().toISOString()
        };
        onUpdateEquipmentStatus(updatePayload);

        // Log bulk update
        const logEntry = {
          id: Date.now() + Math.random(),
          equipmentId: itemId,
          equipmentName: eq.name,
          oldStatus: eq.available ? 'Available' : 'Unavailable',
          newStatus: bulkStatus,
          oldQuantity: eq.quantity,
          newQuantity: eq.quantity,
          reason: 'Bulk status update',
          staffId: currentUser.name,
          timestamp: new Date().toLocaleString()
        };
        setAuditLog(prev => [logEntry, ...prev]);
      }
    });

    setStatusSuccess(`Bulk update completed: ${selectedItems.length} items updated.`);
    setSelectedItems([]);
    setBulkStatus('');
    setShowBulkUpdate(false);
    setTimeout(() => setStatusSuccess(''), 3000);
  };

  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleViewRequestDetails = (request) => {
    setSelectedRequest(request);
    setShowRequestDetails(true);
    setRequestError('');
    setRequestSuccess('');
  };

  const handleCloseRequestDetails = () => {
    setShowRequestDetails(false);
    setSelectedRequest(null);
    setRequestError('');
    setRequestSuccess('');
  };

  const validateRequest = (request) => {
    // Check if request has all required information
    if (!request.equipmentId || !request.quantity || !request.requester) {
      return {
        valid: false,
        message: 'Request details incomplete. Please verify with requester.'
      };
    }

    // Check real-time equipment availability
    const eq = equipment.find(e => e.id === request.equipmentId);
    if (!eq) {
      return {
        valid: false,
        message: 'Equipment not found in inventory.'
      };
    }

    if (eq.quantity < request.quantity) {
      return {
        valid: false,
        message: `Insufficient equipment available. Only ${eq.quantity} unit(s) available, but ${request.quantity} requested.`
      };
    }

    if (!eq.available) {
      return {
        valid: false,
        message: 'Equipment is currently unavailable.'
      };
    }

    return { valid: true };
  };

  const handleApproveRequest = (requestId) => {
    const request = requests.find(r => r.id === requestId);
    if (!request) {
      setRequestError('Request not found.');
      return;
    }

    // Validate request
    const validation = validateRequest(request);
    if (!validation.valid) {
      setRequestError(validation.message);
      return;
    }

    try {
      onApproveRequest(requestId);
      setRequestSuccess(`Request approved! Equipment assigned to ${request.requester}.`);
      setRequestError('');
      
      // Close details modal after 2 seconds
      setTimeout(() => {
        handleCloseRequestDetails();
      }, 2000);
    } catch (error) {
      setRequestError('Approval failed. Please try again later.');
    }
  };

  const handleRejectRequest = (requestId) => {
    const request = requests.find(r => r.id === requestId);
    if (!request) {
      setRequestError('Request not found.');
      return;
    }

    try {
      onRejectRequest(requestId);
      setRequestSuccess(`Request rejected.`);
      setRequestError('');
      
      // Close details modal after 2 seconds
      setTimeout(() => {
        handleCloseRequestDetails();
      }, 2000);
    } catch (error) {
      setRequestError('Rejection failed. Please try again later.');
    }
  };

  return (
    <div className="admin-view">
      <div className="admin-header">
        <h2>Administrative Dashboard</h2>
        <p className="subtitle">Manage rooms, equipment, and borrowing requests</p>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button 
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={activeTab === 'requests' ? 'active' : ''}
          onClick={() => setActiveTab('requests')}
        >
          Requests ({pendingRequests.length})
        </button>
        <button 
          className={activeTab === 'rooms' ? 'active' : ''}
          onClick={() => setActiveTab('rooms')}
        >
          Room Management
        </button>
        <button 
          className={activeTab === 'equipment' ? 'active' : ''}
          onClick={() => setActiveTab('equipment')}
        >
          Equipment Management
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="admin-dashboard">
          <div className="dashboard-stats">
            <div className="stat-card">
              <div className="stat-icon">🏫</div>
              <div className="stat-content">
                <div className="stat-value">{rooms.length}</div>
                <div className="stat-label">Total Rooms</div>
                <div className="stat-detail">{availableRooms} available, {occupiedRooms} occupied</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📦</div>
              <div className="stat-content">
                <div className="stat-value">{totalEquipment}</div>
                <div className="stat-label">Total Equipment</div>
                <div className="stat-detail">{borrowedEquipment} currently in use</div>
              </div>
            </div>
            <div className="stat-card warning">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <div className="stat-value">{pendingRequests.length}</div>
                <div className="stat-label">Pending Requests</div>
                <div className="stat-detail">Awaiting approval</div>
              </div>
            </div>
            <div className="stat-card success">
              <div className="stat-icon">✓</div>
              <div className="stat-content">
                <div className="stat-value">{approvedRequests.length}</div>
                <div className="stat-label">Approved Requests</div>
                <div className="stat-detail">This period</div>
              </div>
            </div>
          </div>

          <div className="dashboard-sections">
            <div className="dashboard-section">
              <h3>Recent Activity</h3>
              <div className="activity-list">
                {requests.slice(0, 10).map(req => (
                  <div key={req.id} className="activity-item">
                    <div className="activity-icon">
                      {req.status === 'pending' && '⏳'}
                      {req.status === 'approved' && '✓'}
                      {req.status === 'rejected' && '✗'}
                    </div>
                    <div className="activity-content">
                      <div className="activity-title">
                        {req.equipmentName} × {req.qty} requested by {req.requester}
                      </div>
                      <div className="activity-meta">
                        {new Date(req.createdAt).toLocaleString()} • {req.status}
                      </div>
                    </div>
                  </div>
                ))}
                {requests.length === 0 && (
                  <p className="no-activity">No recent activity.</p>
                )}
              </div>
            </div>

            <div className="dashboard-section">
              <h3>Quick Actions</h3>
              <div className="quick-actions">
                <button 
                  className="action-btn"
                  onClick={() => setActiveTab('requests')}
                >
                  Review Pending Requests
                </button>
                <button 
                  className="action-btn"
                  onClick={() => setActiveTab('rooms')}
                >
                  Manage Rooms
                </button>
                <button 
                  className="action-btn"
                  onClick={() => setActiveTab('equipment')}
                >
                  Manage Equipment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <div className="admin-requests">
          <div className="requests-header">
            <h3>Equipment Borrowing Requests</h3>
            <p className="requests-subtitle">Review and manage pending equipment requests</p>
            <div className="request-filters">
              <span className={pendingRequests.length > 0 ? 'filter-active' : 'filter-inactive'}>
                ⏳ Pending: {pendingRequests.length}
              </span>
              <span className="filter-info">
                ✓ Approved: {approvedRequests.length}
              </span>
              <span className="filter-info">
                ✗ Rejected: {rejectedRequests.length}
              </span>
            </div>
          </div>

          {/* Pending Requests */}
          <div className="requests-section">
            <h4>Pending Requests</h4>
            <div className="requests-list">
              {pendingRequests.length === 0 ? (
                <div className="no-requests">
                  <span className="no-requests-icon">✅</span>
                  <p>No pending requests at this time.</p>
                </div>
              ) : (
                pendingRequests.map(req => {
                  const eq = equipment.find(e => e.id === req.equipmentId);
                  const validation = validateRequest(req);
                  
                  return (
                    <div key={req.id} className="request-card pending">
                      <div className="request-card-header">
                        <div className="request-title">
                          <strong>{req.equipmentName}</strong>
                          <span className="request-quantity">× {req.quantity}</span>
                        </div>
                        <span className="request-status pending">⏳ Pending</span>
                      </div>
                      <div className="request-card-body">
                        <div className="request-detail">
                          <strong>Requester:</strong> {req.userName || req.requester} ({req.userRole})
                        </div>
                        {req.purpose && (
                          <div className="request-detail">
                            <strong>Purpose:</strong> {req.purpose}
                          </div>
                        )}
                        <div className="request-detail">
                          <strong>Requested:</strong> {new Date(req.requestDate || req.createdAt).toLocaleString()}
                        </div>
                        <div className="request-detail">
                          <strong>Duration:</strong> {req.duration}
                        </div>
                        <div className="request-detail">
                          <strong>Available Stock:</strong> 
                          <span className={eq && eq.quantity >= req.quantity ? 'stock-available' : 'stock-low'}>
                            {eq ? ` ${eq.quantity} unit(s)` : ' Unknown'}
                          </span>
                        </div>
                        {!validation.valid && (
                          <div className="request-warning">
                            <span className="warning-icon">⚠️</span>
                            <span>{validation.message}</span>
                          </div>
                        )}
                      </div>
                      <div className="request-card-actions">
                        <button 
                          className="btn-details"
                          onClick={() => handleViewRequestDetails(req)}
                        >
                          📋 View Details
                        </button>
                        <button 
                          className="btn-approve"
                          onClick={() => handleApproveRequest(req.id)}
                          disabled={!validation.valid}
                        >
                          ✓ Accept Request
                        </button>
                        <button 
                          className="btn-reject"
                          onClick={() => handleRejectRequest(req.id)}
                        >
                          ✗ Reject
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {approvedRequests.length > 0 && (
            <div className="requests-section">
              <h4>Approved Requests</h4>
              <div className="requests-list">
                {approvedRequests.slice(0, 10).map(req => (
                  <div key={req.id} className="request-card approved">
                    <div className="request-card-header">
                      <div className="request-title">
                        <strong>{req.equipmentName}</strong> × {req.quantity || req.qty}
                      </div>
                      <span className="request-status approved">✓ Approved</span>
                    </div>
                    <div className="request-card-body">
                      <div className="request-detail">
                        {req.userName || req.requester} • {new Date(req.approvedDate || req.approvedAt).toLocaleString()}
                      </div>
                      <div className="request-detail">
                        <strong>Return Date:</strong> {req.returnDate}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejected Requests */}
          {rejectedRequests.length > 0 && (
            <div className="requests-section">
              <h4>Rejected Requests</h4>
              <div className="requests-list">
                {rejectedRequests.slice(0, 10).map(req => (
                  <div key={req.id} className="request-card rejected">
                    <div className="request-card-header">
                      <div className="request-title">
                        <strong>{req.equipmentName}</strong> × {req.quantity || req.qty}
                      </div>
                      <span className="request-status rejected">✗ Rejected</span>
                    </div>
                    <div className="request-card-body">
                      <div className="request-detail">
                        {req.userName || req.requester} • {new Date(req.rejectedDate || req.rejectedAt).toLocaleString()}
                      </div>
                      {req.rejectionReason && (
                        <div className="request-detail rejection-reason">
                          <strong>Reason:</strong> {req.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Returned/Completed Requests */}
          {requests.filter(r => r.status === 'returned').length > 0 && (
            <div className="requests-section">
              <h4>Returned Equipment</h4>
              <div className="requests-list">
                {requests.filter(r => r.status === 'returned').slice(0, 10).map(req => (
                  <div key={req.id} className="request-card returned">
                    <div className="request-card-header">
                      <div className="request-title">
                        <strong>{req.equipmentName}</strong> × {req.quantity || req.qty}
                      </div>
                      <span className="request-status returned">↩ Returned</span>
                    </div>
                    <div className="request-card-body">
                      <div className="request-detail">
                        {req.userName || req.requester} • Returned: {new Date(req.actualReturnDate).toLocaleString()}
                      </div>
                      {req.condition && (
                        <div className="request-detail">
                          <strong>Condition:</strong> {req.condition}
                        </div>
                      )}
                      {req.lateFee && (
                        <div className="request-detail late-fee">
                          <strong>Late Fee:</strong> ₱{req.lateFee}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overdue Requests */}
          {requests.filter(r => r.status === 'overdue').length > 0 && (
            <div className="requests-section">
              <h4>⚠️ Overdue Equipment</h4>
              <div className="requests-list">
                {requests.filter(r => r.status === 'overdue').map(req => (
                  <div key={req.id} className="request-card overdue">
                    <div className="request-card-header">
                      <div className="request-title">
                        <strong>{req.equipmentName}</strong> × {req.quantity || req.qty}
                      </div>
                      <span className="request-status overdue">⚠ Overdue</span>
                    </div>
                    <div className="request-card-body">
                      <div className="request-detail">
                        {req.userName || req.requester} • Expected: {req.returnDate}
                      </div>
                      <div className="request-detail overdue-days">
                        <strong>Days Overdue:</strong> {req.daysOverdue} days
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Request Details Modal */}
      {showRequestDetails && selectedRequest && (
        <div className="modal-overlay" onClick={handleCloseRequestDetails}>
          <div className="modal-content request-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request Details</h3>
              <button className="modal-close" onClick={handleCloseRequestDetails}>×</button>
            </div>
            
            <div className="modal-body">
              {requestError && (
                <div className="modal-error">
                  <span className="error-icon">⚠️</span>
                  <span>{requestError}</span>
                </div>
              )}
              
              {requestSuccess && (
                <div className="modal-success">
                  <span className="success-icon">✅</span>
                  <span>{requestSuccess}</span>
                </div>
              )}

              <div className="request-details-grid">
                <div className="detail-section">
                  <h4>Equipment Information</h4>
                  <div className="detail-row">
                    <span className="detail-label">Equipment Name:</span>
                    <span className="detail-value">{selectedRequest.equipmentName}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Quantity Requested:</span>
                    <span className="detail-value">{selectedRequest.quantity} unit(s)</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Current Stock:</span>
                    <span className="detail-value">
                      {equipment.find(e => e.id === selectedRequest.equipmentId)?.quantity || 0} unit(s)
                    </span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Requester Information</h4>
                  <div className="detail-row">
                    <span className="detail-label">Name:</span>
                    <span className="detail-value">{selectedRequest.userName || selectedRequest.requester}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">User ID:</span>
                    <span className="detail-value">{selectedRequest.userId}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Role:</span>
                    <span className="detail-value">{selectedRequest.userRole}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Request ID:</span>
                    <span className="detail-value">{selectedRequest.id}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Date Submitted:</span>
                    <span className="detail-value">
                      {new Date(selectedRequest.requestDate || selectedRequest.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Usage Information</h4>
                  <div className="detail-row">
                    <span className="detail-label">Purpose:</span>
                    <span className="detail-value">{selectedRequest.purpose}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Duration:</span>
                    <span className="detail-value">{selectedRequest.duration}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Return Date:</span>
                    <span className="detail-value">{selectedRequest.returnDate}</span>
                  </div>
                  {selectedRequest.educationalPurpose && (
                    <div className="detail-row">
                      <span className="detail-label">Educational Purpose:</span>
                      <span className="detail-value">Yes</span>
                    </div>
                  )}
                </div>

                <div className="detail-section full-width">
                  <h4>Availability Check</h4>
                  {(() => {
                    const validation = validateRequest(selectedRequest);
                    return validation.valid ? (
                      <div className="availability-check success">
                        <span className="check-icon">✅</span>
                        <span>Request can be approved. Equipment is available.</span>
                      </div>
                    ) : (
                      <div className="availability-check error">
                        <span className="check-icon">❌</span>
                        <span>{validation.message}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={handleCloseRequestDetails}
              >
                Close
              </button>
              {selectedRequest.status === 'pending' && (
                <>
                  <button 
                    className="btn-approve"
                    onClick={() => handleApproveRequest(selectedRequest.id)}
                    disabled={!validateRequest(selectedRequest).valid}
                  >
                    ✓ Accept Request
                  </button>
                  <button 
                    className="btn-reject"
                    onClick={() => handleRejectRequest(selectedRequest.id)}
                  >
                    ✗ Reject Request
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rooms Tab */}
      {activeTab === 'rooms' && (
        <div className="admin-rooms">
          <h3>Room Management</h3>
          <div className="rooms-grid">
            {rooms.map(room => (
              <div key={room.id} className="room-card">
                <div className="room-card-header">
                  <strong>{room.name}</strong>
                  <span className={`status-badge ${room.available ? 'available' : 'occupied'}`}>
                    {room.available ? 'Available' : 'Occupied'}
                  </span>
                </div>
                <div className="room-card-body">
                  <div>ID: {room.id}</div>
                  <div>Type: {room.type}</div>
                  <div>Floor: {room.floor}</div>
                  <div>Capacity: {room.capacity}</div>
                </div>
                <div className="room-card-actions">
                  <button 
                    className="btn-toggle"
                    onClick={() => onToggleRoom(room.id)}
                  >
                    {room.available ? 'Mark Occupied' : 'Mark Available'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Equipment Tab */}
      {activeTab === 'equipment' && (
        <div className="admin-equipment">
          <div className="equipment-header-section">
            <h3>Equipment Status Management</h3>
            <p className="subtitle">Update equipment status, track borrowing activities, and maintain accountability</p>
          </div>

          {/* Status Messages */}
          {statusError && (
            <div className="error-banner">
              <span className="error-icon">⚠️</span>
              <span className="error-message">{statusError}</span>
              <button className="error-close" onClick={() => setStatusError('')}>×</button>
            </div>
          )}

          {statusSuccess && (
            <div className="success-banner">
              <span className="success-icon">✓</span>
              <span className="success-message">{statusSuccess}</span>
              <button className="success-close" onClick={() => setStatusSuccess('')}>×</button>
            </div>
          )}

          {/* Bulk Actions */}
          <div className="bulk-actions-panel">
            <div className="bulk-header">
              <h4>Bulk Status Update</h4>
              <span className="selected-count">{selectedItems.length} selected</span>
            </div>
            <div className="bulk-controls">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="form-select"
              >
                <option value="">Select status to apply</option>
                <option value="Available">Available</option>
                <option value="Unavailable">Unavailable</option>
                <option value="Under Maintenance">Under Maintenance</option>
              </select>
              <button 
                className="btn-bulk-update" 
                onClick={handleBulkStatusUpdate}
                disabled={selectedItems.length === 0}
              >
                Apply to Selected ({selectedItems.length})
              </button>
            </div>
          </div>

          {/* Equipment List with Status Management */}
          <div className="equipment-status-grid">
            {equipment.map(eq => {
              const pendingCount = requests.filter(
                r => r.equipmentId === eq.id && r.status === 'pending'
              ).length;
              const borrowingHistory = requests.filter(
                r => r.equipmentId === eq.id && r.status === 'approved'
              ).length;

              return (
                <div key={eq.id} className="equipment-status-card">
                  <div className="card-header-with-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(eq.id)}
                      onChange={() => toggleItemSelection(eq.id)}
                      className="equipment-checkbox"
                    />
                    <div className="equipment-card-header">
                      <strong>{eq.name}</strong>
                      <span className={`status-badge-large ${eq.available ? 'status-available' : 'status-unavailable'}`}>
                        {eq.available ? '✓ Available' : '✗ Unavailable'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="equipment-card-body">
                    <div className="detail-row">
                      <span className="detail-label">Current Status:</span>
                      <span className="detail-value">{eq.available ? 'Available' : 'Unavailable'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Category:</span>
                      <span className="detail-value">{eq.category}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Location:</span>
                      <span className="detail-value">{eq.location}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Available Quantity:</span>
                      <span className={`detail-value ${eq.quantity > 0 ? 'stock-available' : 'stock-low'}`}>
                        {eq.quantity} units
                      </span>
                    </div>
                    {pendingCount > 0 && (
                      <div className="detail-row">
                        <span className="detail-label">Pending Requests:</span>
                        <span className="detail-value warning-text">{pendingCount}</span>
                      </div>
                    )}
                    <div className="detail-row">
                      <span className="detail-label">Borrowing History:</span>
                      <span className="detail-value">{borrowingHistory} approved</span>
                    </div>
                  </div>

                  <div className="card-actions">
                    <button 
                      className="btn-update-status"
                      onClick={() => handleStatusUpdateClick(eq)}
                    >
                      Update Status
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Audit Log Section */}
          {auditLog.length > 0 && (
            <div className="audit-log-section">
              <h4>Recent Status Changes (Audit Trail)</h4>
              <div className="audit-log-list">
                {auditLog.slice(0, 10).map(log => (
                  <div key={log.id} className="audit-log-item">
                    <div className="audit-icon">📝</div>
                    <div className="audit-details">
                      <div className="audit-main">
                        <strong>{log.equipmentName}</strong>
                        <span className="status-change">
                          {log.oldStatus} → {log.newStatus}
                        </span>
                      </div>
                      <div className="audit-meta">
                        <span>Staff: {log.staffId}</span>
                        <span>•</span>
                        <span>{log.timestamp}</span>
                        <span>•</span>
                        <span>Reason: {log.reason}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusUpdateModal && selectedEquipment && (
        <div className="modal-overlay" onClick={cancelStatusUpdate}>
          <div className="modal-content status-update-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update Equipment Status</h3>
              <button className="modal-close" onClick={cancelStatusUpdate}>×</button>
            </div>
            
            <div className="modal-body">
              {confirmationMessage && (
                <div className="warning-banner">
                  <span className="warning-icon">⚠️</span>
                  <span>{confirmationMessage}</span>
                </div>
              )}

              {statusError && (
                <div className="form-error-banner">
                  <span className="error-icon">⚠️</span>
                  <span>{statusError}</span>
                </div>
              )}

              <div className="equipment-info-box">
                <h4>{selectedEquipment.name}</h4>
                <div className="info-grid">
                  <div>
                    <span className="info-label">Current Status:</span>
                    <span className={`info-value ${selectedEquipment.available ? 'text-success' : 'text-danger'}`}>
                      {selectedEquipment.available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  <div>
                    <span className="info-label">Location:</span>
                    <span className="info-value">{selectedEquipment.location}</span>
                  </div>
                  <div>
                    <span className="info-label">Quantity:</span>
                    <span className="info-value">{selectedEquipment.quantity} units</span>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="form-group">
                  <label htmlFor="newStatus">New Status: <span className="required">*</span></label>
                  <select
                    id="newStatus"
                    value={statusUpdateData.status}
                    onChange={(e) => {
                      const isAvailable = e.target.value === 'Available';
                      setStatusUpdateData({
                        ...statusUpdateData,
                        status: e.target.value,
                        available: isAvailable
                      });
                    }}
                    className="form-input"
                  >
                    <option value="Available">Available</option>
                    <option value="Unavailable">Unavailable</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                    <option value="In Use">In Use</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="quantity">Update Quantity:</label>
                  <input
                    id="quantity"
                    type="number"
                    min="0"
                    value={statusUpdateData.quantity}
                    onChange={(e) => setStatusUpdateData({
                      ...statusUpdateData,
                      quantity: parseInt(e.target.value) || 0
                    })}
                    className="form-input"
                  />
                  <span className="form-hint">Update if processing returns or restocking</span>
                </div>

                <div className="form-group">
                  <label htmlFor="reason">Reason for Status Change: <span className="required">*</span></label>
                  <textarea
                    id="reason"
                    value={statusUpdateData.reason}
                    onChange={(e) => setStatusUpdateData({
                      ...statusUpdateData,
                      reason: e.target.value
                    })}
                    className="form-input form-textarea"
                    placeholder="Describe the reason for this status update (e.g., 'Equipment returned', 'Maintenance required', 'Approved borrowing request')..."
                    rows="4"
                  />
                </div>
              </div>

              <div className="form-info">
                <span className="info-icon">ℹ️</span>
                <p>Status changes are logged with staff ID and timestamp for audit purposes. All users will see the updated status immediately.</p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={cancelStatusUpdate}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSubmitStatusUpdate}>
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="modal-overlay" onClick={() => setShowConfirmation(false)}>
          <div className="modal-content confirmation-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header confirmation-header">
              <div className="confirm-icon">⚠️</div>
              <h3>Confirm Status Update</h3>
            </div>
            
            <div className="modal-body">
              <p className="confirm-message">Are you sure you want to update the equipment status?</p>
              
              <div className="confirm-details">
                <div className="confirm-row">
                  <span>Equipment:</span>
                  <strong>{selectedEquipment?.name}</strong>
                </div>
                <div className="confirm-row">
                  <span>New Status:</span>
                  <strong>{statusUpdateData.status}</strong>
                </div>
                <div className="confirm-row">
                  <span>Quantity:</span>
                  <strong>{statusUpdateData.quantity} units</strong>
                </div>
                <div className="confirm-row">
                  <span>Reason:</span>
                  <strong>{statusUpdateData.reason}</strong>
                </div>
              </div>

              <div className="warning-note">
                <span className="note-icon">📌</span>
                <p>This change will be logged in the audit trail and cannot be undone. All users will immediately see the updated status.</p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowConfirmation(false)}>
                Cancel
              </button>
              <button className="btn-confirm" onClick={confirmStatusUpdate}>
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Update Confirmation */}
      {showBulkUpdate && (
        <div className="modal-overlay" onClick={() => setShowBulkUpdate(false)}>
          <div className="modal-content confirmation-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header confirmation-header">
              <div className="confirm-icon">📦</div>
              <h3>Confirm Bulk Status Update</h3>
            </div>
            
            <div className="modal-body">
              <p className="confirm-message">Apply status "{bulkStatus}" to {selectedItems.length} selected item(s)?</p>
              
              <div className="warning-note">
                <span className="note-icon">⚠️</span>
                <p>This will update all selected equipment items simultaneously. Changes will be logged in the audit trail.</p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowBulkUpdate(false)}>
                Cancel
              </button>
              <button className="btn-confirm" onClick={confirmBulkUpdate}>
                Confirm Bulk Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
