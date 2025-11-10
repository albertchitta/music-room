import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import HomeView from "./pages/HomeView";
import CreateRoomView from "./pages/CreateRoomView";
import JoinRoomView from "./pages/JoinRoomView";
import RoomView from "./pages/RoomView";

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        config: {
          height: string;
          width: string;
          videoId: string;
          playerVars?: Record<string, unknown>;
          events?: Record<string, unknown>;
        }
      ) => {
        destroy: () => void;
        playVideo: () => void;
        pauseVideo: () => void;
        loadVideoById: (params: {
          videoId: string;
          startSeconds: number;
        }) => void;
        getVideoData: () => { video_id: string };
        getCurrentTime: () => number;
        getDuration: () => number;
        seekTo: (seconds: number, allowSeekAhead: boolean) => void;
        getPlayerState: () => number;
        stopVideo: () => void;
      };
      PlayerState: {
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface Member {
  name: string;
  joinedAt: number;
}

interface YouTubeApiItem {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    thumbnails: {
      medium: {
        url: string;
      };
    };
    channelTitle: string;
  };
}

interface YouTubePlayerEvent {
  target: {
    playVideo: () => void;
    pauseVideo: () => void;
    seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  };
}

interface YouTubeStateChangeEvent {
  data: number;
}

interface SearchResult {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  timestamp?: number; // Optional timestamp for video position
}

interface QueueItem extends SearchResult {
  addedBy?: string;
  addedAt?: number;
  timestamp?: number;
}

