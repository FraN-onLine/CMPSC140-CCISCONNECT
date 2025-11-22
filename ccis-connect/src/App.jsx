import React, { useEffect, useState } from "react";

/**
 * Full CCIS CONNECT prototype (single-file App.jsx)
 *
 * Features:
 * - Interactive map (rooms 100A-100F) — click to view room info (separate panel)
 * - Separate request form (only browses inventory + submits request for selected room)
 * - Inventory: 12 Laptops, 3 TVs
 * - Requests: pending -> admin approve/reject
 * - Approve decreases inventory and assigns items to room
 * - Admin return increases inventory and removes items from room
 * - Admin can move items between rooms
 * - Validation messages shown inline for request form and admin actions
 * - All in-memory (no backend). Easy to extend to localStorage or API.
 */

const ROOM_IDS = ["100A", "100B", "100C", "100D", "100E", "100F"];

export default function App() {
  // State
  const [rooms, setRooms] = useState(
    ROOM_IDS.map((id) => ({ id, items: { Laptop: 0, TV: 0 } }))
  );

  const [inventory, setInventory] = useState({ Laptop: 12, TV: 3 });
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [role, setRole] = useState("guest"); // guest | staff | admin

  const [requests, setRequests] = useState([]);
  const [requestForm, setRequestForm] = useState({ itemType: "Laptop", qty: 1 });
  const [requestError, setRequestError] = useState("");

  // Admin move/return inputs
  const [moveForm, setMoveForm] = useState({ from: ROOM_IDS[0], to: ROOM_IDS[1], itemType: "Laptop", qty: 1 });
  const [returnForm, setReturnForm] = useState({ roomId: ROOM_IDS[0], itemType: "Laptop", qty: 1 });

  // Helper: find room
  const getRoom = (id) => rooms.find((r) => r.id === id) || { id, items: { Laptop: 0, TV: 0 } };

  // Persist to localStorage (optional) — uncomment if you want persistence between reloads
  // useEffect(() => {
  //   const saved = localStorage.getItem("ccis_state");
  //   if (saved) {
  //     const parsed = JSON.parse(saved);
  //     setRooms(parsed.rooms || rooms);
  //     setInventory(parsed.inventory || inventory);
  //     setRequests(parsed.requests || []);
  //   }
  // }, []);
  // useEffect(() => {
  //   localStorage.setItem("ccis_state", JSON.stringify({ rooms, inventory, requests }));
  // }, [rooms, inventory, requests]);

  // -------- Request flow (rooms request items) --------
  function validateRequest(selectedRoomId, itemType, qty) {
    if (!selectedRoomId) return "Select a room from the map first.";
    if (!itemType) return "Select an item.";
    const n = Number(qty);
    if (!Number.isInteger(n) || n <= 0) return "Quantity must be a positive integer.";
    if (n > inventory[itemType]) return `Requested quantity (${n}) exceeds available ${itemType} (${inventory[itemType]}).`;
    return "";
  }

  function submitRequest() {
    const err = validateRequest(selectedRoomId, requestForm.itemType, requestForm.qty);
    setRequestError(err);
    if (err) return;

    const id = `REQ-${Date.now()}`;
    const newReq = {
      id,
      roomId: selectedRoomId,
      itemType: requestForm.itemType,
      qty: Number(requestForm.qty),
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    setRequests((r) => [newReq, ...r]);
    // Clear form error and keep form values default
    setRequestError("");
    setRequestForm((f) => ({ ...f, qty: 1 }));
  }

  // -------- Admin actions (approve/reject/return/move) --------
  function approveRequest(reqId) {
    const req = requests.find((r) => r.id === reqId);
    if (!req) return alert("Request not found.");
    // Re-check inventory before approving
    if (req.qty > (inventory[req.itemType] || 0)) {
      return alert(`Not enough ${req.itemType} in inventory to approve this request.`);
    }

    // 1) reduce inventory
    setInventory((inv) => ({ ...inv, [req.itemType]: inv[req.itemType] - req.qty }));

    // 2) add to room
    setRooms((rs) =>
      rs.map((room) =>
        room.id === req.roomId
          ? { ...room, items: { ...room.items, [req.itemType]: (room.items[req.itemType] || 0) + req.qty } }
          : room
      )
    );

    // 3) update request status
    setRequests((rs) => rs.map((r) => (r.id === reqId ? { ...r, status: "approved", actedAt: new Date().toISOString() } : r)));
  }

  function rejectRequest(reqId) {
    setRequests((rs) => rs.map((r) => (r.id === reqId ? { ...r, status: "rejected", actedAt: new Date().toISOString() } : r)));
  }

  // Admin marks return: remove from room (up to available) and increase inventory
  function adminReturn(roomId, itemType, qty) {
    const n = Number(qty);
    if (!roomId) return alert("Choose a room.");
    if (!itemType) return alert("Choose an item.");
    if (!Number.isInteger(n) || n <= 0) return alert("Return qty must be a positive integer.");

    const room = getRoom(roomId);
    const availableInRoom = room.items[itemType] || 0;
    if (availableInRoom <= 0) return alert(`${roomId} has no ${itemType} to return.`);
    const toReturn = Math.min(availableInRoom, n);

    // remove from room
    setRooms((rs) => rs.map((r) => (r.id === roomId ? { ...r, items: { ...r.items, [itemType]: (r.items[itemType] || 0) - toReturn } } : r)));

    // increase inventory
    setInventory((inv) => ({ ...inv, [itemType]: (inv[itemType] || 0) + toReturn }));

    return toReturn;
  }

  // Admin moves items between rooms
  function moveItems(fromRoomId, toRoomId, itemType, qty) {
    const n = Number(qty);
    if (!fromRoomId || !toRoomId) return alert("Choose both From and To rooms.");
    if (fromRoomId === toRoomId) return alert("From and To cannot be the same room.");
    if (!itemType) return alert("Choose item type.");
    if (!Number.isInteger(n) || n <= 0) return alert("Move qty must be a positive integer.");

    const fromRoom = getRoom(fromRoomId);
    const available = fromRoom.items[itemType] || 0;
    if (available <= 0) return alert(`${fromRoomId} has no ${itemType} to move.`);
    const toMove = Math.min(available, n);

    setRooms((rs) =>
      rs.map((r) => {
        if (r.id === fromRoomId) return { ...r, items: { ...r.items, [itemType]: (r.items[itemType] || 0) - toMove } };
        if (r.id === toRoomId) return { ...r, items: { ...r.items, [itemType]: (r.items[itemType] || 0) + toMove } };
        return r;
      })
    );
    return toMove;
  }

  // UI helpers: grouped requests
  const pendingRequests = requests.filter((r) => r.status === "pending");
  const recentRequests = requests.slice(0, 10);

  // Small UX: when role toggles to admin, prefill admin forms
  useEffect(() => {
    setMoveForm((m) => ({ ...m, from: ROOM_IDS[0], to: ROOM_IDS[1], itemType: "Laptop", qty: 1 }));
    setReturnForm((r) => ({ ...r, roomId: ROOM_IDS[0], itemType: "Laptop", qty: 1 }));
  }, [role]);

  // ---------------------- Render ----------------------
  return (
    <div style={{ padding: 20, fontFamily: "Inter, Arial, sans-serif", maxWidth: 1100, margin: "0 auto" }}>
      <h1>CCIS CONNECT — Prototype</h1>
      <p style={{ marginTop: 6 }}>
        Role: <strong>{role}</strong>
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setRole("guest")}>Guest</button>
        <button onClick={() => setRole("staff")}>Staff</button>
        <button onClick={() => setRole("admin")}>Admin</button>
      </div>

      <hr />

      <div style={{ display: "flex", gap: 20, marginTop: 18 }}>
        {/* Left: Map (interactive) */}
        <div style={{ flex: 1 }}>
          <h2>Campus Map (interactive)</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
              border: "1px solid #ddd",
              padding: 12,
              borderRadius: 8,
            }}
          >
            {rooms.map((room) => {
              const selected = selectedRoomId === room.id;
              return (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  style={{
                    border: `2px solid ${selected ? "#2563eb" : "#ccc"}`,
                    padding: 12,
                    borderRadius: 6,
                    cursor: "pointer",
                    background: selected ? "#eff6ff" : "#fff",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{room.id}</div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>
                    Laptops: <strong>{room.items.Laptop}</strong>
                    <br />
                    TVs: <strong>{room.items.TV}</strong>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
                    Click to view details & request items.
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 14 }}>
            <h4>Map notes</h4>
            <div style={{ fontSize: 13, color: "#555" }}>
              Rooms are interactable. Selecting a room opens the Room Info + Request form on the right. Rooms cannot directly take items — they must submit a request.
            </div>
          </div>
        </div>

        {/* Right column: Room info + Request panel + Inventory + Admin panels */}
        <div style={{ width: 420 }}>
          {/* ROOM INFO + REQUEST PANEL */}
          <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8, marginBottom: 12 }}>
            <h3>Room Info</h3>
            {!selectedRoomId ? (
              <div style={{ color: "#444" }}>Select a room on the map to see details here.</div>
            ) : (
              <RoomPanel
                room={getRoom(selectedRoomId)}
                inventory={inventory}
                requestForm={requestForm}
                setRequestForm={setRequestForm}
                submitRequest={submitRequest}
                requestError={requestError}
                role={role}
              />
            )}
          </div>

          {/* INVENTORY SUMMARY */}
          <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8, marginBottom: 12 }}>
            <h3>Inventory</h3>
            <div style={{ fontSize: 14 }}>
              Laptops: <strong>{inventory.Laptop}</strong>
              <br />
              TVs: <strong>{inventory.TV}</strong>
            </div>
          </div>

          {/* REQUEST LIST (small) */}
          <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8, marginBottom: 12 }}>
            <h3>Requests</h3>
            {recentRequests.length === 0 && <div style={{ color: "#666" }}>No requests yet.</div>}
            {recentRequests.map((r) => (
              <div key={r.id} style={{ marginTop: 8, borderTop: "1px solid #eee", paddingTop: 8 }}>
                <div style={{ fontWeight: 700 }}>
                  {r.roomId} — {r.qty} × {r.itemType}
                </div>
                <div style={{ fontSize: 13, color: "#444" }}>Status: {r.status}</div>
                {role === "admin" && r.status === "pending" && (
                  <div style={{ marginTop: 8 }}>
                    <button onClick={() => approveRequest(r.id)}>Approve</button>{" "}
                    <button onClick={() => rejectRequest(r.id)}>Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ADMIN: Returns and Move */}
          {role === "admin" && (
            <>
              <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <h3>Admin — Mark Return</h3>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <select value={returnForm.roomId} onChange={(e) => setReturnForm((f) => ({ ...f, roomId: e.target.value }))}>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.id}
                      </option>
                    ))}
                  </select>
                  <select value={returnForm.itemType} onChange={(e) => setReturnForm((f) => ({ ...f, itemType: e.target.value }))}>
                    <option value="Laptop">Laptop</option>
                    <option value="TV">TV</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={returnForm.qty}
                    style={{ width: 68 }}
                    onChange={(e) => setReturnForm((f) => ({ ...f, qty: Number(e.target.value) }))}
                  />
                  <button
                    onClick={() => {
                      try {
                        const returned = adminReturn(returnForm.roomId, returnForm.itemType, returnForm.qty);
                        if (returned) alert(`Marked ${returned} ${returnForm.itemType}(s) as returned from ${returnForm.roomId}.`);
                      } catch (err) {
                        alert("Return failed: " + err.message);
                      }
                    }}
                  >
                    Mark Return
                  </button>
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>Return increases inventory and removes items from the room.</div>
              </div>

              <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <h3>Admin — Move Items Between Rooms</h3>
                <MovePanel rooms={rooms} moveForm={moveForm} setMoveForm={setMoveForm} onMove={moveItems} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer: pending requests summary */}
      <div style={{ marginTop: 18, borderTop: "1px dashed #eee", paddingTop: 12 }}>
        <strong>Pending requests:</strong> {pendingRequests.length}
      </div>
    </div>
  );
}

