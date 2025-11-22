import { useState } from "react";

export default function App() {
  const [view, setView] = useState("map");
  const [rooms, setRooms] = useState([
    { id: "R101", name: "Lab 1", status: "available" },
    { id: "R102", name: "Lab 2", status: "occupied" },
    { id: "R201", name: "Lecture A", status: "available" },
  ]);

  const [equipment, setEquipment] = useState([
    { id: "E01", name: "Projector", qty: 3 },
    { id: "E02", name: "Laptop", qty: 5 },
    { id: "E03", name: "Microphone", qty: 1 },
  ]);

  const [requests, setRequests] = useState([]);

  function toggleRoom(roomId) {
    setRooms(r =>
      r.map(room =>
        room.id === roomId
          ? {
              ...room,
              status: room.status === "available" ? "occupied" : "available",
            }
          : room
      )
    );
  }

  function requestItem(itemId) {
    const item = equipment.find(e => e.id === itemId);
    if (!item) return;

    const req = {
      id: "REQ-" + Date.now(),
      item: item.name,
      status: "pending",
    };

    setRequests([req, ...requests]);
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>CCIS CONNECT (Prototype)</h1>

      {/* Navigation */}
      <div style={{ marginTop: 20, marginBottom: 20 }}>
        <button onClick={() => setView("map")}>Map</button>{" "}
        <button onClick={() => setView("rooms")}>Rooms</button>{" "}
        <button onClick={() => setView("equipment")}>Equipment</button>{" "}
        <button onClick={() => setView("admin")}>Admin</button>
      </div>

      {/* MAP */}
      {view === "map" && (
        <div>
          <h2>Campus Map (Simplified)</h2>
          <p>Click rooms to view them.</p>
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "10px",
            }}
          >
            {rooms.map(r => (
              <div
                key={r.id}
                onClick={() => setView("rooms")}
                style={{
                  border: "1px solid #aaa",
                  padding: "10px",
                  cursor: "pointer",
                }}
              >
                <strong>{r.id}</strong>
                <br />
                {r.name}
                <br />
                Status: {r.status}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ROOMS */}
      {view === "rooms" && (
        <div>
          <h2>Room List</h2>
          {rooms.map(r => (
            <div
              key={r.id}
              style={{
                border: "1px solid #ddd",
                padding: 10,
                marginBottom: 10,
              }}
            >
              <strong>
                {r.id} — {r.name}
              </strong>
              <br />
              Status: {r.status}
              <br />
              <button onClick={() => toggleRoom(r.id)}>Toggle Status</button>
            </div>
          ))}
        </div>
      )}

      {/* EQUIPMENT */}
      {view === "equipment" && (
        <div>
          <h2>Equipment</h2>
          {equipment.map(e => (
            <div
              key={e.id}
              style={{
                border: "1px solid #ddd",
                padding: 10,
                marginBottom: 10,
              }}
            >
              <strong>{e.name}</strong> (qty: {e.qty})
              <br />
              <button onClick={() => requestItem(e.id)}>Request</button>
            </div>
          ))}

          <h3>Your Requests</h3>
          {requests.length === 0 && <p>No requests yet.</p>}
          {requests.map(r => (
            <div key={r.id}>
              {r.item} — <strong>{r.status}</strong>
            </div>
          ))}
        </div>
      )}

      {/* ADMIN */}
      {view === "admin" && (
        <div>
          <h2>Admin Panel</h2>
          <h3>Pending Requests</h3>

          {requests.filter(r => r.status === "pending").length === 0 && (
            <p>No pending requests.</p>
          )}

          {requests
            .filter(r => r.status === "pending")
            .map(r => (
              <div key={r.id} style={{ marginBottom: 10 }}>
                {r.item}
                <br />
                <button
                  onClick={() =>
                    setRequests(re =>
                      re.map(x =>
                        x.id === r.id ? { ...x, status: "approved" } : x
                      )
                    )
                  }
                >
                  Approve
                </button>{" "}
                <button
                  onClick={() =>
                    setRequests(re =>
                      re.map(x =>
                        x.id === r.id ? { ...x, status: "rejected" } : x
                      )
                    )
                  }
                >
                  Reject
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
