import { Button } from "../components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldSet } from "../components/ui/field";
import { Input } from "../components/ui/input";

interface JoinRoomViewProps {
  userName: string;
  onUserNameChange: (value: string) => void;
  joinRoomId: string;
  onJoinRoomIdChange: (value: string) => void;
  onJoinRoom: (e: React.FormEvent) => void;
  onNavigateBack: () => void;
}

export default function JoinRoomView({
  userName,
  onUserNameChange,
  joinRoomId,
  onJoinRoomIdChange,
  onJoinRoom,
  onNavigateBack,
}: JoinRoomViewProps) {
  return (
    <div className="min-h-screen bg-linear-to-br from-teal-600 via-blue-500 to-red-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        <h2 className="text-3xl font-bold mb-6 text-gray-800">Join a Room</h2>

        <form onSubmit={onJoinRoom}>
          <div className="space-y-12">
            <div>
              <FieldSet>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="username">Your Name</FieldLabel>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your name"
                      value={userName}
                      onChange={(e) => onUserNameChange(e.target.value)}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="room-id">Room ID</FieldLabel>
                    <Input
                      id="room-id"
                      type="text"
                      placeholder="Enter room ID"
                      value={joinRoomId}
                      onChange={(e) =>
                        onJoinRoomIdChange(e.target.value.toUpperCase())
                      }
                    />
                  </Field>
                </FieldGroup>
              </FieldSet>
            </div>

            <div className="flex justify-between">
              <Button
                onClick={onNavigateBack}
                size="lg"
                variant="outline"
                type="button"
              >
                Back
              </Button>
              <Button size="lg" type="submit">
                Join Room
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

