import { useState, useEffect, useRef } from "react";
import {
  Music,
  Users,
  Search,
  Play,
  Pause,
  Copy,
  LogIn,
  Loader,
  SkipForward,
  Plus,
  X,
  List,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldSet } from "./components/ui/field";
import { Input } from "./components/ui/input";
import { ButtonGroup } from "./components/ui/button-group";

// Add your YouTube API key here or use environment variable
const YOUTUBE_API_KEY =
  import.meta.env.VITE_YOUTUBE_API_KEY || "YOUR_API_KEY_HERE";

export default function YouTubeMusicRoom() {
  const [view, setView] = useState("home");
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [queue, setQueue] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [members, setMembers] = useState([]);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const playerRef = useRef(null);
  const [playerReady, setPlayerReady] = useState(false);

  // Initialize YouTube Player API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = () => {
      setPlayerReady(true);
    };
  }, []);

  // Load room data from storage
  useEffect(() => {
    if (roomId && view === "room") {
      loadRoomData();
      const interval = setInterval(loadRoomData, 2000);
      return () => clearInterval(interval);
    }
  }, [roomId, view]);

  // Sync player with room state
  useEffect(() => {
    if (playerRef.current && currentVideo && playerReady) {
      const currentVideoId = playerRef.current.getVideoData?.().video_id;

      // Load new video if different
      if (currentVideoId !== currentVideo.id) {
        playerRef.current.loadVideoById(currentVideo.id);
      }

      // Sync play/pause state
      const playerState = playerRef.current.getPlayerState?.();
      if (isPlaying && playerState !== 1) {
        playerRef.current.playVideo?.();
      } else if (!isPlaying && playerState === 1) {
        playerRef.current.pauseVideo?.();
      }
    } else if (
      currentVideo &&
      playerReady &&
      !playerRef.current &&
      view === "room"
    ) {
      setTimeout(() => initializePlayer(currentVideo.id), 100);
    }
  }, [currentVideo, isPlaying, playerReady, view]);

  const loadRoomData = async () => {
    try {
      const videoResult = await window.localStorage.getItem(
        `room:${roomId}:video`,
        true
      );
      const queueResult = await window.localStorage.getItem(
        `room:${roomId}:queue`,
        true
      );
      const membersResult = await window.localStorage.getItem(
        `room:${roomId}:members`,
        true
      );
      const playingResult = await window.localStorage.getItem(
        `room:${roomId}:playing`,
        true
      );

      if (videoResult && videoResult) {
        try {
          const video = JSON.parse(videoResult);
          if (video && video !== null) {
            setCurrentVideo(video);
          } else {
            setCurrentVideo(null);
          }
        } catch (e) {
          console.error("Error parsing video:", e);
          setCurrentVideo(null);
        }
      }
      if (queueResult && queueResult) {
        try {
          setQueue(JSON.parse(queueResult));
        } catch (e) {
          console.error("Error parsing queue:", e);
          setQueue([]);
        }
      }
      if (membersResult && membersResult) {
        try {
          setMembers(JSON.parse(membersResult));
        } catch (e) {
          console.error("Error parsing members:", e);
        }
      }
      if (playingResult && playingResult) {
        try {
          setIsPlaying(JSON.parse(playingResult));
        } catch (e) {
          console.error("Error parsing playing state:", e);
          setIsPlaying(false);
        }
      }
    } catch (error) {
      console.log("Room loading:", error);
    }
  };

  const initializePlayer = (videoId) => {
    if (window.YT && window.YT.Player && !playerRef.current) {
      const container = document.getElementById("youtube-player");
      if (!container) {
        console.log("Player container not found");
        return;
      }

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
          onReady: (event) => {
            console.log("Player ready");
            if (isPlaying) {
              event.target.playVideo();
            }
          },
          onStateChange: async (event) => {
            // When video ends, play next in queue
            if (event.data === window.YT.PlayerState.ENDED) {
              await playNextInQueue();
            }
          },
        },
      });
    }
  };

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createRoom = async () => {
    if (!userName.trim()) {
      alert("Please enter your name");
      return;
    }

    const newRoomId = generateRoomId();
    const initialMembers = [{ name: userName, joinedAt: Date.now() }];

    try {
      await window.localStorage.setItem(
        `room:${newRoomId}:members`,
        JSON.stringify(initialMembers),
        true
      );
      await window.localStorage.setItem(
        `room:${newRoomId}:playing`,
        JSON.stringify(false),
        true
      );
      await window.localStorage.setItem(
        `room:${newRoomId}:queue`,
        JSON.stringify([]),
        true
      );

      setRoomId(newRoomId);
      setMembers(initialMembers);
      setQueue([]);
      setView("room");
    } catch (error) {
      alert("Error creating room. Please try again.");
    }
  };

  const joinRoom = async () => {
    if (!userName.trim() || !joinRoomId.trim()) {
      alert("Please enter your name and room ID");
      return;
    }

    try {
      const membersResult = await window.localStorage.getItem(
        `room:${joinRoomId}:members`,
        true
      );

      if (!membersResult) {
        alert("Room not found. Please check the room ID.");
        return;
      }

      const currentMembers = JSON.parse(membersResult);
      const updatedMembers = [
        ...currentMembers,
        { name: userName, joinedAt: Date.now() },
      ];

      await window.localStorage.setItem(
        `room:${joinRoomId}:members`,
        JSON.stringify(updatedMembers),
        true
      );

      setRoomId(joinRoomId);
      setMembers(updatedMembers);
      setView("room");
      loadRoomData();
    } catch (error) {
      alert("Error joining room. Please try again.");
    }
  };

  const searchYouTube = async () => {
    if (!searchQuery.trim()) {
      alert("Please enter a search query");
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
        alert("No results found. Try a different search term.");
        setIsSearching(false);
        return;
      }

      const results = data.items.map((item) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium.url,
        channel: item.snippet.channelTitle,
      }));

      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      alert(`Error searching YouTube: ${error.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const addToQueue = async (video, playNow = false) => {
    try {
      if (playNow) {
        // Play immediately - add current video to front of queue if exists
        if (currentVideo) {
          const updatedQueue = [
            { ...currentVideo, addedBy: userName, addedAt: Date.now() },
            ...queue,
          ];
          await window.localStorage.setItem(
            `room:${roomId}:queue`,
            JSON.stringify(updatedQueue),
            true
          );
          setQueue(updatedQueue);
        }
        await playVideo(video);
      } else {
        // Add to end of queue
        const updatedQueue = [
          ...queue,
          { ...video, addedBy: userName, addedAt: Date.now() },
        ];
        await window.localStorage.setItem(
          `room:${roomId}:queue`,
          JSON.stringify(updatedQueue),
          true
        );
        setQueue(updatedQueue);

        // If no video is playing, start playing from queue
        if (!currentVideo) {
          const nextVideo = updatedQueue[0];
          await playVideo(nextVideo);
          // Remove from queue after starting playback
          const afterPlayQueue = updatedQueue.slice(1);
          await window.localStorage.setItem(
            `room:${roomId}:queue`,
            JSON.stringify(afterPlayQueue),
            true
          );
          setQueue(afterPlayQueue);
        }
      }
    } catch (error) {
      alert("Error adding to queue");
    }
  };

  const playVideo = async (video) => {
    if (!video || !roomId) return;

    try {
      await window.localStorage.setItem(
        `room:${roomId}:video`,
        JSON.stringify(video),
        true
      );
      await window.localStorage.setItem(`room:${roomId}:playing`, "true", true);

      setCurrentVideo(video);
      setIsPlaying(true);
      setSearchResults([]);
      setSearchQuery("");

      // Wait a bit for state to update
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (!playerRef.current && playerReady) {
        initializePlayer(video.id);
      } else if (playerRef.current && playerRef.current.loadVideoById) {
        try {
          playerRef.current.loadVideoById(video.id);
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
      alert("Error playing video");
    }
  };

  const removeFromQueue = async (index) => {
    try {
      const updatedQueue = queue.filter((_, i) => i !== index);
      await window.localStorage.setItem(
        `room:${roomId}:queue`,
        JSON.stringify(updatedQueue),
        true
      );
      setQueue(updatedQueue);
    } catch (error) {
      alert("Error removing from queue");
    }
  };

  const skipToNext = async () => {
    if (!roomId) return;

    try {
      await playNextInQueue();
    } catch (error) {
      console.error("Error skipping:", error);
      alert("Error skipping to next song");
    }
  };

  const playNextInQueue = async () => {
    try {
      // Load latest queue from storage
      const queueResult = await window.localStorage.getItem(
        `room:${roomId}:queue`,
        true
      );
      let currentQueue = [];

      if (queueResult && queueResult) {
        try {
          currentQueue = JSON.parse(queueResult);
        } catch (e) {
          console.error("Error parsing queue:", e);
          currentQueue = [];
        }
      }

      if (!currentQueue || currentQueue.length === 0) {
        // No more songs in queue
        await window.localStorage.setItem(`room:${roomId}:video`, "null", true);
        await window.localStorage.setItem(
          `room:${roomId}:playing`,
          "false",
          true
        );
        setCurrentVideo(null);
        setIsPlaying(false);

        if (playerRef.current) {
          playerRef.current.stopVideo?.();
        }
        return;
      }

      // Get the next video but don't remove it yet
      const nextVideo = currentQueue[0];

      // Start playing the next video
      await playVideo(nextVideo);

      // After starting playback, remove it from the queue
      const updatedQueue = currentQueue.slice(1);
      await window.localStorage.setItem(
        `room:${roomId}:queue`,
        JSON.stringify(updatedQueue),
        true
      );
      setQueue(updatedQueue);
    } catch (error) {
      console.error("Error playing next video:", error);
    }
  };

  const togglePlayPause = () => {
    if (!playerRef.current) return;

    try {
      if (isPlaying) {
        playerRef.current.pauseVideo?.();
        updatePlayingState(false);
      } else {
        playerRef.current.playVideo?.();
        updatePlayingState(true);
      }
    } catch (error) {
      console.error("Error toggling play/pause:", error);
    }
  };

  const updatePlayingState = async (playing) => {
    try {
      await window.localStorage.setItem(
        `room:${roomId}:playing`,
        JSON.stringify(playing),
        true
      );
      setIsPlaying(playing);
    } catch (error) {
      console.error("Error updating playback state");
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    alert("Room ID copied to clipboard!");
  };

  const leaveRoom = () => {
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    setView("home");
    setRoomId("");
    setCurrentVideo(null);
    setIsPlaying(false);
    setMembers([]);
    setSearchResults([]);
    setQueue([]);
  };

  // Home View
  if (view === "home") {
    return (
      <div className="min-h-screen bg-linear-to-br from-teal-600 via-blue-500 to-red-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <div className="flex items-center justify-center mb-8">
            <Music className="w-16 h-16 text-purple-600" />
          </div>
          <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">
            Music Room
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Listen to music together
          </p>

          <div className="space-y-4">
            <Button
              onClick={() => setView("create")}
              size="lg"
              className="w-full p-6"
            >
              <Music className="w-5 h-5" />
              Create Room
            </Button>

            <Button
              onClick={() => setView("join")}
              size="lg"
              variant="outline"
              className="w-full p-6"
            >
              <LogIn className="w-5 h-5" />
              Join room
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Create Room View
  if (view === "create") {
    return (
      <div className="min-h-screen bg-linear-to-br from-teal-600 via-blue-500 to-red-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">
            Create a Room
          </h2>

          <div className="space-y-12">
            <div>
              <FieldSet>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="username">Your Name</FieldLabel>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your name"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                    />
                  </Field>
                </FieldGroup>
              </FieldSet>
            </div>

            <div className="flex justify-between">
              <Button
                onClick={() => setView("home")}
                size="lg"
                variant="outline"
              >
                Back
              </Button>
              <Button onClick={createRoom} size="lg">
                Create Room
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Join Room View
  if (view === "join") {
    return (
      <div className="min-h-screen bg-linear-to-br from-teal-600 via-blue-500 to-red-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">Join a Room</h2>

          <div className="space-y-12">
            <div>
              <FieldSet>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="username">Your Name</FieldLabel>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your name"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="room-id">Room ID</FieldLabel>
                    <Input
                      id="room-id"
                      type="text"
                      placeholder="Enter room ID"
                      value={joinRoomId}
                      onChange={(e) =>
                        setJoinRoomId(e.target.value.toUpperCase())
                      }
                    />
                  </Field>
                </FieldGroup>
              </FieldSet>
            </div>

            <div className="flex justify-between">
              <Button
                onClick={() => setView("home")}
                size="lg"
                variant="outline"
              >
                Back
              </Button>
              <Button onClick={joinRoom} size="lg">
                Join Room
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Room View
  return (
    <div className="min-h-screen bg-slate-950 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex align-middle space-x-2">
                <h1 className="text-2xl font-bold text-gray-800">
                  Room: {roomId}
                </h1>
                <Button onClick={copyRoomId} variant="ghost">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-gray-600">
                Listening with {members.length}{" "}
                {members.length === 1 ? "person" : "people"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowQueue(!showQueue)} size="lg">
                <List className="w-4 h-4" />
                Queue ({queue.length})
              </Button>
              <Button onClick={leaveRoom} size="lg" variant="destructive">
                Leave
              </Button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-4">
            {/* Video Player */}
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
                  <p className="text-gray-600 text-sm mb-4">
                    {currentVideo.channel}
                  </p>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={togglePlayPause}
                      className="bg-purple-600 text-white p-4 rounded-full hover:bg-purple-700 transition"
                    >
                      {isPlaying ? (
                        <Pause className="w-6 h-6" />
                      ) : (
                        <Play className="w-6 h-6" />
                      )}
                    </button>
                    <button
                      onClick={skipToNext}
                      disabled={queue.length === 0}
                      className="bg-blue-600 text-white p-4 rounded-full hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                        queue.length === 0
                          ? "No songs in queue"
                          : "Skip to next"
                      }
                    >
                      <SkipForward className="w-6 h-6" />
                    </button>
                    <span className="text-sm text-gray-600">
                      {isPlaying ? "Playing for everyone" : "Paused"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {queue.length > 0
                      ? `${queue.length} song${
                          queue.length === 1 ? "" : "s"
                        } in queue`
                      : "No songs in queue"}
                  </p>
                </div>
              ) : (
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Music className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No video playing</p>
                    <p className="text-sm text-gray-500">
                      Search for a song below
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Search */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Search YouTube
              </h3>
              <ButtonGroup className="w-full">
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyUp={(e) => e.key === "Enter" && searchYouTube()}
                  placeholder="Search for a song..."
                  className="h-10"
                />
                <Button
                  onClick={searchYouTube}
                  disabled={isSearching}
                  size="lg"
                  variant="outline"
                  aria-label="Search"
                >
                  {isSearching ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                  Search
                </Button>
              </ButtonGroup>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="flex gap-3 p-3 bg-gray-50 rounded-lg hover:bg-purple-50 transition"
                    >
                      <img
                        src={result.thumbnail}
                        alt={result.title}
                        className="w-32 h-20 object-cover rounded flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-800 truncate">
                          {result.title}
                        </h4>
                        <p className="text-sm text-gray-600 truncate">
                          {result.channel}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => addToQueue(result, true)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2 text-sm"
                          title="Play now"
                        >
                          <Play className="w-4 h-4" />
                          Play
                        </button>
                        <button
                          onClick={() => addToQueue(result, false)}
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
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Queue */}
            {showQueue && (
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
                            className="w-16 h-12 object-cover rounded flex-shrink-0"
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
                            onClick={() => removeFromQueue(index)}
                            className="text-red-600 hover:text-red-700 flex-shrink-0"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">
                          Added by {song.addedBy}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Members */}
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
                    key={index}
                    className="bg-gray-50 rounded-lg p-3 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-gray-800 font-medium">
                      {member.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
