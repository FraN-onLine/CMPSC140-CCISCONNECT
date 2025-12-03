import React, { useState, useEffect } from 'react';
import NavBar from './components/NavBar';
import MapView from './components/MapView';
import Rooms from './components/Rooms';
import Borrow from './components/Borrow';
import Admin from './components/Admin';
import Login from './components/Login';
import { rooms as initialRooms, equipment as initialEquipment, sampleBorrowRequests } from './data';
import './styles/App.css';

function App() {
  const [view, setView] = useState('map');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [roomsData, setRoomsData] = useState(initialRooms);
  const [equipmentData, setEquipmentData] = useState(initialEquipment);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [borrowRequests, setBorrowRequests] = useState(sampleBorrowRequests);
  const [searchQuery, setSearchQuery] = useState('');

  // Load from localStorage on mount
  useEffect(() => {
    const savedRooms = localStorage.getItem('ccis_rooms');
    const savedEquipment = localStorage.getItem('ccis_equipment');
    const savedRequests = localStorage.getItem('ccis_requests');
    const savedUser = localStorage.getItem('ccis_current_user');
    
    if (savedRooms) setRoomsData(JSON.parse(savedRooms));
    if (savedEquipment) setEquipmentData(JSON.parse(savedEquipment));
    if (savedRequests) setBorrowRequests(JSON.parse(savedRequests));
    
    // Auto-login if user session exists
    if (savedUser) {
      const user = JSON.parse(savedUser);
      // Check if user has new permission properties, if not, force re-login
      if (user.canUpdateRooms === undefined || user.canBorrow === undefined) {
        console.log('Old user format detected, clearing session...');
        localStorage.removeItem('ccis_current_user');
        setIsLoggedIn(false);
        setCurrentUser(null);
      } else {
        setCurrentUser(user);
        setIsLoggedIn(true);
      }
    }
  }, []);

  // Save to localStorage when data changes
  useEffect(() => {
    localStorage.setItem('ccis_rooms', JSON.stringify(roomsData));
  }, [roomsData]);

  useEffect(() => {
    localStorage.setItem('ccis_equipment', JSON.stringify(equipmentData));
  }, [equipmentData]);

  useEffect(() => {
    localStorage.setItem('ccis_requests', JSON.stringify(borrowRequests));
  }, [borrowRequests]);

  // Room availability toggle (for faculty/admin)
  const toggleRoomAvailability = (roomId) => {
    setRoomsData(prev => 
      prev.map(room => 
        room.id === roomId ? { ...room, available: !room.available } : room
      )
    );
  };

  // Update room via QR code (simulated)
  const updateRoomViaQR = (roomId, isAvailable) => {
    setRoomsData(prev => 
      prev.map(room => 
        room.id === roomId ? { ...room, available: isAvailable } : room
      )
    );
  };

  // Submit borrow request
  const submitBorrowRequest = (equipmentId, quantity, roomId = null, additionalData = {}) => {
    const equipment = equipmentData.find(eq => eq.id === equipmentId);
    if (!equipment || equipment.quantity < quantity) {
      return { success: false, message: 'Insufficient equipment available' };
    }

    const request = {
      id: `REQ-${Date.now()}`,
      equipmentId,
      equipmentName: equipment.name,
      quantity,
      roomId,
      userId: currentUser?.idNumber || 'unknown',
      userName: currentUser?.name || 'Unknown',
      userRole: currentUser?.role || 'student',
      status: 'pending',
      requestDate: new Date().toISOString(),
      purpose: additionalData.purpose || '',
      duration: additionalData.duration || '',
      returnDate: additionalData.returnDate || '',
      educationalPurpose: additionalData.educationalPurpose || false,
      returned: false
    };

    setBorrowRequests(prev => [request, ...prev]);
    return { success: true, message: 'Request submitted successfully' };
  };

  // Approve borrow request (admin only)
  const approveRequest = (requestId) => {
    const request = borrowRequests.find(r => r.id === requestId);
    if (!request) return;

    const equipment = equipmentData.find(eq => eq.id === request.equipmentId);
    if (equipment && equipment.quantity >= request.quantity) {
      setEquipmentData(prev =>
        prev.map(eq =>
          eq.id === request.equipmentId
            ? { ...eq, quantity: eq.quantity - request.quantity }
            : eq
        )
      );

      setBorrowRequests(prev =>
        prev.map(r =>
          r.id === requestId
            ? { ...r, status: 'approved', approvedBy: currentUser?.name || 'Admin', approvedDate: new Date().toISOString() }
            : r
        )
      );
    }
  };

  // Reject borrow request (admin only)
  const rejectRequest = (requestId, reason = '') => {
    setBorrowRequests(prev =>
      prev.map(r =>
        r.id === requestId
          ? { ...r, status: 'rejected', rejectedBy: currentUser?.name || 'Admin', rejectedDate: new Date().toISOString(), rejectionReason: reason }
          : r
      )
    );
  };

  // Return equipment (admin only)
  const returnEquipment = (equipmentId, quantity) => {
    setEquipmentData(prev =>
      prev.map(eq =>
        eq.id === equipmentId
          ? { ...eq, quantity: eq.quantity + quantity }
          : eq
      )
    );
  };

  // Update equipment status (admin only)
  const updateEquipmentStatus = (updatePayload) => {
    setEquipmentData(prev =>
      prev.map(eq =>
        eq.id === updatePayload.equipmentId
          ? {
              ...eq,
              available: updatePayload.available,
              quantity: updatePayload.quantity,
              status: updatePayload.status,
              lastUpdated: updatePayload.timestamp,
              updatedBy: updatePayload.updatedBy
            }
          : eq
      )
    );

    // Save to localStorage for persistence
    const updatedEquipment = equipmentData.map(eq =>
      eq.id === updatePayload.equipmentId
        ? {
            ...eq,
            available: updatePayload.available,
            quantity: updatePayload.quantity,
            status: updatePayload.status,
            lastUpdated: updatePayload.timestamp,
            updatedBy: updatePayload.updatedBy
          }
        : eq
    );
    localStorage.setItem('equipmentData', JSON.stringify(updatedEquipment));
  };

  // Filter rooms based on search
  const filteredRooms = roomsData.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle login
  const handleLogin = (user) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    localStorage.setItem('ccis_current_user', JSON.stringify(user));
  };

  // Handle logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setView('map');
    localStorage.removeItem('ccis_current_user');
  };

  // Show login page if not logged in
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-root">
      <NavBar view={view} setView={setView} />
      
      {/* User Info Bar */}
      <div className="user-info-bar">
        <div className="user-badge">
          <span className="user-icon">{currentUser?.role === 'admin' ? '👨‍💼' : currentUser?.role === 'faculty' ? '👨‍🏫' : '👨‍🎓'}</span>
          <div className="user-details">
            <span className="user-name">{currentUser?.name}</span>
            <span className="user-role-badge">{currentUser?.role === 'admin' ? 'Administrator' : currentUser?.role === 'faculty' ? 'Faculty Member' : 'Student'}</span>
          </div>
        </div>
        <div className="user-id-display">
          <span className="id-label">ID:</span>
          <span className="id-value">{currentUser?.idNumber}</span>
        </div>
        <button onClick={handleLogout} className="logout-button">
          <span className="logout-icon">🚪</span> Logout
        </button>
      </div>

      {/* Search Bar (for map and rooms views) */}
      {(view === 'map' || view === 'rooms') && (
        <div className="search-bar">
          <input
            type="text"
            placeholder={view === 'map' ? "Search rooms, facilities, or equipment..." : "Search rooms by name or ID..."}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              // Auto-highlight on map when searching
              if (view === 'map' && e.target.value) {
                const foundRoom = roomsData.find(room => 
                  room.name.toLowerCase().includes(e.target.value.toLowerCase()) ||
                  room.id.toLowerCase().includes(e.target.value.toLowerCase())
                );
                if (foundRoom) {
                  setSelectedRoom(foundRoom);
                }
              }
            }}
            className="search-input"
          />
        </div>
      )}

      {/* Main Content */}
      <main className="main-content">
        {view === 'map' && (
          <MapView
            rooms={filteredRooms}
            selectedRoom={selectedRoom}
            setSelectedRoom={setSelectedRoom}
            currentUser={currentUser}
            onRoomClick={(room) => {
              setSelectedRoom(room);
            }}
          />
        )}

        {view === 'rooms' && (
          <Rooms
            rooms={filteredRooms}
            currentUser={currentUser}
            onToggleRoom={toggleRoomAvailability}
            onQRUpdate={updateRoomViaQR}
          />
        )}

        {view === 'borrow' && (
          <Borrow
            equipment={equipmentData}
            currentUser={currentUser}
            selectedRoom={selectedRoom}
            onSubmitRequest={submitBorrowRequest}
            requests={borrowRequests}
          />
        )}

        {view === 'admin' && (
          <Admin
            rooms={roomsData}
            equipment={equipmentData}
            requests={borrowRequests}
            currentUser={currentUser}
            onApproveRequest={approveRequest}
            onRejectRequest={rejectRequest}
            onReturnEquipment={returnEquipment}
            onToggleRoom={toggleRoomAvailability}
            onUpdateEquipmentStatus={updateEquipmentStatus}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>CCIS CONNECT - Campus Digital Mapping, Room and Equipment Availability Management System</p>
        <p className="footer-subtitle">Mariano Marcos State University - College of Computing and Information Sciences</p>
      </footer>
    </div>
  );
}

export default App;
