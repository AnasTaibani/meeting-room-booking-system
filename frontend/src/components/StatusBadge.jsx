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
    text: "var(--status-available-fg)",
    bg: "var(--status-available-bg)",
    border: "var(--status-available-bd)",
    iconColor: "var(--status-available-fg)",
  },

  booked: {
    label: "BOOKED",
    icon: CalendarDays,
    text: "var(--status-booked-fg)",
    bg: "var(--status-booked-bg)",
    border: "var(--status-booked-bd)",
    iconColor: "var(--status-booked-fg)",
  },

  occupied: {
    label: "OCCUPIED",
    icon: UserRound,
    text: "var(--status-occupied-fg)",
    bg: "var(--status-occupied-bg)",
    border: "var(--status-occupied-bd)",
    iconColor: "var(--status-occupied-fg)",
  },

  maintenance: {
    label: "MAINTENANCE",
    icon: Wrench,
    text: "var(--status-maintenance-fg)",
    bg: "var(--status-maintenance-bg)",
    border: "var(--status-maintenance-bd)",
    iconColor: "var(--status-maintenance-fg)",
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
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${className}`}
      style={{
        background: c.bg,
        borderColor: c.border,
      }}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center"
        style={{
          background: c.bg,
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