// ---------- RoomPanel (Room Info + Request form) ----------
function RoomPanel({ room, inventory, requestForm, setRequestForm, submitRequest, requestError, role }) {
  return (
    <div>
      <div style={{ fontWeight: 800, fontSize: 18 }}>{room.id}</div>
      <div style={{ marginTop: 6 }}>
        Laptops: <strong>{room.items.Laptop}</strong>
        <br />
        TVs: <strong>{room.items.TV}</strong>
      </div>

      <hr style={{ margin: "10px 0" }} />

      <div>
        <h4>Borrow Request (for {room.id})</h4>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
          <label style={{ fontSize: 13 }}>Item</label>
          <select value={requestForm.itemType} onChange={(e) => setRequestForm((f) => ({ ...f, itemType: e.target.value }))}>
            <option value="Laptop">Laptop</option>
            <option value="TV">TV</option>
          </select>

          <label style={{ fontSize: 13 }}>Qty</label>
          <input
            type="number"
            min={1}
            value={requestForm.qty}
            style={{ width: 70 }}
            onChange={(e) => setRequestForm((f) => ({ ...f, qty: Number(e.target.value) }))}
          />

          <button onClick={submitRequest}>Request</button>
        </div>

        <div style={{ marginTop: 8, fontSize: 13 }}>
          <strong>Available now:</strong> Laptops {inventory.Laptop} • TVs {inventory.TV}
        </div>

        {requestError && <div style={{ marginTop: 8, color: "#b91c1c" }}>Error: {requestError}</div>}

        <div style={{ marginTop: 10, fontSize: 12, color: "#555" }}>
          Rooms browse items & submit requests here. Requests must be approved by an admin to affect inventory.
        </div>
      </div>
    </div>
  );
}

