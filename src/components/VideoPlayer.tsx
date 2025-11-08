import { Music, Play, Pause, SkipForward } from "lucide-react";

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
}

export default function VideoPlayer({
  currentVideo,
  isPlaying,
  queueLength,
  onTogglePlayPause,
  onSkipToNext,
}: VideoPlayerProps) {
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
          <p className="text-gray-600 text-sm mb-4">
            {currentVideo.channel}
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={onTogglePlayPause}
              className="bg-purple-600 text-white p-4 rounded-full hover:bg-purple-700 transition"
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
              title={
                queueLength === 0 ? "No songs in queue" : "Skip to next"
              }
            >
              <SkipForward className="w-6 h-6" />
            </button>
            <span className="text-sm text-gray-600">
              {isPlaying ? "Playing for everyone" : "Paused"}
            </span>
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

