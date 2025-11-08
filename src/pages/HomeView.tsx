import { Music, LogIn } from "lucide-react";
import { Button } from "../components/ui/button";

interface HomeViewProps {
  onNavigateToCreate: () => void;
  onNavigateToJoin: () => void;
}

export default function HomeView({
  onNavigateToCreate,
  onNavigateToJoin,
}: HomeViewProps) {
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
            onClick={onNavigateToCreate}
            size="lg"
            className="w-full p-6"
          >
            <Music className="w-5 h-5" />
            Create Room
          </Button>

          <Button
            onClick={onNavigateToJoin}
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

