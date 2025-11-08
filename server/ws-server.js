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
        // associate this ws with the userName for cleanup on close
        if (userName) ws.userName = userName;
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
        // merge incoming state with existing state to avoid clients wiping members
        if (state) {
          // merge members by name (union)
          const incomingMembers = Array.isArray(state.members)
            ? state.members
            : [];
          const existingMembers = Array.isArray(room.state.members)
            ? room.state.members
            : [];
          const mergedMembersMap = new Map();
          for (const m of existingMembers) mergedMembersMap.set(m.name, m);
          for (const m of incomingMembers) mergedMembersMap.set(m.name, m);
          const mergedMembers = Array.from(mergedMembersMap.values());

          // queue: prefer incoming if provided, otherwise keep existing
          const mergedQueue = Array.isArray(state.queue)
            ? state.queue
            : room.state.queue || [];

          // currentVideo / playing: prefer incoming values when present
          const mergedCurrentVideo =
            state.currentVideo !== undefined
              ? state.currentVideo
              : room.state.currentVideo;
          const mergedPlaying =
            state.playing !== undefined ? state.playing : room.state.playing;

          room.state = {
            members: mergedMembers,
            queue: mergedQueue,
            currentVideo: mergedCurrentVideo,
            playing: mergedPlaying,
          };
        }
        // broadcast to all
        broadcast(roomId, { type: "room_state", roomId, state: room.state });
        break;

      default:
        break;
    }
  });

  ws.on("close", () => {
    // remove from all rooms and remove associated member (if any) then broadcast
    for (const [roomId, room] of rooms.entries()) {
      if (room.clients.has(ws)) {
        room.clients.delete(ws);
        const name = ws.userName;
        if (name) {
          room.state.members = room.state.members.filter(
            (m) => m.name !== name
          );
          broadcast(roomId, { type: "room_state", roomId, state: room.state });
        }
      }
      // cleanup empty rooms
      if (
        room.clients.size === 0 &&
        (!Array.isArray(room.state.members) || room.state.members.length === 0)
      ) {
        rooms.delete(roomId);
      }
    }
  });
});

console.log(`WebSocket server running on ws://localhost:${PORT}`);
