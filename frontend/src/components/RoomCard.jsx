import React from "react";
import StatusBadge from "@/components/StatusBadge";
import { Users, ArrowUpRight } from "lucide-react";
import { formatRange } from "@/lib/time";

const ROOM_INITIAL = {
  "room-1": "M1",
  "room-2": "M2",
  "room-3": "BR",
};

export default function RoomCard({ room, onBook,onReportIssue, animateDelay = 0 }) {
  const status = room.status || "available";
  const disabled = status === "maintenance";

  return (
    <div
      data-testid={`room-card-${room.id}`}
      className="surface surface-lift rise group relative overflow-hidden"
      style={{ animationDelay: `${animateDelay}ms` }}
    >
      {/* Hero with monogram */}
      <div className="room-hero relative h-28 flex items-center justify-between px-6 overflow-hidden">
        <div
          className="font-display font-bold leading-none select-none"
          style={{
            fontSize: 76,
            letterSpacing: "-0.06em",
            color: "var(--fg)",
            opacity: 0.06,
          }}
        >
          {ROOM_INITIAL[room.id] || room.name.charAt(0)}
        </div>
        <div className="absolute top-4 left-5">
          <StatusBadge status={status} data-testid={`room-status-${room.id}`} />
        </div>
        {status === "occupied" && (
          <div className="absolute top-4 right-5 flex items-center gap-1.5">
            <span className="live-dot" />
            <span className="text-[10px] tracking-[0.18em] uppercase font-semibold" style={{ color: "var(--status-occupied-fg)" }}>Live</span>
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col" style={{ minHeight: "180px" }}>
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-display text-[19px] tracking-tight" style={{ color: "var(--fg)" }}>{room.name}</h3>
          <div className="chip">
            <Users className="w-3 h-3" /> {room.capacity}
          </div>
        </div>
        <p className="text-[13px] leading-relaxed mb-4 line-clamp-2" style={{ color: "var(--fg-muted)" }}>{room.description}</p>

        <div className="mt-auto space-y-3">
          {room.current_booking ? (
            <Meta label="Right now" title={room.current_booking.title} sub={formatRange(room.current_booking.start_time, room.current_booking.end_time)} accent />
          ) : room.next_booking ? (
            <Meta label="Up next" title={room.next_booking.title} sub={formatRange(room.next_booking.start_time, room.next_booking.end_time)} />
          ) : disabled ? (
            <Meta label="Status" title="Under maintenance" sub="Bookings disabled" />
          ) : (
            <Meta label="Today" title="Open all day" sub="No meetings scheduled" />
          )}

        <button
            data-testid={`book-room-${room.id}`}
            onClick={() => onBook?.(room)}
            disabled={disabled}
            className="btn-primary sheen w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium disabled:hover:translate-y-0">
            <span>Book this room</span>
            <ArrowUpRight className="w-4 h-4 transition-transform duration-200 group-hover:rotate-12" />
          </button>
        </div>
        </div>
      </div>
  );
}

function Meta({ label, title, sub, accent = false }) {
  return (
    <div
      className="rounded-lg px-3 py-2.5"
      style={{
        background: "var(--surface-muted)",
        borderLeft: `2px solid ${accent ? "var(--status-occupied-fg)" : "var(--border-strong)"}`,
      }}
    >
      <div className="text-[9px] tracking-[0.22em] uppercase font-semibold mb-0.5" style={{ color: "var(--fg-faint)" }}>{label}</div>
      <div className="text-[13px] font-medium leading-tight truncate" style={{ color: "var(--fg)" }}>{title}</div>
      <div className="text-[11px] mt-0.5 truncate" style={{ color: "var(--fg-soft)" }}>{sub}</div>
    </div>
  );
}
