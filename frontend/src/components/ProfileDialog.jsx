import { useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const TEAMS = [
  "Technology",
  "Shared Functions",
  "Claims",
  "Finance",
  "Operations",
  "HR",
  "Sales",
  "Marketing",
];

export default function ProfileDialog({
  open,
  onClose,
}) {
  const { user, refresh } = useAuth();

  const [team, setTeam] = useState(
    user?.team || "Shared Functions"
  );

  if (!open) return null;

  const save = async () => {
    await api.put("/users/me", {
      team,
    });

    await refresh();

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white p-6 rounded-xl w-[400px]">
        <h2 className="text-lg font-semibold mb-4">
          Edit Profile
        </h2>

        <div className="mb-3">
          <label>Name</label>
          <input
            value={user?.name || ""}
            disabled
            className="w-full border rounded p-2"
          />
        </div>

        <div className="mb-3">
          <label>Email</label>
          <input
            value={user?.email || ""}
            disabled
            className="w-full border rounded p-2"
          />
        </div>

        <div className="mb-4">
          <label>Team</label>

          <select
            value={team}
            onChange={(e) =>
              setTeam(e.target.value)
            }
            className="w-full border rounded p-2"
          >
            {TEAMS.map((t) => (
              <option key={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose}>
            Cancel
          </button>

          <button onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}