import { WebSocketServer } from "ws";

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const PORT = process.env.PORT || 3001;
const wss = new WebSocketServer({ port: PORT });

// Room state types:
// rooms: Map roomId -> {
//   clients: Set(ws),
//   state: {
//     members: Array<{id: string, name: string, joinedAt: number}>,
//     currentVideo: {id: string, title: string, thumbnail: string, channel: string} | null,
//     queue: Array<{id: string, title: string, thumbnail: string, channel: string, addedBy?: string, addedAt?: number}>,
//     playing: boolean,
//     // sync timing
//     playheadPositionSec: number, // accumulated position when paused
//     startedAtMs: number | null // wall-clock when playback started/resumed
//   }
// }
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
  // Log state changes for debugging
  if (message.type === "room_state") {
    console.log(
      `[broadcast] room=${roomId} members=${message.state.members.length} playing=${message.state.playing}`
    );
  }
}

function buildStatePayload(roomId) {
  const room = rooms.get(roomId);
  if (!room)
    return {
      members: [],
      currentVideo: null,
      queue: [],
      playing: false,
      playheadPositionSec: 0,
      startedAtMs: null,
      positionSec: 0,
      serverNowMs: Date.now(),
    };
  const now = Date.now();
  const base = Number(room.state.playheadPositionSec || 0);
  const started = room.state.startedAtMs;
  const positionSec = started ? base + (now - started) / 1000 : base;
  return {
    ...room.state,
    positionSec,
    serverNowMs: now,
  };
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
        state: {
          members: [],
          currentVideo: null,
          queue: [],
          playing: false,
          playheadPositionSec: 0,
          startedAtMs: null,
        },
      });
    }

    const room = rooms.get(roomId);

    switch (type) {
      case "subscribe":
        room.clients.add(ws);
        // associate this ws with the userName for cleanup on close
        if (userName) ws.userName = userName;
        // assign a unique member id per connection
        if (!ws.memberId) ws.memberId = genId();
        // idempotent add: if this socket already added a member, don't add again
        const alreadyMember = room.state.members.some(
          (m) => m.id === ws.memberId
        );
        if (userName && !alreadyMember) {
          room.state.members.push({
            id: ws.memberId,
            name: userName,
            joinedAt: Date.now(),
          });
        }
        // send current room state to new client
        ws.send(
          JSON.stringify({
            type: "room_state",
            roomId,
            state: buildStatePayload(roomId),
          })
        );
        // broadcast updated members to others
        broadcast(
          roomId,
          { type: "room_state", roomId, state: buildStatePayload(roomId) },
          ws
        );
        break;

      case "leave":
        // remove the member corresponding to this socket only
        if (ws.memberId) {
          room.state.members = room.state.members.filter(
            (m) => m.id !== ws.memberId
          );
        }
        // broadcast
        broadcast(roomId, {
          type: "room_state",
          roomId,
          state: buildStatePayload(roomId),
        });
        break;

      // Removed timestamp/seek handling

      case "updatePlaying":
        if (state?.playing !== undefined) {
          const desired = !!state.playing;
          // No-op: if state is already desired, avoid rebroadcast/timing changes
          if (room.state.playing === desired) break;
          const now = Date.now();
          if (desired) {
            // resume: set startedAt based on current base position
            if (!room.state.startedAtMs) {
              room.state.startedAtMs =
                now - Math.floor(room.state.playheadPositionSec * 1000);
            }
            room.state.playing = true;
          } else {
            // pause: accumulate elapsed into base and clear startedAt
            if (room.state.startedAtMs) {
              const elapsedSec = (now - room.state.startedAtMs) / 1000;
              room.state.playheadPositionSec += elapsedSec;
              room.state.startedAtMs = null;
            }
            room.state.playing = false;
          }
          broadcast(roomId, {
            type: "room_state",
            roomId,
            state: buildStatePayload(roomId),
          });
        }
        break;

      case "updateVideo":
        if (state?.currentVideo !== undefined) {
          // starting a new video resets timing and starts playing from 0 by default
          room.state.currentVideo = state.currentVideo;
          room.state.playing = true;
          room.state.playheadPositionSec = 0;
          room.state.startedAtMs = Date.now();
          broadcast(roomId, {
            type: "room_state",
            roomId,
            state: buildStatePayload(roomId),
          });
        }
        break;

      case "updateQueue":
        if (Array.isArray(state?.queue)) {
          room.state.queue = state.queue;
          broadcast(roomId, {
            type: "room_state",
            roomId,
            state: buildStatePayload(roomId),
          });
        }
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
        if (ws.memberId) {
          room.state.members = room.state.members.filter(
            (m) => m.id !== ws.memberId
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
