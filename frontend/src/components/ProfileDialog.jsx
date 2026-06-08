import { useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const TEAMS = [
  "ACE UAE",
  "AI & Data Science",
  "Capacity Building",
  "Founder's Office",
  "HR & Admin",
  "Management",
  "Manulife Hong Kong",
  "Manulife Vietnam",
  "PMLI India",
  "Pre-Sales",
  "Product & Platform",
  "DevOps",
  "InsurConnect",
  "Prudential Indonesia",
  "Prudential Singapore",
  "SBIL India",
  "Sales & Marketing",
  "Shared Functions",
  "Sun Life Hong Kong",
  "Sun Life Malaysia",
  "Sun Life India",
  "Sun Life Vietnam"
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
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div
      className="w-[440px] overflow-hidden rounded-2xl border shadow-2xl"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-6 py-5"
        style={{
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold"
          style={{
            background: "var(--accent)",
            color: "var(--accent-fg)",
          }}
        >
          {(user?.name || "U")
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </div>

        <div>
          <div
            className="text-sm font-semibold"
            style={{ color: "var(--fg)" }}
          >
            Edit Profile
          </div>

          <div
            className="text-xs"
            style={{ color: "var(--fg-soft)" }}
          >
            Update your team preferences
          </div>
        </div>

        <button
          onClick={onClose}
          className="ml-auto text-lg"
          style={{ color: "var(--fg-soft)" }}
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="space-y-4 px-6 py-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              className="mb-1 block text-xs font-medium"
              style={{ color: "var(--fg-soft)" }}
            >
              Name
            </label>

            <input
              value={user?.name || ""}
              disabled
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{
                background: "var(--surface-muted)",
                borderColor: "var(--border)",
                color: "var(--fg-soft)",
              }}
            />
          </div>

          <div>
            <label
              className="mb-1 block text-xs font-medium"
              style={{ color: "var(--fg-soft)" }}
            >
              Email
            </label>

            <input
              value={user?.email || ""}
              disabled
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{
                background: "var(--surface-muted)",
                borderColor: "var(--border)",
                color: "var(--fg-soft)",
              }}
            />
          </div>
        </div>

        <div>
          <label
            className="mb-1 block text-xs font-medium"
            style={{ color: "var(--fg-soft)" }}
          >
            Role
          </label>

          <input
            value={user?.role || ""}
            disabled
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{
              background: "var(--surface-muted)",
              borderColor: "var(--border)",
              color: "var(--fg-soft)",
            }}
          />
        </div>

        <div>
          <label
            className="mb-1 block text-xs font-medium"
            style={{ color: "var(--fg-soft)" }}
          >
            Team
          </label>

          <select
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              color: "var(--fg)",
            }}
          >
            {TEAMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <p
            className="mt-2 text-xs"
            style={{ color: "var(--fg-faint)" }}
          >
            Name and email are managed through Microsoft authentication.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex justify-end gap-2 px-6 py-4"
        style={{
          borderTop: "1px solid var(--border)",
        }}
      >
        <button
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm"
          style={{
            border: "1px solid var(--border)",
            color: "var(--fg-soft)",
          }}
        >
          Cancel
        </button>

        <button
          onClick={save}
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{
            background: "var(--accent)",
            color: "var(--accent-fg)",
          }}
        >
          Save Changes
        </button>
      </div>
    </div>
  </div>
);

}