export default function MusicRoom() {
  // Add your YouTube API key here or use environment variable
  const YOUTUBE_API_KEY =
    import.meta.env.VITE_YOUTUBE_API_KEY || "YOUR_API_KEY_HERE";

  const [view, setView] = useState<string>("home");
  const [roomId, setRoomId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentVideo, setCurrentVideo] = useState<QueueItem | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [joinRoomId, setJoinRoomId] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showQueue, setShowQueue] = useState<boolean>(false);
  const playerRef = useRef<InstanceType<typeof window.YT.Player>>(null);
  const [playerReady, setPlayerReady] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Refs to store the latest callback functions for YouTube player events
  const playNextInQueueRef = useRef<(() => Promise<void>) | null>(null);
  const updatePlayingStateRef = useRef<
    ((playing: boolean) => Promise<void>) | null
  >(null);
  const lastPlayerStateRef = useRef<number>(-1);

  // Wait for a WebSocket to open (or timeout)
  const waitForWsOpen = useCallback(
    (socket: WebSocket | null, timeout: number = 4000): Promise<boolean> => {
      return new Promise((resolve) => {
        if (!socket) return resolve(false);
        if (socket.readyState === WebSocket.OPEN) return resolve(true);

        const onOpen = () => {
          cleanup();
          resolve(true);
        };

        const onClose = () => {
          cleanup();
          resolve(false);
        };

        const timer = setTimeout(() => {
          cleanup();
          resolve(false);
        }, timeout);

        function cleanup() {
          try {
            if (socket) {
              // safe removal
              (socket as WebSocket).removeEventListener("open", onOpen);
              (socket as WebSocket).removeEventListener("close", onClose);
            }
          } catch {
            /* ignore */
          }
          clearTimeout(timer);
        }

        socket.addEventListener("open", onOpen);
        socket.addEventListener("close", onClose);
      });
    },
    []
  );

  // Setup message handlers for a socket and subscribe to a room
  const attachSocketHandlers = useCallback(
    (
      socket: WebSocket,
      subscribeRoomId?: string,
      subscribeUserName?: string
    ) => {
      try {
        socket.onopen = () => {
          try {
            if (subscribeRoomId) {
              socket.send(
                JSON.stringify({
                  type: "subscribe",
                  roomId: subscribeRoomId,
                  userName: subscribeUserName,
                })
              );
            } else if (roomId) {
              socket.send(
                JSON.stringify({ type: "subscribe", roomId, userName })
              );
            }
          } catch (e) {
            console.error("WS send error on open:", e);
          }
        };

        socket.onmessage = (evt) => {
          try {
            const msg = JSON.parse(evt.data);
            if (
              msg?.type === "room_state" &&
              msg.roomId === (subscribeRoomId || roomId)
            ) {
              const s = msg.state || {};
              setMembers(s.members || []);
              setQueue(s.queue || []);

              // Only update currentVideo if it actually changed (compare video ID)
              setCurrentVideo((prevVideo) => {
                const newVideo = s.currentVideo || null;
                // If both are null, no change
                if (!prevVideo && !newVideo) return prevVideo;
                // If one is null and other isn't, it changed
                if (!prevVideo || !newVideo) return newVideo;
                // If same video ID and timestamp is close (within 1 second), keep previous reference
                if (
                  prevVideo.id === newVideo.id &&
                  Math.abs(
                    (prevVideo.timestamp || 0) - (newVideo.timestamp || 0)
                  ) < 1
                ) {
                  return prevVideo;
                }
                // Otherwise, it's a real change
                return newVideo;
              });

              setIsPlaying(!!s.playing);
            }
          } catch (e) {
            console.error("WS message parse error:", e);
          }
        };

        socket.onclose = () => {
          if (wsRef.current === socket) wsRef.current = null;
        };
      } catch (e) {
        console.error("Error attaching socket handlers", e);
      }
    },
    [roomId, userName]
  );

  // Loads the IFrame API code asynchronously.
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = () => {
      setPlayerReady(true);
    };
  }, []);

  // Creates an <iframe> (and YouTube player) after the API code downloads.
  // Creates an <iframe> (and YouTube player) after the API code downloads.
  const initializePlayer = useCallback(
    (videoId: string) => {
      if (!window.YT || !window.YT.Player) {
        return;
      }

      if (playerRef.current) {
        return;
      }

      const container = document.getElementById("youtube-player");
      if (!container) {
        return;
      }

      // Clear any existing content in case there's a stale iframe
      container.innerHTML = "";

      playerRef.current = new window.YT.Player("youtube-player", {
        height: "100%",
        width: "100%",
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event: YouTubePlayerEvent) => {
            // Initialize with current state
            try {
              // Ensure currentVideo exists before using it
              if (currentVideo?.timestamp) {
                event.target.seekTo(currentVideo.timestamp, true);
              }
              if (isPlaying) {
                event.target.playVideo();
              } else {
                event.target.pauseVideo();
              }
              // Signal that player is ready
              setPlayerReady(true);
            } catch (e) {
              console.error("Error initializing player:", e);
            }
          },
          onStateChange: async (event: YouTubeStateChangeEvent) => {
            // Handle all player state changes
            switch (event.data) {
              case -1: // unstarted
                break;
              case 0: // ended
                if (playNextInQueueRef.current) {
                  await playNextInQueueRef.current();
                }
                break;
              case 1: // playing
                if (updatePlayingStateRef.current) {
                  await updatePlayingStateRef.current(true);
                }
                break;
              case 2: // paused
                if (updatePlayingStateRef.current) {
                  await updatePlayingStateRef.current(false);
                }
                break;
              case 3: // buffering
                break;
              case 5: // video cued
                break;
            }
          },
        },
      });
    },
    [isPlaying, currentVideo]
  );

  // Handle user leaving the page
  useEffect(() => {
    if (roomId && userName) {
      window.addEventListener("beforeunload", leaveRoom);
      return () => {
        window.removeEventListener("beforeunload", leaveRoom);
      };
    }
  }, [roomId, userName]);

  // Update timestamp periodically via WebSocket and monitor for video end
  useEffect(() => {
    if (
      roomId &&
      currentVideo &&
      isPlaying &&
      playerRef.current &&
      wsRef.current?.readyState === WebSocket.OPEN
    ) {
      const updateTimestamp = () => {
        if (!playerRef.current) {
          return;
        }

        const currentTime = playerRef.current.getCurrentTime?.();
        const duration = playerRef.current.getDuration?.();

        if (
          currentTime !== undefined &&
          duration !== undefined &&
          duration > 0
        ) {
          try {
            wsRef.current?.send(
              JSON.stringify({
                type: "updateTimestamp",
                roomId,
                state: {
                  currentVideo: { ...currentVideo, timestamp: currentTime },
                },
              })
            );
          } catch (e) {
            console.error("Failed to send timestamp:", e);
          }

          // Check if video has ended by comparing current time to duration
          if (currentTime >= duration - 0.5) {
            if (
              playNextInQueueRef.current &&
              lastPlayerStateRef.current !== 0
            ) {
              lastPlayerStateRef.current = 0; // Prevent multiple calls
              playNextInQueueRef.current();
            }
          }
        }
      };

      const interval = setInterval(updateTimestamp, 1000);
      return () => clearInterval(interval);
    }
  }, [roomId, currentVideo, isPlaying]);

  // WebSocket connection to sync rooms across devices
  useEffect(() => {
    if (roomId && view === "room") {
      const wsUrl =
        (import.meta.env.VITE_WS_URL as string) || "ws://localhost:3001";

      // If a socket already exists (for example created during join flow), reuse it
      if (wsRef.current) {
        // Ensure subscription is sent for this room
        try {
          if (wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({ type: "subscribe", roomId, userName })
            );
          } else {
            // Attach handlers in case it was created externally
            attachSocketHandlers(wsRef.current, roomId, userName);
          }
        } catch (e) {
          console.error("WS reuse error:", e);
        }
        return;
      }

      // Otherwise create a new WebSocket
      try {
        wsRef.current = new WebSocket(wsUrl);
      } catch (e) {
        console.error("WebSocket connection error:", e);
        return;
      }

      attachSocketHandlers(wsRef.current, roomId, userName);

      return () => {
        if (wsRef.current) {
          try {
            wsRef.current.send(
              JSON.stringify({ type: "leave", roomId, userName })
            );
          } catch (e) {
            console.error(e);
          }
          wsRef.current.close();
          wsRef.current = null;
        }
      };
    }
  }, [roomId, view, userName, attachSocketHandlers]);

  // Sync player with room state
  useEffect(() => {
    // Only proceed if we're in the room view
    if (view !== "room") return;

    // If we need to create the player
    if (currentVideo && playerReady && !playerRef.current) {
      const container = document.getElementById("youtube-player");
      if (!container) {
        console.log("Player container not mounted yet");
        // Wait for container to be available
        const checkInterval = setInterval(() => {
          if (document.getElementById("youtube-player")) {
            clearInterval(checkInterval);
            initializePlayer(currentVideo.id);
          }
        }, 100);
        return () => clearInterval(checkInterval);
      }
      initializePlayer(currentVideo.id);
      return;
    }

    // If player exists, sync with room state
    if (playerRef.current && currentVideo && playerReady) {
      try {
        const currentVideoId = playerRef.current.getVideoData?.().video_id;

        // Load new video if different
        if (currentVideoId !== currentVideo.id) {
          playerRef.current.loadVideoById({
            videoId: currentVideo.id,
            startSeconds: currentVideo.timestamp || 0,
          });
          return;
        }

        // Sync timestamp (only when video is playing)
        if (isPlaying) {
          const currentTime = playerRef.current.getCurrentTime?.();
          if (
            currentVideo.timestamp !== undefined &&
            Math.abs(currentTime - currentVideo.timestamp) > 2
          ) {
            playerRef.current.seekTo?.(currentVideo.timestamp, true);
          }
        }

        // Sync play/pause state
        const playerState = playerRef.current.getPlayerState?.();
        if (isPlaying && playerState !== 1) {
          playerRef.current.playVideo?.();
        } else if (!isPlaying && playerState === 1) {
          playerRef.current.pauseVideo?.();
        }
      } catch (e) {
        console.error("Error syncing player state:", e);
      }
    }
  }, [currentVideo, isPlaying, playerReady, view, initializePlayer]);

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    const newRoomId = generateRoomId();

    try {
      // Create WebSocket first to ensure server connection
      const wsUrl =
        (import.meta.env.VITE_WS_URL as string) || "ws://localhost:3001";
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        try {
          wsRef.current = new WebSocket(wsUrl);
          attachSocketHandlers(wsRef.current, newRoomId, userName);
        } catch (e) {
          console.error("WebSocket connection error:", e);
          toast.error("Failed to connect to server. Please try again.");
          return;
        }
      }

      // Wait for socket to be ready
      const ok = await waitForWsOpen(wsRef.current, 3000);
      if (!ok) {
        toast.error("Could not connect to server. Please try again.");
        return;
      }

      // Set local state and enter room - server will echo back the full state
      setRoomId(newRoomId);
      setView("room");
    } catch (error) {
      toast.error(`Error creating room. Please try again. ${error}`);
    }
  };

  const joinRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userName.trim() || !joinRoomId.trim()) {
      toast.error("Please enter your name and room ID");
      return;
    }

    try {
      const wsUrl =
        (import.meta.env.VITE_WS_URL as string) || "ws://localhost:3001";

      // open a temporary socket to ask the server for the room state
      const temp = new WebSocket(wsUrl);

      type RoomStateServer = {
        members?: Member[];
        queue?: QueueItem[];
        currentVideo?: QueueItem | null;
        playing?: boolean;
      };

      const roomState = await new Promise<RoomStateServer | null>((resolve) => {
        const timer = setTimeout(() => {
          cleanup();
          resolve(null);
        }, 5000);

        function cleanup() {
          clearTimeout(timer);
          try {
            temp.removeEventListener("open", onOpen);
            temp.removeEventListener("message", onMessage);
            temp.removeEventListener("close", onClose);
          } catch {
            /* ignore */
          }
        }

        function onOpen() {
          try {
            temp.send(
              JSON.stringify({
                type: "subscribe",
                roomId: joinRoomId,
                userName,
              })
            );
          } catch {
            /* ignore */
          }
        }

        function onMessage(evt: MessageEvent) {
          try {
            const msg = JSON.parse(evt.data);
            if (msg?.type === "room_state" && msg.roomId === joinRoomId) {
              cleanup();
              resolve(msg.state || {});
            }
          } catch {
            // ignore parse errors
          }
        }

        function onClose() {
          cleanup();
          resolve(null);
        }

        temp.addEventListener("open", onOpen);
        temp.addEventListener("message", onMessage);
        temp.addEventListener("close", onClose);
      });

      if (!roomState) {
        try {
          temp.close();
        } catch {
          /* ignore */
        }
        toast.error("Room not found. Please check the room ID.");
        return;
      }

      // reuse this socket as the persistent connection
      wsRef.current = temp;
      attachSocketHandlers(temp, joinRoomId, userName);

      // set local state from server-provided state and enter room
      setRoomId(joinRoomId);
      setMembers(roomState.members || []);
      setQueue(roomState.queue || []);
      setCurrentVideo(roomState.currentVideo || null);
      setIsPlaying(!!roomState.playing);
      setView("room");
    } catch (error) {
      toast.error(`Error joining room. Please try again. ${error}`);
    }
  };

  const searchYouTube = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        searchQuery
      )}&type=video&videoCategoryId=10&maxResults=10&key=${YOUTUBE_API_KEY}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        throw new Error(errorData.error?.message || "Search failed");
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        toast.error("No results found. Try a different search term.");
        setIsSearching(false);
        return;
      }

      const results: SearchResult[] = data.items.map(
        (item: YouTubeApiItem) => ({
          id: item.id.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.medium.url,
          channel: item.snippet.channelTitle,
        })
      );

      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      toast.error(`Error searching YouTube: ${error}`);
    } finally {
      setIsSearching(false);
    }
  };

  const addToQueue = async (
    video: SearchResult,
    playNow: boolean = false
  ): Promise<void> => {
    try {
      if (playNow) {
        // Play immediately
        await playVideo(video);
      } else {
        // Add to end of queue
        const updatedQueue: QueueItem[] = [
          ...queue,
          { ...video, addedBy: userName, addedAt: Date.now() },
        ];

        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          console.error("No WebSocket connection");
          toast.error("Lost connection to server");
          return;
        }

        // Update queue via WebSocket
        wsRef.current.send(
          JSON.stringify({
            type: "updateQueue",
            roomId,
            state: { queue: updatedQueue },
          })
        );

        // Optimistically update local state
        setQueue(updatedQueue);

        // If no video is playing, start playing from queue
        if (!currentVideo) {
          const nextVideo: QueueItem = updatedQueue[0];
          await playVideo(nextVideo);

          // Remove from queue after starting playback
          const afterPlayQueue: QueueItem[] = updatedQueue.slice(1);
          wsRef.current.send(
            JSON.stringify({
              type: "updateQueue",
              roomId,
              state: { queue: afterPlayQueue },
            })
          );

          // Optimistically update local queue
          setQueue(afterPlayQueue);
        }
      }
    } catch (error) {
      toast.error(`Error adding to queue: ${error}`);
    }
  };

  const playVideo = useCallback(
    async (video: SearchResult) => {
      if (!video || !roomId) return;

      try {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          console.error("No WebSocket connection");
          toast.error("Lost connection to server");
          return;
        }

        // Send video update to server
        wsRef.current.send(
          JSON.stringify({
            type: "updateVideo",
            roomId,
            state: { currentVideo: video },
          })
        );

        // Send playing state update
        wsRef.current.send(
          JSON.stringify({
            type: "updatePlaying",
            roomId,
            state: { playing: true },
          })
        );

        // Update local UI state
        setCurrentVideo(video);
        setIsPlaying(true);
        setSearchResults([]);
        setSearchQuery("");

        // Initialize or update player
        if (!playerRef.current && playerReady) {
          initializePlayer(video.id);
        } else if (playerRef.current) {
          // Use timestamp from video object if it exists, otherwise start at 0
          try {
            playerRef.current.loadVideoById({
              videoId: video.id,
              startSeconds: Math.floor(video.timestamp || 0),
            });
            // Reset the last player state when loading a new video
            lastPlayerStateRef.current = -1;
            setTimeout(() => {
              if (playerRef.current && playerRef.current.playVideo) {
                playerRef.current.playVideo();
              }
            }, 300);
          } catch (error) {
            console.error("Error loading video in player:", error);
          }
        }
      } catch (error) {
        console.error("Error playing video:", error);
        toast.error(`Error playing video: ${error}`);
      }
    },
    [roomId, playerReady, initializePlayer]
  );

  const removeFromQueue = async (index: number) => {
    try {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.error("No WebSocket connection");
        toast.error("Lost connection to server");
        return;
      }

      const updatedQueue = queue.filter((_, i) => i !== index);

      // Update queue via WebSocket
      wsRef.current.send(
        JSON.stringify({
          type: "updateQueue",
          roomId,
          state: { queue: updatedQueue },
        })
      );

      // Optimistically update local state
      setQueue(updatedQueue);
    } catch (error) {
      toast.error(`Error removing from queue: ${error}`);
    }
  };

  const skipToNext = async () => {
    if (!roomId) return;

    try {
      await playNextInQueue();
    } catch (error) {
      console.error("Error skipping:", error);
      toast.error(`Error skipping to next song: ${error}`);
    }
  };

  const playNextInQueue = useCallback(async () => {
    try {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.error("No WebSocket connection");
        toast.error("Lost connection to server");
        return;
      }

      if (!queue || queue.length === 0) {
        // No more songs in queue
        wsRef.current.send(
          JSON.stringify({
            type: "updateVideo",
            roomId,
            state: { currentVideo: null },
          })
        );
        wsRef.current.send(
          JSON.stringify({
            type: "updatePlaying",
            roomId,
            state: { playing: false },
          })
        );

        // Update local state
        setCurrentVideo(null);
        setIsPlaying(false);

        if (playerRef.current) {
          playerRef.current.stopVideo?.();
        }
        return;
      }

      // Get the next video but don't remove it yet
      const nextVideo = {
        ...queue[0],
        timestamp: 0, // Force timestamp to 0 for next video
      };

      // Start playing the next video (this will send video and playing state updates)
      await playVideo(nextVideo);

      // After starting playback, remove it from the queue
      const updatedQueue = queue.slice(1);

      wsRef.current.send(
        JSON.stringify({
          type: "updateQueue",
          roomId,
          state: { queue: updatedQueue },
        })
      );

      // Optimistically update local queue
      setQueue(updatedQueue);
    } catch (error) {
      console.error("Error playing next video:", error);
    }
  }, [queue, roomId, playVideo]);

  const togglePlayPause = async () => {
    if (!playerRef.current) return;

    try {
      if (isPlaying) {
        // First update the state to ensure UI responsiveness
        await updatePlayingState(false);
        // Then pause the player
        playerRef.current.pauseVideo?.();
      } else {
        // First update the state to ensure UI responsiveness
        await updatePlayingState(true);
        // Then play the player
        playerRef.current.playVideo?.();
      }
    } catch (error) {
      console.error("Error toggling play/pause:", error);
      toast.error("Error controlling playback");
      // Revert state if player control failed
      await updatePlayingState(isPlaying);
    }
  };

  const updatePlayingState = useCallback(
    async (playing: boolean) => {
      try {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          console.error("No WebSocket connection");
          return;
        }

        wsRef.current.send(
          JSON.stringify({
            type: "updatePlaying",
            roomId,
            state: { playing },
          })
        );

        // Optimistically update local state
        setIsPlaying(playing);
      } catch (error) {
        console.error("Error updating playback state:", error);
        toast.error("Failed to update playback state");
      }
    },
    [roomId]
  );

  // Keep the refs updated with the latest callback functions
  useEffect(() => {
    playNextInQueueRef.current = playNextInQueue;
  }, [playNextInQueue]);

  useEffect(() => {
    updatePlayingStateRef.current = updatePlayingState;
  }, [updatePlayingState]);

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    toast.success("Room ID copied to clipboard!");
  };

  const leaveRoom = useCallback(async () => {
    // Cleanup player if it exists
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    // Notify server and close socket
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "leave", roomId, userName }));
        wsRef.current.close();
      }
    } catch (e) {
      console.error("Error notifying leave:", e);
    }

    // Reset all local state
    setView("home");
    setRoomId("");
    setCurrentVideo(null);
    setIsPlaying(false);
    setMembers([]);
    setSearchResults([]);
    setQueue([]);
    setSearchQuery("");
  }, [roomId, userName]);

  // Home View
  if (view === "home") {
    return (
      <HomeView
        onNavigateToCreate={() => setView("create")}
        onNavigateToJoin={() => setView("join")}
      />
    );
  }

  // Create Room View
  if (view === "create") {
    return (
      <CreateRoomView
        userName={userName}
        onUserNameChange={setUserName}
        onCreateRoom={createRoom}
        onNavigateBack={() => setView("home")}
      />
    );
  }

  // Join Room View
  if (view === "join") {
    return (
      <JoinRoomView
        userName={userName}
        onUserNameChange={setUserName}
        joinRoomId={joinRoomId}
        onJoinRoomIdChange={setJoinRoomId}
        onJoinRoom={joinRoom}
        onNavigateBack={() => setView("home")}
      />
    );
  }

  // Room View
  return (
    <RoomView
      roomId={roomId}
      members={members}
      queue={queue}
      currentVideo={currentVideo}
      isPlaying={isPlaying}
      showQueue={showQueue}
      searchQuery={searchQuery}
      isSearching={isSearching}
      searchResults={searchResults}
      onCopyRoomId={copyRoomId}
      onToggleQueue={() => setShowQueue(!showQueue)}
      onLeaveRoom={leaveRoom}
      onSearchQueryChange={setSearchQuery}
      onSearch={searchYouTube}
      onAddToQueue={addToQueue}
      onRemoveFromQueue={removeFromQueue}
      onTogglePlayPause={togglePlayPause}
      onSkipToNext={skipToNext}
      onVideoEnd={playNextInQueue}
    />
  );
}
