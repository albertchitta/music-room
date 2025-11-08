import { Users } from "lucide-react";

interface Member {
  name: string;
  joinedAt: number;
}

interface MembersProps {
  members: Member[];
}

export default function Members({ members }: MembersProps) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-6 h-6 text-purple-600" />
        <h3 className="text-xl font-bold text-gray-800">
          Members ({members.length})
        </h3>
      </div>
      <div className="space-y-2">
        {members.map((member, index) => (
          <div
            key={index}
            className="bg-gray-50 rounded-lg p-3 flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
              {member.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-gray-800 font-medium">{member.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