// ---------- MovePanel (Admin) ----------
function MovePanel({ rooms, moveForm, setMoveForm, onMove }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label>From</label>
        <select value={moveForm.from} onChange={(e) => setMoveForm((m) => ({ ...m, from: e.target.value }))}>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.id}
            </option>
          ))}
        </select>

        <label>To</label>
        <select value={moveForm.to} onChange={(e) => setMoveForm((m) => ({ ...m, to: e.target.value }))}>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.id}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label>Item</label>
        <select value={moveForm.itemType} onChange={(e) => setMoveForm((m) => ({ ...m, itemType: e.target.value }))}>
          <option value="Laptop">Laptop</option>
          <option value="TV">TV</option>
        </select>

        <label>Qty</label>
        <input
          type="number"
          min={1}
          value={moveForm.qty}
          style={{ width: 70 }}
          onChange={(e) => setMoveForm((m) => ({ ...m, qty: Number(e.target.value) }))}
        />

        <button
          onClick={() => {
            const moved = onMove(moveForm.from, moveForm.to, moveForm.itemType, moveForm.qty);
            if (moved) alert(`Moved ${moved} ${moveForm.itemType}(s) from ${moveForm.from} to ${moveForm.to}.`);
          }}
        >
          Move
        </button>
      </div>

      <div style={{ fontSize: 12, color: "#666" }}>Only admin can move items between rooms. Move is limited to what exists in the source room.</div>
    </div>
  );
}
