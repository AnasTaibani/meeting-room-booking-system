import React from "react";

const STATUS_MAP = {
  available:   { label: "Available",   fgVar: "--status-available-fg",   bgVar: "--status-available-bg",   bdVar: "--status-available-bd" },
  booked:      { label: "Booked",      fgVar: "--status-booked-fg",      bgVar: "--status-booked-bg",      bdVar: "--status-booked-bd" },
  occupied:    { label: "Occupied",    fgVar: "--status-occupied-fg",    bgVar: "--status-occupied-bg",    bdVar: "--status-occupied-bd" },
  maintenance: { label: "Maintenance", fgVar: "--status-maintenance-fg", bgVar: "--status-maintenance-bg", bdVar: "--status-maintenance-bd" },
  upcoming:    { label: "Upcoming",    fgVar: "--status-booked-fg",      bgVar: "--status-booked-bg",      bdVar: "--status-booked-bd" },
  active:      { label: "In Progress", fgVar: "--status-occupied-fg",    bgVar: "--status-occupied-bg",    bdVar: "--status-occupied-bd" },
  past:        { label: "Completed",   fgVar: "--fg-soft",               bgVar: "--surface-muted",         bdVar: "--border" },
  cancelled:   { label: "Cancelled",   fgVar: "--fg-faint",              bgVar: "--surface-muted",         bdVar: "--border" },
};

export default function StatusBadge({ status, className = "", showDot = true, "data-testid": tid }) {
  const c = STATUS_MAP[status] || STATUS_MAP.available;
  return (
    <span
      data-testid={tid || `status-badge-${status}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase font-semibold rounded-full border ${className}`}
      style={{
        color: `var(${c.fgVar})`,
        backgroundColor: `var(${c.bgVar})`,
        borderColor: `var(${c.bdVar})`,
      }}
    >
      {showDot && (
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: `var(${c.fgVar})` }} />
      )}
      {c.label}
    </span>
  );
}
