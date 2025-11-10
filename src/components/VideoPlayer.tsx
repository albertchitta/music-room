import { useRef, useEffect } from "react";
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

  // Handle play/pause button click
  const handlePlayPauseClick = async () => {
    console.log("Button clicked, current isPlaying:", isPlaying);

    if (playerRef.current) {
      try {
        const currentState = playerRef.current.getPlayerState?.();
        console.log("Current player state:", currentState);

        if (isPlaying) {
          // Currently playing, so pause it
          console.log("Pausing player");
          playerRef.current.pauseVideo();
        } else {
          // Currently paused, so play it
          console.log("Playing player");
          await playerRef.current.playVideo();
        }

        // Give the player a moment to change state
        setTimeout(() => {
          const newState = playerRef.current?.getPlayerState?.();
          console.log("Player state after action:", newState);
        }, 200);
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

  // Sync player state with isPlaying prop
  useEffect(() => {
    if (playerRef.current && currentVideo) {
      try {
        const playerState = playerRef.current.getPlayerState?.();
        console.log(
          "Sync effect - isPlaying:",
          isPlaying,
          "playerState:",
          playerState,
          "playerRef exists:",
          !!playerRef.current,
          "playVideo exists:",
          !!playerRef.current.playVideo
        );

        // 1 = playing, 2 = paused, -1 = unstarted, 0 = ended, 3 = buffering, 5 = cued
        if (isPlaying && playerState !== 1 && playerState !== 3) {
          // Should be playing but isn't (and not buffering)
          console.log(
            "Attempting to call playVideo(), playerState:",
            playerState
          );
          if (playerRef.current.playVideo) {
            // Add a small delay to ensure the player is ready
            setTimeout(() => {
              if (playerRef.current && playerRef.current.playVideo) {
                playerRef.current.playVideo();
                console.log("playVideo() called successfully");
              }
            }, 100);
          } else {
            console.error("playVideo method does not exist!");
          }
        } else if (!isPlaying && playerState === 1) {
          // Should be paused but is playing
          console.log("Calling pauseVideo()");
          if (playerRef.current.pauseVideo) {
            playerRef.current.pauseVideo();
            console.log("pauseVideo() called successfully");
          } else {
            console.error("pauseVideo method does not exist!");
          }
        } else {
          console.log("No action needed - states match or buffering");
        }
      } catch (e) {
        console.error("Error syncing player state:", e);
      }
    } else {
      console.log(
        "Sync effect skipped - playerRef:",
        !!playerRef.current,
        "currentVideo:",
        !!currentVideo
      );
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
            event.target.playVideo(); // Automatically start video
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
