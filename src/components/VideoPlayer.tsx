import { useRef, useEffect } from "react";
import { Music, SkipForward } from "lucide-react";
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
}

export default function VideoPlayer({
  currentVideo,
  queueLength,
  onSkipToNext,
  onVideoEnd,
}: VideoPlayerProps) {
  const playerRef = useRef<any>(null); // Use 'any' to match YouTube API instance
  const currentVideoIdRef = useRef<string | null>(null);
  const onVideoEndRef = useRef<(() => void) | undefined>(onVideoEnd);

  // Keep the ref updated with the latest callback
  useEffect(() => {
    onVideoEndRef.current = onVideoEnd;
  }, [onVideoEnd]);

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
