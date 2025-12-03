import React, { useState, useEffect } from 'react';

export default function Borrow({ equipment, currentUser, selectedRoom, onSubmitRequest, requests }) {
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [filter, setFilter] = useState('all'); // all, available, unavailable
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('list'); // list or status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [requestBlocked, setRequestBlocked] = useState(false);
  const [blockedReason, setBlockedReason] = useState('');
  
  // Request form fields
  const [purpose, setPurpose] = useState('');
  const [duration, setDuration] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [educationalPurpose, setEducationalPurpose] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);
  const [requestReferenceNumber, setRequestReferenceNumber] = useState(null);

  // Update timestamp periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000); // Update timestamp every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Check user permissions
  const checkPermissions = () => {
    if (!currentUser) {
      setError('You must be logged into CCIS Connect to browse equipment.');
      return false;
    }
    return true;
  };

  // Calculate equipment statistics
  const getEquipmentStats = () => {
    const totalEquipment = equipment.reduce((sum, eq) => sum + eq.quantity, 0);
    const availableEquipment = equipment
      .filter(eq => eq.available && eq.quantity > 0)
      .reduce((sum, eq) => sum + eq.quantity, 0);
    const borrowedEquipment = totalEquipment - availableEquipment;
    
    return {
      total: totalEquipment,
      available: availableEquipment,
      borrowed: borrowedEquipment,
      categories: [...new Set(equipment.map(eq => eq.category))].length,
      locations: [...new Set(equipment.map(eq => eq.location))].length
    };
  };

  const stats = getEquipmentStats();

  // Group equipment by location
  const groupByLocation = () => {
    const grouped = {};
    equipment.forEach(eq => {
      if (!grouped[eq.location]) {
        grouped[eq.location] = [];
      }
      grouped[eq.location].push(eq);
    });
    return grouped;
  };

  const equipmentByLocation = groupByLocation();

  // Check for unreturned equipment
  const checkUnreturnedEquipment = () => {
    const unreturned = requests.filter(
      r => (r.userName === currentUser.name || r.requester === currentUser.name) && 
      r.status === 'approved' && 
      r.status !== 'returned' &&
      !r.returned
    );
    return unreturned;
  };

  // Check for pending requests
  const checkPendingViolations = () => {
    const pending = requests.filter(
      r => (r.userName === currentUser.name || r.requester === currentUser.name) && 
      r.status === 'pending'
    );
    return pending;
  };

  const handleRequestClick = (eq) => {
    // Check permissions before allowing request
    if (!currentUser || !currentUser.canBorrow) {
      setError('Authorization error: You do not have permission to borrow equipment. Please log in as a student or faculty member.');
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
      return;
    }

    // Check equipment availability
    if (!eq.available || eq.quantity === 0) {
      setError('Equipment no longer available. The equipment status has changed. Please browse the equipment list again.');
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
      return;
    }

    // Evaluate constraints but still open the form with explanation
    const unreturnedEquipment = checkUnreturnedEquipment();
    const pending = checkPendingViolations();

    setSelectedEquipment(eq);
    setQuantity(1);
    setPurpose('');
    setDuration('');
    setReturnDate('');
    setEducationalPurpose('');
    setFormErrors({});
    setError(null);
    setShowRequestForm(true);

    if (unreturnedEquipment.length > 0) {
      setBlockedReason(`You have unreturned equipment: ${unreturnedEquipment.map(r => r.equipmentName).join(', ')}. Submit is disabled until items are returned.`);
      setRequestBlocked(true);
    } else if (pending.length > 0) {
      setBlockedReason('You already have pending request(s). Submit is disabled until they are approved or cancelled.');
      setRequestBlocked(true);
    } else {
      setBlockedReason('');
      setRequestBlocked(false);
    }
  };

  // Validate form inputs in real-time
  const validateForm = () => {
    const errors = {};

    if (!purpose.trim()) {
      errors.purpose = 'Purpose is required';
    }

    if (!duration.trim()) {
      errors.duration = 'Duration is required';
    }

    if (!returnDate) {
      errors.returnDate = 'Return date is required';
    } else {
      const selectedDate = new Date(returnDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        errors.returnDate = 'Return date cannot be in the past';
      }
    }

    if (currentUser.role === 'faculty' && !educationalPurpose.trim()) {
      errors.educationalPurpose = 'Educational purpose details are required for faculty requests';
    }

    if (quantity <= 0) {
      errors.quantity = 'Quantity must be greater than 0';
    }

    if (quantity > selectedEquipment?.quantity) {
      errors.quantity = `Only ${selectedEquipment.quantity} available`;
    }

    return errors;
  };

  const handleSubmitRequest = () => {
    if (!selectedEquipment) return;
    
    setLoading(true);
    setError(null);
    setFormErrors({});

    try {
      // Validate all required fields
      const errors = validateForm();
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        setError('Please complete all required fields correctly before submission.');
        setLoading(false);
        return;
      }

      // Re-check equipment availability before submission
      if (!selectedEquipment.available || selectedEquipment.quantity === 0) {
        setError('Equipment no longer available. Please browse the equipment list again.');
        setLoading(false);
        return;
      }

      // Check quantity availability
      if (quantity > selectedEquipment.quantity) {
        setError(`Only ${selectedEquipment.quantity} ${selectedEquipment.name}(s) available.`);
        setLoading(false);
        return;
      }

      // Submit request with additional data
      const result = onSubmitRequest(
        selectedEquipment.id,
        quantity,
        selectedRoom?.id || null,
        {
          purpose,
          duration,
          returnDate,
          educationalPurpose: currentUser.role === 'faculty' ? educationalPurpose : null,
          submittedAt: new Date().toISOString()
        }
      );

      if (result.success) {
        // Generate reference number
        const refNumber = `REQ${Date.now().toString().slice(-8)}`;
        setRequestReferenceNumber(refNumber);
        
        // Prepare confirmation data
        setConfirmationData({
          equipmentName: selectedEquipment.name,
          quantity,
          purpose,
          duration,
          returnDate,
          location: selectedEquipment.location,
          referenceNumber: refNumber,
          submittedAt: new Date().toLocaleString()
        });
        
        // Close form and show confirmation
        setShowRequestForm(false);
        setShowConfirmation(true);
        setSelectedEquipment(null);
        setQuantity(1);
        setPurpose('');
        setDuration('');
        setReturnDate('');
        setEducationalPurpose('');
        setError(null);
        setFormErrors({});
      } else {
        setError(result.message || 'Failed to submit request.');
      }
    } catch (err) {
      setError('System error occurred during submission. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel request
  const handleCancelRequest = () => {
    setShowRequestForm(false);
    setSelectedEquipment(null);
    setQuantity(1);
    setPurpose('');
    setDuration('');
    setReturnDate('');
    setEducationalPurpose('');
    setFormErrors({});
    setError(null);
    setRequestBlocked(false);
    setBlockedReason('');
  };

  const filteredEquipment = equipment.filter(eq => {
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'available' && eq.available && eq.quantity > 0) ||
      (filter === 'unavailable' && (!eq.available || eq.quantity === 0));
    
    const matchesSearch = 
      eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const userRequests = requests.filter(r => r.userName === currentUser.name || r.requester === currentUser.name);
  const pendingRequests = userRequests.filter(r => r.status === 'pending');

  return (
    <div className="borrow-view">
      {/* Error Messages */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
          <button className="error-close" onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Permission Error */}
      {!currentUser && (
        <div className="permission-error">
          <span className="error-icon">🔒</span>
          <div className="error-content">
            <strong>Authorization Required</strong>
            <p>You must be logged into CCIS Connect to browse and request equipment.</p>
          </div>
        </div>
      )}

      <div className="borrow-header">
        <h2>Equipment Monitoring & Borrowing System</h2>
        <p className="subtitle">Monitor equipment status, location, and submit borrowing requests</p>
        <div className="last-updated">
          Last updated: {lastUpdated.toLocaleTimeString()}
          <button className="btn-refresh" onClick={() => setLastUpdated(new Date())} title="Refresh">
            🔄
          </button>
        </div>
      </div>

      {/* Equipment Statistics Dashboard */}
      {equipment.length === 0 ? (
        <div className="no-equipment-message">
          <span className="no-equipment-icon">📦</span>
          <h3>No Equipment Available</h3>
          <p>The equipment catalog is currently empty. Please check back later.</p>
        </div>
      ) : (
        <>
      <div className="equipment-stats-dashboard">
        <div className="stat-card-eq total">
          <div className="stat-icon-eq">📦</div>
          <div className="stat-content-eq">
            <div className="stat-value-eq">{stats.total}</div>
            <div className="stat-label-eq">Total Items</div>
          </div>
        </div>
        <div className="stat-card-eq available">
          <div className="stat-icon-eq">✅</div>
          <div className="stat-content-eq">
            <div className="stat-value-eq">{stats.available}</div>
            <div className="stat-label-eq">Available</div>
          </div>
        </div>
        <div className="stat-card-eq borrowed">
          <div className="stat-icon-eq">📤</div>
          <div className="stat-content-eq">
            <div className="stat-value-eq">{stats.borrowed}</div>
            <div className="stat-label-eq">In Use</div>
          </div>
        </div>
        <div className="stat-card-eq locations">
          <div className="stat-icon-eq">📍</div>
          <div className="stat-content-eq">
            <div className="stat-value-eq">{stats.locations}</div>
            <div className="stat-label-eq">Locations</div>
          </div>
        </div>
        <div className="stat-card-eq categories">
          <div className="stat-icon-eq">🏷️</div>
          <div className="stat-content-eq">
            <div className="stat-value-eq">{stats.categories}</div>
            <div className="stat-label-eq">Categories</div>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="view-mode-toggle">
        <button 
          className={`view-mode-btn ${viewMode === 'status' ? 'active' : ''}`}
          onClick={() => setViewMode('status')}
        >
          📊 Status View
        </button>
        <button 
          className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setViewMode('list')}
        >
          📋 List View
        </button>
      </div>

      {/* Equipment Status View by Location */}
      {viewMode === 'status' && (
        <div className="equipment-status-view">
          <h3>Equipment Status by Location</h3>
          <p className="status-subtitle">Real-time availability of all equipment across borrowing facilities</p>
          
          <div className="location-grid">
            {Object.entries(equipmentByLocation).map(([location, items]) => {
              const locationAvailable = items.filter(eq => eq.available && eq.quantity > 0).length;
              const locationTotal = items.length;
              const totalItems = items.reduce((sum, eq) => sum + eq.quantity, 0);
              const availableItems = items.filter(eq => eq.available && eq.quantity > 0)
                .reduce((sum, eq) => sum + eq.quantity, 0);
              
              return (
                <div key={location} className="location-card">
                  <div className="location-header">
                    <h4>📍 {location}</h4>
                    <span className="location-badge">
                      {locationAvailable}/{locationTotal} types available
                    </span>
                  </div>
                  
                  <div className="location-stats">
                    <div className="location-stat">
                      <span className="stat-num">{availableItems}</span>
                      <span className="stat-desc">Available Items</span>
                    </div>
                    <div className="location-stat">
                      <span className="stat-num">{totalItems}</span>
                      <span className="stat-desc">Total Items</span>
                    </div>
                  </div>

                  <div className="location-equipment-list">
                    {items.map(eq => (
                      <div key={eq.id} className="equipment-status-item">
                        <div className="equipment-status-info">
                          <span className="equipment-status-name">{eq.name}</span>
                          <span className="equipment-status-category">{eq.category}</span>
                        </div>
                        <div className="equipment-status-availability">
                          <span className={`status-indicator ${eq.available && eq.quantity > 0 ? 'available' : 'unavailable'}`}>
                            {eq.available && eq.quantity > 0 ? '●' : '●'}
                          </span>
                          <span className="equipment-quantity">
                            {eq.quantity} {eq.quantity === 1 ? 'unit' : 'units'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* User's Request Status */}
      {viewMode === 'list' && currentUser.canBorrow && (
        <div className="user-requests-panel">
          <h3>My Requests</h3>
          {pendingRequests.length > 0 && (
            <div className="pending-alert">
              You have {pendingRequests.length} pending request(s) awaiting approval.
            </div>
          )}
          {userRequests.length > 0 ? (
            <div className="requests-list">
              {userRequests.slice(0, 5).map(req => (
                <div key={req.id} className={`request-item ${req.status}`}>
                  <div className="request-info">
                    <strong>{req.equipmentName}</strong> × {req.quantity}
                    {req.roomId && <span className="room-tag">Room: {req.roomId}</span>}
                  </div>
                  <div className={`request-status ${req.status}`}>
                    {req.status === 'pending' && '⏳ Pending'}
                    {req.status === 'approved' && '✓ Approved'}
                    {req.status === 'rejected' && '✗ Rejected'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-requests">No requests submitted yet.</p>
          )}
        </div>
      )}

      {/* Equipment List View */}
      {viewMode === 'list' && equipment.length > 0 && (
        <>
          {/* Search and Filter */}
          <div className="borrow-controls">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search equipment by name, location, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>×</button>
          )}
        </div>
        <div className="filter-buttons">
          <button 
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All Equipment
          </button>
          <button 
            className={filter === 'available' ? 'active' : ''}
            onClick={() => setFilter('available')}
          >
            Available Only
          </button>
          <button 
            className={filter === 'unavailable' ? 'active' : ''}
            onClick={() => setFilter('unavailable')}
          >
            Unavailable
          </button>
        </div>
      </div>

      {/* Equipment List */}
      <div className="equipment-list-container">
        {loading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Loading equipment data...</p>
          </div>
        )}

        <ul className="equipment-list">
          {filteredEquipment.length === 0 ? (
            <li className="no-equipment">
              <span className="no-results-icon">🔍</span>
              <strong>No equipment found</strong>
              <p>No equipment matches your search criteria. Try adjusting your filters or search terms.</p>
            </li>
          ) : (
            filteredEquipment.map(eq => (
              <li 
                key={eq.id} 
                className={`equipment-item ${eq.available && eq.quantity > 0 ? 'available' : 'unavailable'}`}
              >
                <div className="equipment-left">
                  <div className="equipment-header">
                    <strong className="equipment-name">{eq.name}</strong>
                    <span className="equipment-category">{eq.category}</span>
                  </div>
                  <div className="equipment-meta">
                    <span>📍 {eq.location}</span>
                    <span>•</span>
                    <span className={eq.quantity > 0 ? 'quantity-available' : 'quantity-unavailable'}>
                      {eq.quantity} available
                    </span>
                  </div>
                </div>
                <div className="equipment-right">
                  <div className={`availability-badge ${eq.available && eq.quantity > 0 ? 'available' : 'unavailable'}`}>
                    {eq.available && eq.quantity > 0 ? '✓ Available Now' : '✗ Currently Unavailable'}
                  </div>
                  {currentUser && currentUser.canBorrow && eq.available && eq.quantity > 0 && (
                    <button 
                      className="btn-request"
                      onClick={() => handleRequestClick(eq)}
                    >
                      Request
                    </button>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
        </>
      )}

      {/* Request Form Modal */}
      {showRequestForm && selectedEquipment && (
        <div className="modal-overlay" onClick={handleCancelRequest}>
          <div className="modal-content request-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request to Borrow Equipment</h3>
              <button className="modal-close" onClick={handleCancelRequest}>×</button>
            </div>
            <div className="modal-body">
              {error && (
                <div className="form-error-banner">
                  <span className="error-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {requestBlocked && (
                <div className="form-warning-banner">
                  <span className="warning-icon">⛔</span>
                  <span>{blockedReason}</span>
                </div>
              )}

              <div className="form-section">
                <h4>Equipment Details</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Equipment:</label>
                    <div className="form-value-highlight">{selectedEquipment.name}</div>
                  </div>
                  <div className="form-group">
                    <label>Category:</label>
                    <div className="form-value">{selectedEquipment.category}</div>
                  </div>
                  <div className="form-group">
                    <label>Location:</label>
                    <div className="form-value">{selectedEquipment.location}</div>
                  </div>
                  <div className="form-group">
                    <label>Available:</label>
                    <div className="form-value">{selectedEquipment.quantity} units</div>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4>Request Information</h4>
                
                <div className="form-group">
                  <label htmlFor="quantity">Quantity to Request: <span className="required">*</span></label>
                  <input
                    id="quantity"
                    type="number"
                    min="1"
                    max={selectedEquipment.quantity}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className={`form-input ${formErrors.quantity ? 'input-error' : ''}`}
                  />
                  {formErrors.quantity && <span className="error-text">{formErrors.quantity}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="purpose">Purpose of Borrowing: <span className="required">*</span></label>
                  <textarea
                    id="purpose"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className={`form-input form-textarea ${formErrors.purpose ? 'input-error' : ''}`}
                    placeholder="Describe the purpose of borrowing this equipment..."
                    rows="3"
                  />
                  {formErrors.purpose && <span className="error-text">{formErrors.purpose}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="duration">Duration Needed: <span className="required">*</span></label>
                  <input
                    id="duration"
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className={`form-input ${formErrors.duration ? 'input-error' : ''}`}
                    placeholder="e.g., 2 hours, 1 day, 1 week"
                  />
                  {formErrors.duration && <span className="error-text">{formErrors.duration}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="returnDate">Expected Return Date: <span className="required">*</span></label>
                  <input
                    id="returnDate"
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className={`form-input ${formErrors.returnDate ? 'input-error' : ''}`}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {formErrors.returnDate && <span className="error-text">{formErrors.returnDate}</span>}
                </div>

                {currentUser.role === 'faculty' && (
                  <div className="form-group">
                    <label htmlFor="educationalPurpose">Educational Purpose Details: <span className="required">*</span></label>
                    <textarea
                      id="educationalPurpose"
                      value={educationalPurpose}
                      onChange={(e) => setEducationalPurpose(e.target.value)}
                      className={`form-input form-textarea ${formErrors.educationalPurpose ? 'input-error' : ''}`}
                      placeholder="Describe how this equipment will be used for educational purposes..."
                      rows="3"
                    />
                    {formErrors.educationalPurpose && <span className="error-text">{formErrors.educationalPurpose}</span>}
                    <div className="form-hint">📘 Faculty requests may receive priority processing</div>
                  </div>
                )}

                {selectedRoom && (
                  <div className="form-group">
                    <label>For Room:</label>
                    <div className="form-value">{selectedRoom.name} ({selectedRoom.id})</div>
                  </div>
                )}
              </div>

              <div className="form-info">
                <span className="info-icon">ℹ️</span>
                <p><strong>Note:</strong> Your request will be reviewed by Administrative Staff. You will receive a confirmation notification once your request has been processed.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleCancelRequest} disabled={loading}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSubmitRequest} disabled={loading || requestBlocked}>
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && confirmationData && (
        <div className="modal-overlay" onClick={() => setShowConfirmation(false)}>
          <div className="modal-content confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header confirmation-header">
              <div className="success-icon-large">✓</div>
              <h3>Request Submitted Successfully</h3>
            </div>
            <div className="modal-body">
              <div className="confirmation-message">
                <p>Your equipment borrowing request has been submitted and is now pending approval from Administrative Staff.</p>
              </div>

              <div className="confirmation-details">
                <h4>Request Summary</h4>
                <div className="detail-row">
                  <span className="detail-label">Reference Number:</span>
                  <span className="detail-value reference-number">{confirmationData.referenceNumber}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Equipment:</span>
                  <span className="detail-value">{confirmationData.equipmentName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Quantity:</span>
                  <span className="detail-value">{confirmationData.quantity} unit(s)</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Purpose:</span>
                  <span className="detail-value">{confirmationData.purpose}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Duration:</span>
                  <span className="detail-value">{confirmationData.duration}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Return Date:</span>
                  <span className="detail-value">{new Date(confirmationData.returnDate).toLocaleDateString()}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Collection Location:</span>
                  <span className="detail-value">{confirmationData.location}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Submitted:</span>
                  <span className="detail-value">{confirmationData.submittedAt}</span>
                </div>
              </div>

              <div className="next-steps">
                <h4>Next Steps</h4>
                <ol>
                  <li>Administrative Staff will review your request</li>
                  <li>You will receive a notification once approved/rejected</li>
                  <li>If approved, collect equipment from {confirmationData.location}</li>
                  <li>Return equipment by {new Date(confirmationData.returnDate).toLocaleDateString()}</li>
                </ol>
              </div>

              <div className="confirmation-note">
                <span className="info-icon">💡</span>
                <p>Please save your reference number <strong>{confirmationData.referenceNumber}</strong> for tracking purposes.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setShowConfirmation(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

        </>
      )}

      {/* Info Panel */}
      <div className="borrow-info">
        <p>
          <strong>How it works:</strong> Browse available equipment, select items you need, and submit a request. 
          Your request will be reviewed by administrative staff. Once approved, you can collect the equipment from the specified location.
        </p>
        {!currentUser.canBorrow && (
          <p className="warning">
            <strong>Note:</strong> You need to log in as a student or faculty member to borrow equipment.
          </p>
        )}
      </div>
    </div>
  );
}
