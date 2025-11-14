import { VideoPlayer, Search, Queue, Members, Header } from "../App";

interface Member {
  id?: string;
  name: string;
  joinedAt: number;
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

interface RoomViewProps {
  roomId: string;
  members: Member[];
  queue: QueueItem[];
  currentVideo: QueueItem | null;
  isPlaying: boolean;
  playbackBaseSec: number;
  playbackStartedAtMs: number | null;
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
  onVideoEnd?: () => void;
}

export default function RoomView({
  roomId,
  members,
  queue,
  currentVideo,
  isPlaying,
  playbackBaseSec,
  playbackStartedAtMs,
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
  onVideoEnd,
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
              playbackBaseSec={playbackBaseSec}
              playbackStartedAtMs={playbackStartedAtMs}
              onTogglePlayPause={onTogglePlayPause}
              onSkipToNext={onSkipToNext}
              onVideoEnd={onVideoEnd}
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
