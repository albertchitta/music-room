import Header from "../components/Header";
import VideoPlayer from "../components/VideoPlayer";
import Search from "../components/Search";
import Queue from "../components/Queue";
import Members from "../components/Members";

interface Member {
  name: string;
  joinedAt: number;
}

interface SearchResult {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  timestamp?: number;
}

interface QueueItem extends SearchResult {
  addedBy?: string;
  addedAt?: number;
  timestamp?: number;
}

interface RoomViewProps {
  roomId: string;
  members: Member[];
  queue: QueueItem[];
  currentVideo: QueueItem | null;
  isPlaying: boolean;
  showQueue: boolean;
  searchQuery: string;
  isSearching: boolean;
  searchResults: SearchResult[];
  onCopyRoomId: () => void;
  onToggleQueue: () => void;
  onLeaveRoom: () => void;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  onAddToQueue: (video: SearchResult, playNow: boolean) => void;
  onRemoveFromQueue: (index: number) => void;
  onTogglePlayPause: () => void;
  onSkipToNext: () => void;
}

export default function RoomView({
  roomId,
  members,
  queue,
  currentVideo,
  isPlaying,
  showQueue,
  searchQuery,
  isSearching,
  searchResults,
  onCopyRoomId,
  onToggleQueue,
  onLeaveRoom,
  onSearchQueryChange,
  onSearch,
  onAddToQueue,
  onRemoveFromQueue,
  onTogglePlayPause,
  onSkipToNext,
}: RoomViewProps) {
  return (
    <div className="min-h-screen bg-slate-950 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <Header
          roomId={roomId}
          memberCount={members.length}
          queueLength={queue.length}
          onCopyRoomId={onCopyRoomId}
          onToggleQueue={onToggleQueue}
          onLeaveRoom={onLeaveRoom}
        />

        <div className="grid md:grid-cols-3 gap-4">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-4">
            {/* Video Player */}
            <VideoPlayer
              currentVideo={currentVideo}
              isPlaying={isPlaying}
              queueLength={queue.length}
              onTogglePlayPause={onTogglePlayPause}
              onSkipToNext={onSkipToNext}
            />

            {/* Search */}
            <Search
              searchQuery={searchQuery}
              onSearchQueryChange={onSearchQueryChange}
              isSearching={isSearching}
              searchResults={searchResults}
              onSearch={onSearch}
              onAddToQueue={onAddToQueue}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Queue */}
            {showQueue && (
              <Queue queue={queue} onRemoveFromQueue={onRemoveFromQueue} />
            )}

            {/* Members */}
            <Members members={members} />
          </div>
        </div>
      </div>
    </div>
  );
}

