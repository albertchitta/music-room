import { Copy, List } from "lucide-react";
import { Button } from "./ui/button";

interface HeaderProps {
  roomId: string;
  memberCount: number;
  queueLength: number;
  onCopyRoomId: () => void;
  onToggleQueue: () => void;
  onLeaveRoom: () => void;
}

export default function Header({
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
            Listening with {memberCount} {memberCount === 1 ? "person" : "people"}
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

