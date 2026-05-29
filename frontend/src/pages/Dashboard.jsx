import React, { useEffect, useMemo, useState, useCallback } from "react";
import Layout from "@/components/Layout";
import RoomCard from "@/components/RoomCard";
import BookingDialog from "@/components/BookingDialog";
import FindRoomDialog from "@/components/FindRoomDialog";
import StatusBadge from "@/components/StatusBadge";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Plus,
  CalendarClock,
  Clock3,
  Users,
  Zap,
  Activity,
  Sofa,
  CalendarDays,
  UserRound,
  Wrench,
} from "lucide-react";
import { formatRange } from "@/lib/time";

export default function Dashboard() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [findRoomOpen, setFindRoomOpen] = useState(false);
  const [initialRoomId, setInitialRoomId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [{ data: roomsData }, { data: bookingsData }] = await Promise.all([
        api.get("/rooms/status"),
        api.get("/bookings"),
      ]);
      setRooms(roomsData);
      const now = Date.now();
      setUpcoming(
        bookingsData
          .filter((b) => new Date(b.end_time).getTime() > now)
          .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
          .slice(0, 6)
      );
    } catch (err) {
      console.error("[Dashboard] load failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const counts = useMemo(() => {
    const c = { available: 0, booked: 0, occupied: 0, maintenance: 0 };
    rooms.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [rooms]);

  const greet = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <Layout>
      <div className="max-w-[1400px] mx-auto" data-testid="dashboard-root">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 rise">
          <div>
            <div className="text-[10px] tracking-[0.22em] uppercase font-semibold mb-3" style={{ color: "var(--fg-soft)" }}>
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </div>
            <h1 className="font-display text-[34px] sm:text-[44px] lg:text-[54px] tracking-tighter font-medium leading-[0.95]" style={{ color: "var(--fg)" }}>
              {greet}, <span style={{ color: "var(--fg-muted)" }}>{user?.name?.split(" ")[0]}.</span>
            </h1>
            <p className="mt-3 max-w-xl text-[15px]" style={{ color: "var(--fg-muted)" }}>
              Three rooms. Real-time status. One tap to reserve.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto w-full md:w-auto">
            <Button data-testid="find-room-btn" onClick={() => setFindRoomOpen(true)} className="btn-secondary h-11 px-4 flex-1 md:flex-none">
              <Zap className="w-4 h-4 mr-2" /> Find me a room
            </Button>
            <Button data-testid="quick-book-btn" onClick={() => { setInitialRoomId(null); setDialogOpen(true); }} className="btn-primary h-11 px-4 flex-1 md:flex-none font-medium">
              <Plus className="w-4 h-4 mr-2" /> Quick book
            </Button>
          </div>
        </div>

        {/* Stats strip */}
       
        {/* Rooms */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-[10px] tracking-[0.22em] uppercase font-semibold mb-1" style={{ color: "var(--fg-soft)" }}>Live</div>
            <h2 className="font-display text-[22px] tracking-tight" style={{ color: "var(--fg)" }}>Room availability</h2>
          </div>
          <div className="hidden md:flex items-center text-[11px] gap-1.5" style={{ color: "var(--fg-soft)" }}>
            <Activity className="w-3 h-3" /> Refreshing every 15s
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12" data-testid="rooms-grid">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={`skl-${i}`} />)
            : rooms.map((r, i) => (
                <RoomCard
                  key={r.id}
                  room={r}
                  animateDelay={i * 80}
                  onBook={(room) => { setInitialRoomId(room.id); setDialogOpen(true); }}
                />
              ))}
        </div>

        {/* Upcoming meetings + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 surface p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-[10px] tracking-[0.22em] uppercase font-semibold mb-1" style={{ color: "var(--fg-soft)" }}>Schedule</div>
                <h3 className="font-display text-[19px] tracking-tight" style={{ color: "var(--fg)" }}>Upcoming & active meetings</h3>
              </div>
              <CalendarClock className="w-4 h-4" style={{ color: "var(--fg-soft)" }} />
            </div>
            {upcoming.length === 0 ? (
              <EmptyState text="No upcoming meetings. The day is yours." />
            ) : (
              <ul className="space-y-1">
                {upcoming.map((b) => (
                  <li
                    key={b.id}
                    data-testid={`upcoming-${b.id}`}
                    className="group flex items-start gap-4 px-3 py-3 rounded-lg transition-colors"
                    style={{ background: "transparent" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-muted)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <div className="w-1 h-12 rounded-full mt-1" style={{ background: b.status === "active" ? "var(--status-occupied-fg)" : "var(--border-strong)" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="font-medium truncate text-[14px]" style={{ color: "var(--fg)" }}>{b.title}</div>
                        <StatusBadge status={b.status} />
                      </div>
                      <div className="text-[11px] mt-1 flex flex-wrap items-center gap-x-3 gap-y-1" style={{ color: "var(--fg-soft)" }}>
                        <span className="flex items-center gap-1"><Clock3 className="w-3 h-3" /> {formatRange(b.start_time, b.end_time)}</span>
                        <span>· {b.room_name}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {b.user_name} · {b.user_team}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="surface p-6">
            <div className="text-[10px] tracking-[0.22em] uppercase font-semibold mb-1" style={{ color: "var(--fg-soft)" }}>Right now</div>
            <h3 className="font-display text-[19px] tracking-tight mb-4" style={{ color: "var(--fg)" }}>Activity pulse</h3>
            <div className="space-y-1">
              {rooms.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors"
                  data-testid={`pulse-${r.id}`}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-muted)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div>
                    <div className="text-[13px] font-medium" style={{ color: "var(--fg)" }}>{r.name}</div>
                    <div className="text-[11px]" style={{ color: "var(--fg-soft)" }}>{r.capacity} seats</div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <BookingDialog open={dialogOpen} onOpenChange={setDialogOpen} rooms={rooms} initialRoomId={initialRoomId} onSaved={load} />
        <FindRoomDialog open={findRoomOpen} onOpenChange={setFindRoomOpen} onBooked={load} />
      </div>
    </Layout>
  );
}

function StatTile({
  colorVar,
  label,
  value,
  testid,
  loading,
  delay = 0,
  icon,
}) {
  const Icon = icon;

  return (
    <div
      data-testid={testid}
      className="surface surface-lift rise p-6 flex items-center justify-between overflow-hidden relative"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div>
        <div
          className="text-[11px] tracking-[0.24em] uppercase font-semibold mb-3"
          style={{ color: "var(--fg-soft)" }}
        >
          {label}
        </div>

        {loading ? (
          <div className="skeleton h-8 w-12" />
        ) : (
          <div
            className="font-display text-[52px] leading-none tracking-tight"
            style={{ color: "var(--fg)" }}
          >
            {value}
          </div>
        )}
      </div>

      <div
  className="
    w-[19vw] h-[19vw]
    max-w-[96px] max-h-[96px]
    min-w-[64px] min-h-[64px]
    rounded-[24px]
    flex items-center justify-center
    shrink-0
  "
  style={{
    background: `color-mix(in srgb, var(${colorVar}) 14%, transparent)`,
  }}
>
  <Icon
    className="
      w-[8vw] h-[8vw]
      max-w-[42px] max-h-[42px]
      min-w-[26px] min-h-[26px]
    "
    strokeWidth={1.8}
    style={{
      color: `var(${colorVar})`,
    }}
  />
</div>
    </div>
  );
}
function SkeletonCard() {
  return (
    <div className="surface p-0 overflow-hidden">
      <div className="skeleton h-28" />
      <div className="p-5 space-y-3">
        <div className="skeleton h-5 w-2/3" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton h-10 w-full mt-4" />
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="py-10 text-center rounded-xl" style={{ background: "var(--surface-muted)", border: "1px dashed var(--border)" }}>
      <div className="text-[13px]" style={{ color: "var(--fg-soft)" }}>{text}</div>
    </div>
  );
}
