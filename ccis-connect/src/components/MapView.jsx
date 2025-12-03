import React, { useState } from 'react';
import { pointsOfInterest } from '../data';

function Marker({ x, y, label, available, type, onClick, isSelected, isHighlighted }) {
  const markerClass = `marker ${available ? 'ok' : 'busy'} ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`;
  const typeIcon = type === 'Office' ? '🏢' : type === 'Laboratory' ? '🔬' : type === 'Lecture Hall' ? '📚' : '🏫';
  
  return (
    <div 
      className={markerClass} 
      style={{ left: `${x}%`, top: `${y}%` }} 
      title={`${label} - ${available ? 'Available' : 'Occupied'}`}
      onClick={onClick}
    >
      <span className="marker-icon">{typeIcon}</span>
      <span className="marker-label">{label}</span>
    </div>
  );
}

function POIMarker({ x, y, label, type }) {
  const poiIcon = type === 'Office' ? '🏛️' : type === 'Library' ? '📖' : type === 'Laboratory' ? '⚗️' : '🍽️';
  
  return (
    <div 
      className="marker poi" 
      style={{ left: `${x}%`, top: `${y}%` }} 
      title={label}
    >
      <span className="marker-icon">{poiIcon}</span>
      <span className="marker-label">{label}</span>
    </div>
  );
}

