import { useRef, useEffect, useState } from "react";
import { Music, SkipForward, Play, Pause } from "lucide-react";
import type { YTPlayerEvent } from "../types/youtube";

interface QueueItem {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  addedBy?: string;
  addedAt?: number;
  timestamp?: number;
}

interface VideoPlayerProps {
  currentVideo: QueueItem | null;
  isPlaying: boolean;
  queueLength: number;
  onTogglePlayPause: () => void;
  onSkipToNext: () => void;
  onVideoEnd?: () => void;
  onPlayerStateChange?: (isPlaying: boolean) => void;
}

export default function VideoPlayer({
  currentVideo,
  isPlaying,
  queueLength,
  onTogglePlayPause,
  onSkipToNext,
  onVideoEnd,
}: VideoPlayerProps) {
  const playerRef = useRef<any>(null); // Use 'any' to match YouTube API instance
  const currentVideoIdRef = useRef<string | null>(null);
  const onVideoEndRef = useRef<(() => void) | undefined>(onVideoEnd);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isSeeking, setIsSeeking] = useState<boolean>(false);
  const wasPlayingRef = useRef<boolean>(false);

  // Handle play/pause button click
  const handlePlayPauseClick = async () => {
    if (playerRef.current) {
      try {
        if (isPlaying) {
          playerRef.current.pauseVideo();
        } else {
          await playerRef.current.playVideo();
        }
      } catch (e) {
        console.error("Error controlling player:", e);
      }
    }

    // Update the WebSocket state
    onTogglePlayPause();
  };

  // Keep the ref updated with the latest callback
  useEffect(() => {
    onVideoEndRef.current = onVideoEnd;
  }, [onVideoEnd]);

  // Update current time and duration periodically
  useEffect(() => {
    if (playerRef.current && currentVideo && !isSeeking) {
      const interval = setInterval(() => {
        if (playerRef.current) {
          const time = playerRef.current.getCurrentTime?.();
          const dur = playerRef.current.getDuration?.();

          if (time !== undefined) setCurrentTime(time);
          if (dur !== undefined) setDuration(dur);
        }
      }, 500); // Update twice per second

      return () => clearInterval(interval);
    }
  }, [currentVideo?.id, isSeeking]);

  // Handle seek bar change
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);

    // Remember if video was playing before seeking
    if (!isSeeking && playerRef.current) {
      const playerState = playerRef.current.getPlayerState?.();
      wasPlayingRef.current = playerState === 1; // 1 = playing
    }

    setIsSeeking(true);
  };

  // Handle seek bar mouse up (commit the seek)
  const handleSeekCommit = () => {
    if (playerRef.current) {
      playerRef.current.seekTo(currentTime, true);

      // Resume playing if video was playing before seek
      setTimeout(() => {
        if (playerRef.current && wasPlayingRef.current) {
          playerRef.current.playVideo();
        }
        setIsSeeking(false);
      }, 100);
    } else {
      setIsSeeking(false);
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Sync player state with isPlaying prop
  useEffect(() => {
    if (playerRef.current && currentVideo) {
      try {
        const playerState = playerRef.current.getPlayerState?.();

        // 1 = playing, 2 = paused, -1 = unstarted, 0 = ended, 3 = buffering, 5 = cued
        if (isPlaying && playerState !== 1 && playerState !== 3) {
          // Should be playing but isn't (and not buffering)
          if (playerRef.current.playVideo) {
            // Add a small delay to ensure the player is ready
            setTimeout(() => {
              if (playerRef.current && playerRef.current.playVideo) {
                playerRef.current.playVideo();
              }
            }, 100);
          }
        } else if (!isPlaying && playerState === 1) {
          // Should be paused but is playing
          if (playerRef.current.pauseVideo) {
            playerRef.current.pauseVideo();
          }
        }
      } catch (e) {
        console.error("Error syncing player state:", e);
      }
    }
  }, [isPlaying, currentVideo]);

  useEffect(() => {
    if (window.YT && currentVideo) {
      // Only recreate player if the video ID actually changed
      if (currentVideoIdRef.current === currentVideo.id && playerRef.current) {
        return;
      }

      currentVideoIdRef.current = currentVideo.id;

      if (playerRef.current) {
        playerRef.current.destroy();
      }
      playerRef.current = new window.YT.Player("youtube-player", {
        height: "100%",
        width: "100%",
        videoId: currentVideo.id,
        events: {
          onReady: (event: YTPlayerEvent) => {
            // Seek to the timestamp from the room state if available
            if (currentVideo.timestamp) {
              event.target.seekTo(currentVideo.timestamp, true);
            }
            event.target.playVideo(); // Automatically start video

            // Initialize time and duration
            setTimeout(() => {
              if (playerRef.current) {
                const time = playerRef.current.getCurrentTime?.();
                const dur = playerRef.current.getDuration?.();
                if (time !== undefined) setCurrentTime(time);
                if (dur !== undefined) setDuration(dur);
              }
            }, 500);
          },
          onStateChange: (event: any) => {
            // State 0 means video ended
            if (event.data === 0) {
              if (onVideoEndRef.current) {
                onVideoEndRef.current();
              }
            }
          },
        },
      });
    }
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [currentVideo]);

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

          {/* Seek bar */}
          <div className="mb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 min-w-[45px]">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime || 0}
                onChange={handleSeek}
                onMouseUp={handleSeekCommit}
                onTouchEnd={handleSeekCommit}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                style={{
                  background: `linear-gradient(to right, #2563eb 0%, #2563eb ${
                    duration > 0 ? (currentTime / duration) * 100 : 0
                  }%, #e5e7eb ${
                    duration > 0 ? (currentTime / duration) * 100 : 0
                  }%, #e5e7eb 100%)`,
                }}
              />
              <span className="text-sm text-gray-600 min-w-[45px] text-right">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handlePlayPauseClick}
              className="bg-blue-600 text-white p-4 rounded-full hover:bg-blue-700 transition"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </button>
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
