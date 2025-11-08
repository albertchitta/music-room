import { X } from "lucide-react";

interface QueueItem {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  addedBy?: string;
  addedAt?: number;
  timestamp?: number;
}

interface QueueProps {
  queue: QueueItem[];
  onRemoveFromQueue: (index: number) => void;
}

export default function Queue({ queue, onRemoveFromQueue }: QueueProps) {
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
              <p className="text-xs text-gray-500">
                Added by {song.addedBy}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

