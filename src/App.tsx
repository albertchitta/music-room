import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  Music,
  SkipForward,
  Search as SearchIcon,
  Loader,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Plus,
  X,
  Users,
  Copy,
  List,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { ButtonGroup } from "./components/ui/button-group";
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
        // volume & mute controls
        setVolume: (volume: number) => void;
        getVolume: () => number;
        mute: () => void;
        unMute: () => void;
        isMuted: () => boolean;
      };
      PlayerState: {
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface Member {
  id?: string;
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

interface SearchResult {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

interface QueueItem extends SearchResult {
  addedBy?: string;
  addedAt?: number;
}

interface VideoPlayerProps {
  currentVideo: QueueItem | null;
  isPlaying: boolean;
  queueLength: number;
  playbackBaseSec: number;
  playbackStartedAtMs: number | null;
  onTogglePlayPause: () => void;
  onSkipToNext: () => void;
  onVideoEnd?: () => void;
}

export function VideoPlayer({
  currentVideo,
  isPlaying,
  queueLength,
  onTogglePlayPause,
  onSkipToNext,
  onVideoEnd,
}: VideoPlayerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const currentVideoIdRef = useRef<string | null>(null);
  const onVideoEndRef = useRef<(() => void) | undefined>(onVideoEnd);
  const playerReadyRef = useRef<boolean>(false);
  const [volume, setVolume] = useState<number>(80);
  const [muted, setMuted] = useState<boolean>(false);

  // Keep callback refs fresh
  useEffect(() => {
    onVideoEndRef.current = onVideoEnd;
  }, [onVideoEnd]);

  // Create/destroy player when video changes
  useEffect(() => {
    if (!window.YT || !currentVideo) return;
    if (currentVideoIdRef.current === currentVideo.id && playerRef.current) {
      return;
    }
    if (playerRef.current) {
      playerRef.current.destroy();
      playerReadyRef.current = false;
    }
    currentVideoIdRef.current = currentVideo.id;

    playerRef.current = new window.YT.Player("youtube-player", {
      height: "100%",
      width: "100%",
      videoId: currentVideo.id,
      playerVars: {
        playsinline: 1,
        autoplay: 0,
        controls: 0,
        disablekb: 1,
      },
      events: {
        onReady: () => {
          playerReadyRef.current = true;
          // Apply initial volume
          if (playerRef.current) {
            playerRef.current.setVolume(volume);
            if (muted) {
              playerRef.current.mute();
            }
          }
          // Auto-play if isPlaying is true
          if (isPlaying && playerRef.current) {
            playerRef.current.playVideo();
          }
        },
        onStateChange: (event: { data: number }) => {
          if (event.data === 0) {
            // Video ended
            onVideoEndRef.current?.();
          }
        },
      },
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
        playerReadyRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVideo?.id]);

  // Apply play/pause state
  useEffect(() => {
    if (!playerRef.current || !currentVideo || !playerReadyRef.current) return;

    if (isPlaying) {
      playerRef.current.playVideo();
    } else {
      playerRef.current.pauseVideo();
    }
  }, [isPlaying, currentVideo]);

  // Apply volume changes
  useEffect(() => {
    if (!playerRef.current || !playerReadyRef.current) return;
    playerRef.current.setVolume(volume);
  }, [volume]);

  // Apply mute changes
  useEffect(() => {
    if (!playerRef.current || !playerReadyRef.current) return;
    if (muted) {
      playerRef.current.mute();
    } else {
      playerRef.current.unMute();
    }
  }, [muted]);

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      {currentVideo ? (
        <div>
          <div
            id="youtube-player"
            className="aspect-video bg-black rounded-lg mb-4"
          ></div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            {currentVideo.title}
          </h3>
          <p className="text-gray-600 text-sm mb-4">{currentVideo.channel}</p>

          <div className="flex items-center gap-4">
            <button
              onClick={onTogglePlayPause}
              className="bg-blue-600 text-white p-4 rounded-full hover:bg-blue-700 transition"
              title={isPlaying ? "Pause" : "Play"}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMuted((m) => !m)}
                className="bg-gray-100 text-gray-800 p-3 rounded-full hover:bg-gray-200 transition"
                title={muted ? "Unmute" : "Mute"}
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-32 accent-blue-600"
              />
            </div>
            <button
              onClick={onSkipToNext}
              disabled={queueLength === 0}
              className="bg-blue-600 text-white p-4 rounded-full hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              title={queueLength === 0 ? "No songs in queue" : "Skip to next"}
            >
              <SkipForward className="w-6 h-6" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {queueLength > 0
              ? `${queueLength} song${queueLength === 1 ? "" : "s"} in queue`
              : "No songs in queue"}
          </p>
        </div>
      ) : (
        <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <Music className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No video playing</p>
            <p className="text-sm text-gray-500">Search for a song below</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface SearchProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  isSearching: boolean;
  searchResults: SearchResult[];
  onSearch: () => void;
  onAddToQueue: (video: SearchResult, playNow: boolean) => void;
}

export function Search({
  searchQuery,
  onSearchQueryChange,
  isSearching,
  searchResults,
  onSearch,
  onAddToQueue,
}: SearchProps) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Search YouTube</h3>
      <ButtonGroup className="w-full">
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          onKeyUp={(e) => e.key === "Enter" && onSearch()}
          placeholder="Search for a song..."
          className="h-10"
        />
        <Button
          onClick={onSearch}
          disabled={isSearching}
          size="lg"
          variant="outline"
          aria-label="Search"
        >
          {isSearching ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : (
            <SearchIcon className="w-5 h-5" />
          )}
          Search
        </Button>
      </ButtonGroup>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {searchResults.map((result, index) => (
            <div
              key={index}
              className="flex gap-3 p-3 bg-gray-50 rounded-lg hover:bg-purple-50 transition"
            >
              <img
                src={result.thumbnail}
                alt={result.title}
                className="w-32 h-20 object-cover rounded shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-800 truncate">
                  {result.title}
                </h4>
                <p className="text-sm text-gray-600 truncate">
                  {result.channel}
                </p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => onAddToQueue(result, true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2 text-sm"
                  title="Play now"
                >
                  <Play className="w-4 h-4" />
                  Play
                </button>
                <button
                  onClick={() => onAddToQueue(result, false)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition flex items-center gap-2 text-sm"
                  title="Add to queue"
                >
                  <Plus className="w-4 h-4" />
                  Queue
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface QueueProps {
  queue: QueueItem[];
  onRemoveFromQueue: (index: number) => void;
}

export function Queue({ queue, onRemoveFromQueue }: QueueProps) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">
        Queue ({queue.length})
      </h3>
      {queue.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">
          No songs in queue
        </p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {queue.map((song, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-3">
              <div className="flex gap-2 mb-2">
                <img
                  src={song.thumbnail}
                  alt={song.title}
                  className="w-16 h-12 object-cover rounded shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-gray-800 truncate">
                    {song.title}
                  </h4>
                  <p className="text-xs text-gray-600 truncate">
                    {song.channel}
                  </p>
                </div>
                <button
                  onClick={() => onRemoveFromQueue(index)}
                  className="text-red-600 hover:text-red-700 shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500">Added by {song.addedBy}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface MembersProps {
  members: Member[];
}

export function Members({ members }: MembersProps) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-6 h-6 text-purple-600" />
        <h3 className="text-xl font-bold text-gray-800">
          Members ({members.length})
        </h3>
      </div>
      <div className="space-y-2">
        {members.map((member, index) => (
          <div
            key={member.id ?? `${member.name}-${member.joinedAt}-${index}`}
            className="bg-gray-50 rounded-lg p-3 flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
              {member.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-gray-800 font-medium">{member.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface HeaderProps {
  roomId: string;
  memberCount: number;
  queueLength: number;
  onCopyRoomId: () => void;
  onToggleQueue: () => void;
  onLeaveRoom: () => void;
}

export function Header({
  roomId,
  memberCount,
  queueLength,
  onCopyRoomId,
  onToggleQueue,
  onLeaveRoom,
}: HeaderProps) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 mb-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex align-middle space-x-2">
            <h1 className="text-2xl font-bold text-gray-800">Room: {roomId}</h1>
            <Button onClick={onCopyRoomId} variant="ghost">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-gray-600">
            Listening with {memberCount}{" "}
            {memberCount === 1 ? "person" : "people"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onToggleQueue} size="lg">
            <List className="w-4 h-4" />
            Queue ({queueLength})
          </Button>
          <Button onClick={onLeaveRoom} size="lg" variant="destructive">
            Leave
          </Button>
        </div>
      </div>
    </div>
  );
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
  const [playbackBaseSec, setPlaybackBaseSec] = useState<number>(0);
  const [playbackStartedAtMs, setPlaybackStartedAtMs] = useState<number | null>(
    null
  );
  const wsRef = useRef<WebSocket | null>(null);

  // Refs to store the latest callback functions for YouTube player events
  const playNextInQueueRef = useRef<(() => Promise<void>) | null>(null);

  // Load the YouTube IFrame API once
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
    window.onYouTubeIframeAPIReady = () => {
      // API is ready, VideoPlayer will check for window.YT
    };
  }, []);

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
            const targetRoom = subscribeRoomId || roomId;
            const targetUser = subscribeUserName || userName;
            if (targetRoom) {
              socket.send(
                JSON.stringify({
                  type: "subscribe",
                  roomId: targetRoom,
                  userName: targetUser,
                })
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
              // derive absolute position at server time to avoid clock skew
              const serverNow =
                typeof s.serverNowMs === "number" ? s.serverNowMs : Date.now();
              let positionAtServerNow: number;
              if (typeof s.positionSec === "number") {
                positionAtServerNow = s.positionSec;
              } else {
                const base = Number(s.playheadPositionSec || 0);
                positionAtServerNow =
                  base +
                  (s.startedAtMs ? (serverNow - s.startedAtMs) / 1000 : 0);
              }
              setPlaybackBaseSec(positionAtServerNow);
              // Always project from server time; local pause disables corrections
              setPlaybackStartedAtMs(serverNow);
              setCurrentVideo((prevVideo) => {
                const newVideo = s.currentVideo || null;
                if (!prevVideo && !newVideo) return prevVideo;
                if (!prevVideo || !newVideo) return newVideo;
                if (prevVideo.id === newVideo.id) return newVideo;
                return newVideo;
              });
              // Sync playing state from server
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
        playheadPositionSec?: number;
        startedAtMs?: number | null;
        positionSec?: number;
        serverNowMs?: number;
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
      const serverNow =
        typeof roomState.serverNowMs === "number"
          ? roomState.serverNowMs
          : Date.now();
      let positionAtServerNow: number;
      if (typeof roomState.positionSec === "number") {
        positionAtServerNow = roomState.positionSec;
      } else {
        const base = Number(roomState.playheadPositionSec || 0);
        positionAtServerNow =
          base +
          (roomState.startedAtMs
            ? (serverNow - roomState.startedAtMs) / 1000
            : 0);
      }
      setPlaybackBaseSec(positionAtServerNow);
      // Always project from server time; local pause disables corrections
      setPlaybackStartedAtMs(serverNow);
      // Sync initial playing state from server
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

        const videoToPlay = { ...video };

        // Send video update to server
        wsRef.current.send(
          JSON.stringify({
            type: "updateVideo",
            roomId,
            state: { currentVideo: videoToPlay },
          })
        );

        // Update local UI state
        setCurrentVideo(videoToPlay);
        setIsPlaying(true);
        setSearchResults([]);
        setSearchQuery("");

        // VideoPlayer will pick up state changes and load/play the video
      } catch (error) {
        console.error("Error playing video:", error);
        toast.error(`Error playing video: ${error}`);
      }
    },
    [roomId]
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
    await playNextInQueue();
  };

  const playNextInQueue = useCallback(async () => {
    if (!queue || queue.length === 0) {
      // No more songs in queue
      wsRef.current?.send(
        JSON.stringify({
          type: "updateVideo",
          roomId,
          state: { currentVideo: null },
        })
      );
      // When no video, also ensure playing is false
      wsRef.current?.send(
        JSON.stringify({
          type: "updatePlaying",
          roomId,
          state: { playing: false },
        })
      );

      setCurrentVideo(null);
      setIsPlaying(false);
      return;
    }

    // Get the next video
    const nextVideo = {
      ...queue[0],
    };

    // Send video update to server
    wsRef.current?.send(
      JSON.stringify({
        type: "updateVideo",
        roomId,
        state: { currentVideo: nextVideo },
      })
    );

    // Update local UI state
    setCurrentVideo(nextVideo);
    setIsPlaying(true);

    // Remove from queue
    const updatedQueue = queue.slice(1);
    wsRef.current?.send(
      JSON.stringify({
        type: "updateQueue",
        roomId,
        state: { queue: updatedQueue },
      })
    );

    setQueue(updatedQueue);
  }, [queue, roomId]);

  const togglePlayPause = async () => {
    try {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.error("No WebSocket connection");
        toast.error("Lost connection to server");
        return;
      }

      const newPlayingState = !isPlaying;

      // Send playing state update to server
      wsRef.current.send(
        JSON.stringify({
          type: "updatePlaying",
          roomId,
          state: { playing: newPlayingState },
        })
      );

      // Optimistically update local state
      setIsPlaying(newPlayingState);
    } catch (error) {
      console.error("Error toggling play/pause:", error);
      toast.error("Error controlling playback");
    }
  };

  // Keep the refs updated with the latest callback functions
  useEffect(() => {
    playNextInQueueRef.current = playNextInQueue;
  }, [playNextInQueue]);

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    toast.success("Room ID copied to clipboard!");
  };

  const leaveRoom = useCallback(async () => {
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

  // Handle user leaving the page
  useEffect(() => {
    if (roomId && userName) {
      window.addEventListener("beforeunload", leaveRoom);
      return () => {
        window.removeEventListener("beforeunload", leaveRoom);
      };
    }
  }, [roomId, userName, leaveRoom]);

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
      playbackBaseSec={playbackBaseSec}
      playbackStartedAtMs={playbackStartedAtMs}
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
