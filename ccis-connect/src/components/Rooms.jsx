import React, { useState } from 'react';

export default function Rooms({ rooms, currentUser, onToggleRoom, onQRUpdate }) {
  const [qrScanning, setQrScanning] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [filter, setFilter] = useState('all'); // all, available, occupied
  const [scanError, setScanError] = useState('');
  const [scanSuccess, setScanSuccess] = useState('');
  const [selectedAction, setSelectedAction] = useState('entering'); // entering or leaving

  // Debug: Log currentUser to console
  console.log('Rooms - currentUser:', currentUser);
  console.log('Rooms - canUpdateRooms:', currentUser?.canUpdateRooms);

  // Simulate instructor schedule (in real app, this would come from backend)
  const getInstructorSchedule = () => {
    const currentHour = new Date().getHours();
    return {
      hasSchedule: true,
      scheduledRooms: ['CCIS-101', 'CCIS-102'], // Example scheduled rooms
      currentTimeSlot: currentHour >= 8 && currentHour < 17,
      scheduledHour: currentHour
    };
  };

  const handleQRScan = () => {
    setQrScanning(true);
    setScanError('');
    setScanSuccess('');
    
    // Simulate QR code scanning with camera
    setTimeout(() => {
      const randomRoom = rooms[Math.floor(Math.random() * rooms.length)];
      setQrCode(randomRoom.id);
      setQrScanning(false);
    }, 1500);
  };

  const handleQRSubmit = () => {
    if (!qrCode) {
      setScanError('Please scan a QR code first');
      return;
    }

    const room = rooms.find(r => r.id === qrCode);
    if (!room) {
      setScanError('Room not found. Please scan a valid QR code.');
      setQrCode('');
      return;
    }

    const schedule = getInstructorSchedule();
    
    // Validate if faculty member is scheduled for this room
    if (!schedule.scheduledRooms.includes(room.id)) {
      setScanError(`Cannot update current status. You are not scheduled for ${room.id} at this time.`);
      return;
    }

    // Check if it's within valid time slot
    if (!schedule.currentTimeSlot) {
      setScanError('Cannot update outside of class hours (8:00 AM - 5:00 PM).');
      return;
    }

    // Update room status based on action
    let newStatus;
    let message;
    
    if (selectedAction === 'entering') {
      newStatus = false; // Mark as occupied
      message = `Room ${room.id} marked as Occupied. Class started.`;
    } else {
      newStatus = true; // Mark as available
      message = `Room ${room.id} marked as Available. Class ended.`;
    }

    onQRUpdate(room.id, newStatus);
    setScanSuccess(message);
    setScanError('');
    setQrCode('');
    
    // Clear success message after 5 seconds
    setTimeout(() => setScanSuccess(''), 5000);

    // Schedule automatic de-allocation after 10 minutes if entering
    if (selectedAction === 'entering') {
      scheduleAutoDeallocation(room.id);
    }
  };

  const scheduleAutoDeallocation = (roomId) => {
    // Simulate auto de-allocation after 10 minutes
    setTimeout(() => {
      const room = rooms.find(r => r.id === roomId);
      if (room && !room.available) {
        onQRUpdate(roomId, true);
        console.log(`Auto de-allocated ${roomId} after 10 minutes`);
      }
    }, 600000); // 10 minutes in milliseconds
  };

  const filteredRooms = rooms.filter(room => {
    if (filter === 'available') return room.available;
    if (filter === 'occupied') return !room.available;
    return true;
  });

  const availableCount = rooms.filter(r => r.available).length;
  const occupiedCount = rooms.filter(r => !r.available).length;

  return (
    <div className="rooms-view">
      <div className="rooms-header">
        <h2>Room Availability Monitoring</h2>
        <p className="subtitle">View and manage classroom availability in real-time</p>
      </div>

      {/* Statistics */}
      <div className="rooms-stats">
        <div className="stat-card">
          <div className="stat-value">{rooms.length}</div>
          <div className="stat-label">Total Rooms</div>
        </div>
        <div className="stat-card available">
          <div className="stat-value">{availableCount}</div>
          <div className="stat-label">Available</div>
        </div>
        <div className="stat-card occupied">
          <div className="stat-value">{occupiedCount}</div>
          <div className="stat-label">Occupied</div>
        </div>
      </div>

      {/* QR Code Scanner (Faculty/Admin only) */}
      {currentUser && currentUser.canUpdateRooms && (
        <div className="qr-scanner-panel">
          <h3>📱 Update Room Status via QR Code</h3>
          <p className="qr-instructions">
            Scan the QR code in your assigned classroom when entering or leaving to update availability.
          </p>
          
          {/* Action Selection */}
          <div className="qr-action-selector">
            <label>
              <input 
                type="radio" 
                name="action" 
                value="entering" 
                checked={selectedAction === 'entering'}
                onChange={(e) => setSelectedAction(e.target.value)}
              />
              <span className="action-label">🚪 Entering Room (Mark as Occupied)</span>
            </label>
            <label>
              <input 
                type="radio" 
                name="action" 
                value="leaving" 
                checked={selectedAction === 'leaving'}
                onChange={(e) => setSelectedAction(e.target.value)}
              />
              <span className="action-label">👋 Leaving Room (Mark as Available)</span>
            </label>
          </div>

          {/* Error Message */}
          {scanError && (
            <div className="scan-error-message">
              <span className="error-icon">⚠️</span>
              <span>{scanError}</span>
            </div>
          )}

          {/* Success Message */}
          {scanSuccess && (
            <div className="scan-success-message">
              <span className="success-icon">✅</span>
              <span>{scanSuccess}</span>
            </div>
          )}

          <div className="qr-controls">
            <button 
              className={`btn-scan ${qrScanning ? 'scanning' : ''}`}
              onClick={handleQRScan}
              disabled={qrScanning}
            >
              {qrScanning ? (
                <>
                  <span className="spinner">⟳</span> Scanning QR Code...
                </>
              ) : (
                <>📷 Scan QR Code</>
              )}
            </button>
            
            {qrCode && (
              <div className="qr-result">
                <div className="qr-result-header">
                  <span className="qr-icon">🎯</span>
                  <div>
                    <p className="qr-room-label">Scanned Room:</p>
                    <p className="qr-room-id">{qrCode}</p>
                  </div>
                </div>
                <div className="qr-result-actions">
                  <button className="btn-update" onClick={handleQRSubmit}>
                    ✓ Update Room Status
                  </button>
                  <button className="btn-cancel" onClick={() => {
                    setQrCode('');
                    setScanError('');
                    setScanSuccess('');
                  }}>
                    ✗ Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="qr-help">
            <h4>💡 How it works:</h4>
            <ol>
              <li>Select whether you're entering or leaving the room</li>
              <li>Click "Scan QR Code" and point camera at the QR code in the room</li>
              <li>System validates your schedule for this room</li>
              <li>Room status updates automatically for all users</li>
              <li>Status auto-resets 10 minutes after scheduled class end time</li>
            </ol>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="rooms-filter">
        <button 
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All Rooms
        </button>
        <button 
          className={filter === 'available' ? 'active' : ''}
          onClick={() => setFilter('available')}
        >
          Available Only
        </button>
        <button 
          className={filter === 'occupied' ? 'active' : ''}
          onClick={() => setFilter('occupied')}
        >
          Occupied Only
        </button>
      </div>

      {/* Room List */}
      <div className="room-list-container">
        <ul className="room-list">
          {filteredRooms.length === 0 ? (
            <li className="no-rooms">No rooms match the current filter.</li>
          ) : (
            filteredRooms.map(room => (
              <li 
                key={room.id} 
                className={`room-item ${room.available ? 'available' : 'unavailable'}`}
              >
                <div className="room-left">
                  <div className="room-header">
                    <strong className="room-name">{room.name}</strong>
                    <span className="room-type">{room.type}</span>
                  </div>
                  <div className="room-meta">
                    <span>ID: {room.id}</span>
                    <span>•</span>
                    <span>Floor: {room.floor}</span>
                    <span>•</span>
                    <span>Capacity: {room.capacity}</span>
                  </div>
                </div>
                <div className="room-right">
                  <span className={`status-badge ${room.available ? 'available' : 'occupied'}`}>
                    {room.available ? '✓ Available' : '✗ Occupied'}
                  </span>
                  {currentUser.canUpdateRooms && (
                    <button 
                      className="btn-toggle"
                      onClick={() => onToggleRoom(room.id)}
                      title={`Mark as ${room.available ? 'Occupied' : 'Available'}`}
                    >
                      {room.available ? 'Mark Occupied' : 'Mark Available'}
                    </button>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Info Panel */}
      <div className="rooms-info">
        <p>
          <strong>Note:</strong> Room availability is updated in real-time. 
          {currentUser.canUpdateRooms 
            ? ' Faculty members can update room status by scanning QR codes placed in each classroom or using the toggle buttons.'
            : ' Only faculty and administrators can update room status.'}
        </p>
      </div>
    </div>
  );
}
