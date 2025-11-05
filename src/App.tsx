import { useState, useEffect, useRef } from "react";
import {
  Music,
  Users,
  Search,
  Play,
  Pause,
  Share2,
  LogIn,
  Loader,
} from "lucide-react";
import { Button } from "./components/ui/button";

interface Member {
  name: string;
  joinedAt: number;
}

export default function App() {
  const apiKey = import.meta.env.VITE_YOUTUBE_DATA_API_KEY;
  const [view, setView] = useState("home");
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [currentVideo, setCurrentVideo] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
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
      // const interval = setInterval(loadRoomData, 3000);
      // return () => clearInterval(interval);
    }
  }, [roomId, view]);

  // Sync player with room state
  useEffect(() => {
    if (playerRef.current && currentVideo) {
      const currentVideoId = playerRef.current.getVideoData?.().video_id;
      if (currentVideoId !== currentVideo.id) {
        playerRef.current.loadVideoById(currentVideo.id);
      }

      if (isPlaying) {
        playerRef.current.playVideo?.();
      } else {
        playerRef.current.pauseVideo?.();
      }
    }
  }, [currentVideo, isPlaying]);

  const loadRoomData = async () => {
    try {
      const videoResult = await localStorage.getItem(`room:${roomId}:video`);
      const membersResult = await localStorage.getItem(
        `room:${roomId}:members`
      );
      const playingResult = await localStorage.getItem(
        `room:${roomId}:playing`
      );

      if (videoResult) {
        setCurrentVideo(JSON.parse(videoResult));
      }
      if (membersResult) {
        setMembers(JSON.parse(membersResult));
      }
      if (playingResult) {
        setIsPlaying(JSON.parse(playingResult));
      }
    } catch (error) {
      console.log("Room loading:", error);
    }
  };

  const initializePlayer = (videoId) => {
    if (window.YT && window.YT.Player && !playerRef.current) {
      playerRef.current = new window.YT.Player("youtube-player", {
        height: "100%",
        width: "100%",
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
        },
        events: {
          onReady: (event) => {
            console.log("Player ready");
          },
          onStateChange: (event) => {
            // Sync play/pause state
            if (event.data === window.YT.PlayerState.PLAYING && !isPlaying) {
              updatePlayingState(true);
            } else if (
              event.data === window.YT.PlayerState.PAUSED &&
              isPlaying
            ) {
              updatePlayingState(false);
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
    const initialMembers: Member[] = [{ name: userName, joinedAt: Date.now() }];

    try {
      await localStorage.setItem(
        `room:${newRoomId}:members`,
        JSON.stringify(initialMembers)
      );

      await window.localStorage.setItem(
        `room:${newRoomId}:playing`,
        JSON.stringify(false)
      );

      setRoomId(newRoomId);
      setMembers(initialMembers);
      setView("room");
    } catch (error) {
      console.log("Error creating room:", error);
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
        `room:${joinRoomId}:members`
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
        JSON.stringify(updatedMembers)
      );

      setRoomId(joinRoomId);
      setMembers(updatedMembers);
      setView("room");
      loadRoomData();
    } catch (error) {
      console.log("Error joining room:", error);
      alert("Error joining room. Please try again.");
    }
  };

  const searchYouTube = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
          searchQuery
        )}&type=video&videoCategoryId=10&maxResults=10&key=${apiKey}`
      );

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();

      const results = data.items.map((item) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium.url,
        channel: item.snippet.channelTitle,
      }));

      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      alert(
        "Error searching YouTube. Please check your API key and try again."
      );
    } finally {
      setIsSearching(false);
    }
  };

  const selectVideo = async (video: any) => {
    try {
      await window.localStorage.setItem(
        `room:${roomId}:video`,
        JSON.stringify(video)
      );
      await window.localStorage.setItem(
        `room:${roomId}:playing`,
        JSON.stringify(true)
      );

      setCurrentVideo(video);
      setIsPlaying(true);
      setSearchResults([]);
      setSearchQuery("");

      // Initialize or update player
      if (!playerRef.current) {
        setTimeout(() => initializePlayer(video.id), 100);
      } else {
        playerRef.current.loadVideoById(video.id);
        playerRef.current.playVideo();
      }
    } catch (error) {
      console.log("Error selecting video:", error);
      alert("Error selecting video. Please try again.");
    }
  };

  const updatePlayingState = async (playing) => {
    try {
      await window.storage.set(
        `room:${roomId}:playing`,
        JSON.stringify(playing),
        true
      );
      setIsPlaying(playing);
    } catch (error) {
      console.error("Error updating playback state");
    }
  };

  const togglePlayPause = () => {
    if (!playerRef.current) return;

    if (isPlaying) {
      playerRef.current.pauseVideo();
      updatePlayingState(false);
    } else {
      playerRef.current.playVideo();
      updatePlayingState(true);
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
  };

  // Home View
  if (view === "home") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <div className="flex items-center justify-center mb-8">
            <Music className="w-16 h-16" />
          </div>
          <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">
            Music Room
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Listen to music together
          </p>

          <div className="space-y-4">
            <Button
              size="lg"
              onClick={() => setView("create")}
              className="w-full h-full p-4"
            >
              <Music />
              Create Room
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => setView("join")}
              className="w-full h-full p-4"
            >
              <LogIn />
              Join Room
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Create Room View
  if (view === "create") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">
            Create a Room
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-600 focus:outline-none"
              />
            </div>

            <button
              onClick={createRoom}
              className="w-full bg-purple-600 text-white py-4 rounded-xl font-semibold hover:bg-purple-700 transition"
            >
              Create Room
            </button>

            <button
              onClick={() => setView("home")}
              className="w-full bg-gray-200 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-300 transition"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Join Room View
  if (view === "join") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">Join a Room</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-pink-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room ID
              </label>
              <input
                type="text"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                placeholder="Enter room ID"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-pink-600 focus:outline-none uppercase"
              />
            </div>

            <button
              onClick={joinRoom}
              className="w-full bg-pink-600 text-white py-4 rounded-xl font-semibold hover:bg-pink-700 transition"
            >
              Join Room
            </button>

            <button
              onClick={() => setView("home")}
              className="w-full bg-gray-200 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-300 transition"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Room View
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Room: {roomId}
              </h1>
              <p className="text-gray-600">
                Listening with {members.length}{" "}
                {members.length === 1 ? "person" : "people"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyRoomId}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={leaveRoom}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
              >
                Leave
              </button>
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
                    <span className="text-sm text-gray-600">
                      {isPlaying ? "Playing" : "Paused"}
                    </span>
                  </div>
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
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyUp={(e) => e.key === "Enter" && searchYouTube()}
                  placeholder="Search for a song..."
                  className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-purple-600 focus:outline-none"
                />
                <button
                  onClick={searchYouTube}
                  disabled={isSearching}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isSearching ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                  Search
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {searchResults.map((result: any) => (
                    <div
                      key={result.id}
                      onClick={() => selectVideo(result)}
                      className="flex gap-3 p-3 bg-gray-50 rounded-lg hover:bg-purple-50 cursor-pointer transition"
                    >
                      <img
                        src={result.thumbnail}
                        alt={result.title}
                        className="w-32 h-20 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-800 truncate">
                          {result.title}
                        </h4>
                        <p className="text-sm text-gray-600 truncate">
                          {result.channel}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Members Sidebar */}
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
  );
}