export default function MapView({ rooms, selectedRoom, setSelectedRoom, currentUser, onRoomClick }) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const MIN_ZOOM = 0.75;
  const MAX_ZOOM = 1.75;
  const ZOOM_STEP = 0.25;
  const [highlightedRoom, setHighlightedRoom] = useState(null);
  const [showPath, setShowPath] = useState(false);
  const [pathDestination, setPathDestination] = useState(null);
  const [mapError, setMapError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showDetailedStatus, setShowDetailedStatus] = useState(false);

  // Monitor online status
  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setMapError(null);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setMapError('Unable to load map. Please check your internet connection.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRoomClick = (room) => {
    setSelectedRoom(room);
    setHighlightedRoom(null);
    setShowDetailedStatus(true); // Show detailed status when room is clicked
    if (onRoomClick) onRoomClick(room);
  };

  const handleReturnToMap = () => {
    setShowDetailedStatus(false);
    setSelectedRoom(null);
    setShowPath(false);
    setPathDestination(null);
  };

  // Generate schedule data for the selected room
  const generateSchedule = (room) => {
    if (!room) return [];
    
    const today = new Date();
    const currentHour = today.getHours();
    
    // Sample schedule data
    const schedule = [
      { time: '08:00 - 09:00', subject: 'Available', status: 'free', professor: '-' },
      { time: '09:00 - 10:00', subject: 'CS 101 - Introduction to Programming', status: 'occupied', professor: 'Prof. Maria Santos' },
      { time: '10:00 - 11:00', subject: 'CS 102 - Data Structures', status: 'occupied', professor: 'Prof. Juan Dela Cruz' },
      { time: '11:00 - 12:00', subject: 'Available', status: 'free', professor: '-' },
      { time: '12:00 - 13:00', subject: 'Lunch Break', status: 'break', professor: '-' },
      { time: '13:00 - 14:00', subject: 'CS 201 - Algorithms', status: 'occupied', professor: 'Prof. Ana Reyes' },
      { time: '14:00 - 15:00', subject: 'Available', status: 'free', professor: '-' },
      { time: '15:00 - 16:00', subject: 'CS 301 - Software Engineering', status: 'occupied', professor: 'Prof. Pedro Garcia' },
      { time: '16:00 - 17:00', subject: 'Available', status: 'free', professor: '-' },
      { time: '17:00 - 18:00', subject: 'Available', status: 'free', professor: '-' }
    ];

    return schedule;
  };

  const handleSearch = (searchTerm) => {
    if (!searchTerm) {
      setHighlightedRoom(null);
      setMapError(null);
      return;
    }

    const foundRoom = rooms.find(room => 
      room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (foundRoom) {
      setHighlightedRoom(foundRoom);
      setSelectedRoom(foundRoom);
      setMapError(null);
    } else {
      setHighlightedRoom(null);
      setMapError(`No results found. Please check your input.`);
    }
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  // Smooth wheel-based zoom with clamping and debouncing
  const wheelTimeoutRef = React.useRef(null);
  const handleWheel = (e) => {
    // Prevent scroll jump when hovering map
    e.preventDefault();
    if (wheelTimeoutRef.current) return;
    wheelTimeoutRef.current = setTimeout(() => {
      wheelTimeoutRef.current = null;
    }, 75);

    const delta = Math.sign(e.deltaY);
    setZoomLevel(prev => {
      const next = prev - delta * ZOOM_STEP;
      return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));
    });
  };

  const handleShowPath = (destination) => {
    if (!destination) {
      setShowPath(false);
      setPathDestination(null);
      return;
    }
    setShowPath(true);
    setPathDestination(destination);
  };

  const calculatePath = () => {
    if (!pathDestination) return null;
    
    // Simple path calculation - in real app, this would use pathfinding algorithm
    return {
      start: { x: 10, y: 90 }, // Example entrance point
      end: { x: pathDestination.x, y: pathDestination.y },
      waypoints: [
        { x: 10, y: 90 },
        { x: pathDestination.x / 2, y: 90 },
        { x: pathDestination.x / 2, y: pathDestination.y },
        { x: pathDestination.x, y: pathDestination.y }
      ]
    };
  };

  const path = showPath ? calculatePath() : null;

  return (
    <div className="map-view-container">
      {/* Detailed Room Status View */}
      {showDetailedStatus && selectedRoom ? (
        <div className="room-status-detail-view">
          <div className="status-header">
            <div>
              <h2>{selectedRoom.name}</h2>
              <p className="status-subtitle">Room Status and Schedule</p>
            </div>
            <button className="btn-return" onClick={handleReturnToMap}>
              ← Return to Map View
            </button>
          </div>

          <div className="status-content">
            {/* Room Information Card */}
            <div className="status-card">
              <h3>Room Information</h3>
              <div className="status-grid">
                <div className="status-item">
                  <span className="status-label">Room ID:</span>
                  <span className="status-value">{selectedRoom.id}</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Type:</span>
                  <span className="status-value">{selectedRoom.type}</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Capacity:</span>
                  <span className="status-value">{selectedRoom.capacity} people</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Floor:</span>
                  <span className="status-value">{selectedRoom.floor}</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Building:</span>
                  <span className="status-value">CCIS Main Building</span>
                </div>
                <div className="status-item full-width">
                  <span className="status-label">Current Status:</span>
                  <span className={`status-badge-large ${selectedRoom.available ? 'available' : 'occupied'}`}>
                    {selectedRoom.available ? '✅ Available' : '🔴 Occupied'}
                  </span>
                </div>
              </div>
            </div>

            {/* Today's Schedule Card */}
            <div className="status-card schedule-card">
              <h3>Today's Schedule</h3>
              <p className="schedule-date">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              
              <div className="schedule-table">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Subject/Activity</th>
                      <th>Professor</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generateSchedule(selectedRoom).map((slot, index) => {
                      const currentTime = new Date().getHours();
                      const slotHour = parseInt(slot.time.split(':')[0]);
                      const isCurrentSlot = currentTime >= slotHour && currentTime < slotHour + 1;
                      
                      return (
                        <tr key={index} className={isCurrentSlot ? 'current-time-slot' : ''}>
                          <td className="time-cell">
                            {slot.time}
                            {isCurrentSlot && <span className="current-indicator">● Now</span>}
                          </td>
                          <td>{slot.subject}</td>
                          <td>{slot.professor}</td>
                          <td>
                            <span className={`schedule-status-badge ${slot.status}`}>
                              {slot.status === 'free' ? 'Available' : 
                               slot.status === 'occupied' ? 'Occupied' : 'Break'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="status-stats">
              <div className="stat-box available-stat">
                <div className="stat-icon">✅</div>
                <div className="stat-info">
                  <div className="stat-number">
                    {generateSchedule(selectedRoom).filter(s => s.status === 'free').length}
                  </div>
                  <div className="stat-text">Available Slots</div>
                </div>
              </div>
              <div className="stat-box occupied-stat">
                <div className="stat-icon">🔴</div>
                <div className="stat-info">
                  <div className="stat-number">
                    {generateSchedule(selectedRoom).filter(s => s.status === 'occupied').length}
                  </div>
                  <div className="stat-text">Occupied Slots</div>
                </div>
              </div>
              <div className="stat-box capacity-stat">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <div className="stat-number">{selectedRoom.capacity}</div>
                  <div className="stat-text">Capacity</div>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="status-card">
              <h3>Facilities & Equipment</h3>
              <div className="facilities-list">
                <div className="facility-item">
                  <span className="facility-icon">💻</span>
                  <span>Computer Workstations</span>
                </div>
                <div className="facility-item">
                  <span className="facility-icon">📽️</span>
                  <span>Projector & Screen</span>
                </div>
                <div className="facility-item">
                  <span className="facility-icon">🌐</span>
                  <span>WiFi Available</span>
                </div>
                <div className="facility-item">
                  <span className="facility-icon">❄️</span>
                  <span>Air Conditioning</span>
                </div>
                <div className="facility-item">
                  <span className="facility-icon">🔊</span>
                  <span>Sound System</span>
                </div>
                <div className="facility-item">
                  <span className="facility-icon">📚</span>
                  <span>Whiteboard</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Normal Map View */}
          <div className="map-header">
            <h2>Interactive Campus Map</h2>
            <p className="subtitle">Click on any room to view details and check availability</p>
          </div>

      {/* Error Message Display */}
      {mapError && (
        <div className="map-error-banner">
          <span className="error-icon">⚠️</span>
          <span>{mapError}</span>
        </div>
      )}

      {!isOnline && (
        <div className="map-error-banner offline">
          <span className="error-icon">📡</span>
          <span>You are offline. Map functionality may be limited.</span>
        </div>
      )}

      {/* Map Controls */}
      <div className="map-controls">
        <div className="zoom-controls">
          <button 
            className="zoom-btn" 
            onClick={handleZoomIn}
            disabled={zoomLevel >= 2}
            title="Zoom In"
          >
            🔍+
          </button>
          <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
          <button 
            className="zoom-btn" 
            onClick={handleZoomOut}
            disabled={zoomLevel <= 0.5}
            title="Zoom Out"
          >
            🔍-
          </button>
          <button 
            className="zoom-btn reset" 
            onClick={handleResetZoom}
            title="Reset Zoom"
          >
            ⟲
          </button>
        </div>

        {selectedRoom && (
          <div className="path-controls">
            <button 
              className={`path-btn ${showPath ? 'active' : ''}`}
              onClick={() => handleShowPath(showPath ? null : selectedRoom)}
            >
              {showPath ? '✖ Hide' : '🗺️ Show'} Path Navigation
            </button>
          </div>
        )}
      </div>

      <div className="map-container">
        <div className="map-canvas" onWheel={handleWheel}>
          <div 
            className="map-content"
            style={{ 
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center',
              willChange: 'transform'
            }}
          >
            {/* Navigation Path */}
            {showPath && path && (
              <svg className="navigation-path" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                    <polygon points="0 0, 10 3, 0 6" fill="#2563eb" />
                  </marker>
                </defs>
                <polyline
                  points={path.waypoints.map(p => `${p.x}%,${p.y}%`).join(' ')}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3"
                  strokeDasharray="5,5"
                  markerEnd="url(#arrowhead)"
                />
                {/* Starting point marker */}
                <circle cx={`${path.start.x}%`} cy={`${path.start.y}%`} r="8" fill="#22c55e" stroke="white" strokeWidth="2" />
                <text x={`${path.start.x}%`} y={`${path.start.y - 2}%`} fontSize="12" fill="#22c55e" fontWeight="bold" textAnchor="middle">
                  Start
                </text>
              </svg>
            )}

            {/* Render rooms */}
            {rooms.map(room => (
              <Marker
                key={room.id}
                x={room.x}
                y={room.y}
                label={room.name}
                available={room.available}
                type={room.type}
                onClick={() => handleRoomClick(room)}
                isSelected={selectedRoom?.id === room.id}
                isHighlighted={highlightedRoom?.id === room.id}
              />
            ))}

            {/* Render points of interest */}
            {pointsOfInterest.map(poi => (
              <POIMarker
                key={poi.id}
                x={poi.x}
                y={poi.y}
                label={poi.name}
                type={poi.type}
              />
            ))}
          </div>
        </div>

        <div className="map-sidebar">
          <div className="legend">
            <h3>Legend</h3>
            <div className="legend-item">
              <span className="dot ok"></span>
              <span>Available Room</span>
            </div>
            <div className="legend-item">
              <span className="dot busy"></span>
              <span>Occupied Room</span>
            </div>
            <div className="legend-item">
              <span className="dot poi"></span>
              <span>Point of Interest</span>
            </div>
          </div>

          {selectedRoom && (
            <div className="room-details">
              <h3>Room Details</h3>
              <div className="detail-item">
                <strong>Name:</strong> {selectedRoom.name}
              </div>
              <div className="detail-item">
                <strong>ID:</strong> {selectedRoom.id}
              </div>
              <div className="detail-item">
                <strong>Type:</strong> {selectedRoom.type}
              </div>
              <div className="detail-item">
                <strong>Capacity:</strong> {selectedRoom.capacity} people
              </div>
              <div className="detail-item">
                <strong>Floor:</strong> {selectedRoom.floor}
              </div>
              <div className="detail-item">
                <strong>Status:</strong>{' '}
                <span className={`status-badge ${selectedRoom.available ? 'available' : 'occupied'}`}>
                  {selectedRoom.available ? 'Available' : 'Occupied'}
                </span>
              </div>
              
              {/* Real-time schedule display */}
              <div className="room-schedule">
                <h4>Today's Schedule</h4>
                <div className="schedule-info">
                  {selectedRoom.available ? (
                    <p className="schedule-available">✅ Available now</p>
                  ) : (
                    <p className="schedule-occupied">🔴 Occupied - Next available: 3:00 PM</p>
                  )}
                </div>
              </div>

              {currentUser.canBorrow && (
                <button 
                  className="btn-primary"
                  onClick={() => {
                    alert('Navigate to the "Borrow" tab to request equipment for this room.');
                  }}
                >
                  Request Equipment for this Room
                </button>
              )}
            </div>
          )}

          {!selectedRoom && (
            <div className="room-details placeholder">
              <p>Select a room on the map to view details</p>
            </div>
          )}
        </div>
      </div>

      <div className="map-info">
        <p>
          <strong>Navigation Tips:</strong> Use the zoom controls to explore the map in detail. 
          Search for specific rooms using the search bar above. Click on any room marker to see 
          detailed information including capacity, floor, current availability status, and real-time schedules. 
          Enable path navigation to see the route to reach your selected location with floorplan guidance.
        </p>
        {showPath && (
          <p className="path-info">
            <strong>🗺️ Path Navigation Active:</strong> Follow the blue dashed line from the entrance (green marker) to reach {selectedRoom?.name}.
          </p>
        )}
      </div>
        </>
      )}
    </div>
  );
}
