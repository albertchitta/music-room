import { Search as SearchIcon, Loader, Play, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ButtonGroup } from "./ui/button-group";

interface SearchResult {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  timestamp?: number;
}

interface SearchProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  isSearching: boolean;
  searchResults: SearchResult[];
  onSearch: () => void;
  onAddToQueue: (video: SearchResult, playNow: boolean) => void;
}

export default function Search({
  searchQuery,
  onSearchQueryChange,
  isSearching,
  searchResults,
  onSearch,
  onAddToQueue,
}: SearchProps) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Search YouTube</h3>
      <ButtonGroup className="w-full">
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          onKeyUp={(e) => e.key === "Enter" && onSearch()}
          placeholder="Search for a song..."
          className="h-10"
        />
        <Button
          onClick={onSearch}
          disabled={isSearching}
          size="lg"
          variant="outline"
          aria-label="Search"
        >
          {isSearching ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : (
            <SearchIcon className="w-5 h-5" />
          )}
          Search
        </Button>
      </ButtonGroup>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {searchResults.map((result, index) => (
            <div
              key={index}
              className="flex gap-3 p-3 bg-gray-50 rounded-lg hover:bg-purple-50 transition"
            >
              <img
                src={result.thumbnail}
                alt={result.title}
                className="w-32 h-20 object-cover rounded shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-800 truncate">
                  {result.title}
                </h4>
                <p className="text-sm text-gray-600 truncate">
                  {result.channel}
                </p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => onAddToQueue(result, true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2 text-sm"
                  title="Play now"
                >
                  <Play className="w-4 h-4" />
                  Play
                </button>
                <button
                  onClick={() => onAddToQueue(result, false)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition flex items-center gap-2 text-sm"
                  title="Add to queue"
                >
                  <Plus className="w-4 h-4" />
                  Queue
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
