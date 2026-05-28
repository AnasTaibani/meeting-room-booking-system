import React from "react";
import {
  Sofa,
  CalendarDays,
  UserRound,
  Wrench,
} from "lucide-react";

const STATUS_MAP = {
  available: {
    label: "AVAILABLE",
    icon: Sofa,
    text: "#d1fae5",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.18)",
    iconColor: "#4ade80",
  },

  booked: {
    label: "BOOKED",
    icon: CalendarDays,
    text: "#dbeafe",
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.18)",
    iconColor: "#60a5fa",
  },

  occupied: {
    label: "OCCUPIED",
    icon: UserRound,
    text: "#fde68a",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.18)",
    iconColor: "#f59e0b",
  },

  maintenance: {
    label: "MAINTENANCE",
    icon: Wrench,
    text: "#fecaca",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.18)",
    iconColor: "#f87171",
  },
};

export default function StatusBadge({
  status,
  className = "",
  "data-testid": tid,
}) {
  const c = STATUS_MAP[status] || STATUS_MAP.available;
  const Icon = c.icon;

  return (
    <div
      data-testid={tid || `status-badge-${status}`}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md ${className}`}
      style={{
        background: c.bg,
        borderColor: c.border,
      }}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center"
        style={{
          background: `${c.iconColor}15`,
        }}
      >
        <Icon
          size={14}
          strokeWidth={2.2}
          color={c.iconColor}
        />
      </div>

      <span
        className="text-[10px] tracking-[0.22em] font-semibold"
        style={{
          color: c.text,
        }}
      >
        {c.label}
      </span>
    </div>
  );
}