import { Button } from "../components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldSet } from "../components/ui/field";
import { Input } from "../components/ui/input";

interface CreateRoomViewProps {
  userName: string;
  onUserNameChange: (value: string) => void;
  onCreateRoom: (e: React.FormEvent) => void;
  onNavigateBack: () => void;
}

export default function CreateRoomView({
  userName,
  onUserNameChange,
  onCreateRoom,
  onNavigateBack,
}: CreateRoomViewProps) {
  return (
    <div className="min-h-screen bg-linear-to-br from-teal-600 via-blue-500 to-red-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        <h2 className="text-3xl font-bold mb-6 text-gray-800">
          Create a Room
        </h2>

        <form onSubmit={onCreateRoom}>
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
                Create Room
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

