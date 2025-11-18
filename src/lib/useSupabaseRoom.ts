import { useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface Member {
  id: string;
  name: string;
  joinedAt: number;
}

export interface QueueItem {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  addedBy?: string;
  addedAt?: number;
}

export interface RoomState {
  members: Member[];
  currentVideo: QueueItem | null;
  queue: QueueItem[];
  playing: boolean;
  playheadPositionSec: number;
  startedAtMs: number | null;
}

export function useSupabaseRoom(
  roomId: string,
  userName: string,
  memberId: string,
  onStateUpdate: (
    state: RoomState & { positionSec: number; serverNowMs: number }
  ) => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  const sendBroadcast = useCallback(
    (event: string, payload: any) => {
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event,
          payload: { ...payload, roomId, senderId: memberId },
        });
      }
    },
    [roomId, memberId]
  );

  useEffect(() => {
    if (!roomId || !userName) return;

    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        presence: {
          key: memberId,
        },
      },
    });

    channelRef.current = channel;

    // Track presence (members in room)
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const members: Member[] = [];

        Object.keys(state).forEach((key) => {
          const presences = state[key];
          presences.forEach((presence: any) => {
            members.push({
              id: presence.id,
              name: presence.name,
              joinedAt: presence.joinedAt,
            });
          });
        });

        // Notify about member changes
        onStateUpdate({
          members,
          currentVideo: null,
          queue: [],
          playing: false,
          playheadPositionSec: 0,
          startedAtMs: null,
          positionSec: 0,
          serverNowMs: Date.now(),
        });
      })
      .on("broadcast", { event: "room_state" }, ({ payload }: any) => {
        if (payload.senderId !== memberId) {
          // Received state update from another client
          const serverNow = payload.serverNowMs || Date.now();
          const base = Number(payload.playheadPositionSec || 0);
          const positionSec = payload.startedAtMs
            ? base + (serverNow - payload.startedAtMs) / 1000
            : base;

          onStateUpdate({
            ...payload,
            positionSec,
            serverNowMs: serverNow,
          });
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Track our presence
          await channel.track({
            id: memberId,
            name: userName,
            joinedAt: Date.now(),
          });
        }
      });

    return () => {
      channel.untrack();
      channel.unsubscribe();
    };
  }, [roomId, userName, memberId, onStateUpdate]);

  return {
    sendBroadcast,
    channel: channelRef.current,
  };
}
