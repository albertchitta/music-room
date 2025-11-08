import { WebSocketServer } from "ws";

const PORT = process.env.PORT || 3001;
const wss = new WebSocketServer({ port: PORT });

// rooms: Map roomId -> {clients: Set(ws), state: {members, currentVideo, queue, playing}}
const rooms = new Map();

function broadcast(roomId, message, exclude) {
  const room = rooms.get(roomId);
  if (!room) return;
  const data = JSON.stringify(message);
  for (const ws of room.clients) {
    if (ws.readyState === ws.OPEN && ws !== exclude) {
      ws.send(data);
    }
  }
}

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (e) {
      console.error("Invalid message", e);
      return;
    }

    const { type, roomId, userName, state } = msg;
    if (!roomId) return;

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        clients: new Set(),
        state: { members: [], currentVideo: null, queue: [], playing: false },
      });
    }

    const room = rooms.get(roomId);

    switch (type) {
      case "subscribe":
        room.clients.add(ws);
        // add member if not exists
        if (userName) {
          const exists = room.state.members.find((m) => m.name === userName);
          if (!exists) {
            room.state.members.push({ name: userName, joinedAt: Date.now() });
          }
        }
        // send current room state to new client
        ws.send(
          JSON.stringify({ type: "room_state", roomId, state: room.state })
        );
        // broadcast updated members to others
        broadcast(
          roomId,
          { type: "room_state", roomId, state: room.state },
          ws
        );
        break;

      case "leave":
        // remove member
        if (userName) {
          room.state.members = room.state.members.filter(
            (m) => m.name !== userName
          );
        }
        // broadcast
        broadcast(roomId, { type: "room_state", roomId, state: room.state });
        break;

      case "update":
        // replace state with incoming state (merge minimal)
        if (state) {
          room.state = { ...room.state, ...state };
          // ensure members array exists
          if (!Array.isArray(room.state.members)) room.state.members = [];
          if (!Array.isArray(room.state.queue)) room.state.queue = [];
        }
        // broadcast to all
        broadcast(roomId, { type: "room_state", roomId, state: room.state });
        break;

      default:
        break;
    }
  });

  ws.on("close", () => {
    // remove from all rooms
    for (const [roomId, room] of rooms.entries()) {
      if (room.clients.has(ws)) {
        room.clients.delete(ws);
      }
    }
  });
});

console.log(`WebSocket server running on ws://localhost:${PORT}`);
