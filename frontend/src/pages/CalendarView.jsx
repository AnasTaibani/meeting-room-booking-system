import React, { useEffect, useMemo, useState, useCallback } from "react";
import Layout from "@/components/Layout";
import api from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import BookingDialog from "@/components/BookingDialog";
import { addDays, startOfWeek, isSameDay, startOfMonth, endOfMonth } from "@/lib/time";

const ROOM_TONES = {
  "room-1": "#0A0A0A",
  "room-2": "#57534E",
  "room-3": "#78716C",
};
const HOURS = Array.from({ length: 13 }, (_, i) => 7 + i);

export default function CalendarView() {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [view, setView] = useState("week");
  const [anchor, setAnchor] = useState(new Date());
  const [roomFilter, setRoomFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [initialRoomId, setInitialRoomId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [{ data: bs }, { data: rs }] = await Promise.all([
        api.get("/bookings"), api.get("/rooms"),
      ]);
      setBookings(bs); setRooms(rs);
    } catch (err) {
      console.error("[CalendarView] load failed:", err);
    }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);

  const filtered = useMemo(
    () => bookings.filter((b) => roomFilter === "all" || b.room_id === roomFilter),
    [bookings, roomFilter]
  );

  const inputStyle = { background: "var(--surface-muted)", borderColor: "var(--border)", color: "var(--fg)" };

  return (
    <Layout>
      <div className="max-w-[1400px] mx-auto" data-testid="calendar-root">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8 rise">
          <div>
            <div className="text-[10px] tracking-[0.22em] uppercase font-semibold mb-3" style={{ color: "var(--fg-soft)" }}>Schedule</div>
            <h1 className="font-display text-[34px] sm:text-[44px] lg:text-[54px] tracking-tighter font-medium leading-[0.95]" style={{ color: "var(--fg)" }}>Calendar</h1>
            <p className="mt-3 text-[15px]" style={{ color: "var(--fg-muted)" }}>Daily, weekly, and monthly view across every meeting room.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={roomFilter} onValueChange={setRoomFilter}>
              <SelectTrigger className="rounded-lg h-10 w-[200px]" style={inputStyle} data-testid="calendar-room-filter">
                <SelectValue placeholder="All rooms" />
              </SelectTrigger>
              <SelectContent style={{ background: "var(--surface)", borderColor: "var(--border)", borderRadius: "10px" }}>
                <SelectItem value="all" data-testid="filter-all">All rooms</SelectItem>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id} data-testid={`filter-${r.id}`}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button data-testid="calendar-new-btn" onClick={() => { setEditing(null); setInitialRoomId(roomFilter === "all" ? null : roomFilter); setDialogOpen(true); }} className="btn-primary h-10 px-4 font-medium">
              <Plus className="w-4 h-4 mr-2" /> Book
            </Button>
          </div>
        </div>

        <Tabs value={view} onValueChange={setView}>
          <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
            <TabsList className="rounded-xl p-1 h-auto" style={{ background: "var(--surface-muted)", border: "1px solid var(--border)" }}>
              {["day", "week", "month"].map((v) => (
                <TabsTrigger
                  key={v} value={v} data-testid={`view-${v}`}
                  className="rounded-lg px-4 py-1.5 capitalize text-sm transition-all"
                  style={view === v
                    ? { background: "var(--accent)", color: "var(--accent-fg)", boxShadow: "var(--shadow-xs)" }
                    : { color: "var(--fg-soft)" }}
                >{v}</TabsTrigger>
              ))}
            </TabsList>
            <CalendarNav view={view} anchor={anchor} setAnchor={setAnchor} />
          </div>

          <TabsContent value="day" className="mt-0">
            <div className="overflow-x-auto -mx-2 px-2">
              <DayView date={anchor} bookings={filtered} onSelect={(b) => { setEditing(b); setDialogOpen(true); }} />
            </div>
          </TabsContent>
          <TabsContent value="week" className="mt-0">
            <div className="overflow-x-auto -mx-2 px-2">
              <div className="min-w-[860px]">
                <WeekView anchor={anchor} bookings={filtered} onSelect={(b) => { setEditing(b); setDialogOpen(true); }} />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="month" className="mt-0">
            <div className="overflow-x-auto -mx-2 px-2">
              <div className="min-w-[760px]">
                <MonthView anchor={anchor} bookings={filtered} setView={setView} setAnchor={setAnchor} />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex items-center gap-4 flex-wrap text-[11px]" style={{ color: "var(--fg-soft)" }}>
          {rooms.map((r) => (
            <span key={r.id} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: ROOM_TONES[r.id] || "var(--fg)" }} />
              {r.name}
            </span>
          ))}
        </div>

        <BookingDialog open={dialogOpen} onOpenChange={setDialogOpen} rooms={rooms} editing={editing} initialRoomId={initialRoomId} onSaved={load} />
      </div>
    </Layout>
  );
}

function CalendarNav({ view, anchor, setAnchor }) {
  const step = (dir) => {
    if (view === "day") setAnchor(addDays(anchor, dir));
    else if (view === "week") setAnchor(addDays(anchor, dir * 7));
    else setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1));
  };
  let label = "";
  if (view === "day") label = anchor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  else if (view === "week") {
    const s = startOfWeek(anchor); const e = addDays(s, 6);
    label = `${s.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${e.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  } else label = anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="flex items-center gap-1.5">
      <Button data-testid="cal-prev" onClick={() => step(-1)} className="btn-secondary h-9 w-9 p-0">
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <Button data-testid="cal-today" onClick={() => setAnchor(new Date())} className="btn-secondary h-9 px-3 text-xs tracking-wider uppercase">Today</Button>
      <Button data-testid="cal-next" onClick={() => step(1)} className="btn-secondary h-9 w-9 p-0">
        <ChevronRight className="w-4 h-4" />
      </Button>
      <div className="text-[13px] font-display tracking-tight ml-3 min-w-[200px]" data-testid="cal-label" style={{ color: "var(--fg)" }}>{label}</div>
    </div>
  );
}

function bookingsForDay(bookings, day) {
  return bookings.filter((b) => isSameDay(new Date(b.start_time), day));
}

function DayView({ date, bookings, onSelect }) {
  const items = bookingsForDay(bookings, date).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  return (
    <div className="rounded-xl overflow-hidden grid grid-cols-[80px_1fr]" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div>
        {HOURS.map((h) => (
          <div key={`d-hr-${h}`} className="h-16 border-b text-[10px] tracking-[0.18em] uppercase font-semibold px-3 pt-2" style={{ borderColor: "var(--divider)", color: "var(--fg-faint)" }}>
            {`${h}:00`}
          </div>
        ))}
      </div>
      <div className="relative">
        {HOURS.map((h) => (
          <div key={`d-cell-${h}`} className="h-16 border-b" style={{ borderColor: "var(--divider)" }} />
        ))}
        {items.map((b) => <TimelineItem key={b.id} b={b} onClick={() => onSelect(b)} />)}
        {items.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-[13px]" style={{ color: "var(--fg-faint)" }}>No bookings on this day.</div>
        )}
      </div>
    </div>
  );
}

function TimelineItem({ b, onClick }) {
  const s = new Date(b.start_time); const e = new Date(b.end_time);
  const startMin = s.getHours() * 60 + s.getMinutes();
  const endMin = e.getHours() * 60 + e.getMinutes();
  const dayStart = HOURS[0] * 60; const dayEnd = (HOURS[HOURS.length - 1] + 1) * 60;
  const clampedStart = Math.max(startMin, dayStart);
  const clampedEnd = Math.min(endMin, dayEnd);
  if (clampedEnd <= clampedStart) return null;
  const totalMin = dayEnd - dayStart;
  const top = ((clampedStart - dayStart) / totalMin) * 100;
  const height = ((clampedEnd - clampedStart) / totalMin) * 100;
  const tone = ROOM_TONES[b.room_id] || "var(--fg)";
  return (
    <button
      data-testid={`tl-${b.id}`}
      onClick={onClick}
      className="absolute left-0 right-0 mx-1.5 text-left px-3 py-2 text-xs rounded-md transition-all hover:scale-[1.01]"
      style={{
        top: `${top}%`, height: `${Math.max(height, 5)}%`,
        background: "var(--surface-muted)",
        borderLeft: `3px solid ${tone}`,
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <div className="font-medium truncate" style={{ color: "var(--fg)" }}>{b.title}</div>
      <div className="text-[10px] truncate" style={{ color: "var(--fg-muted)" }}>{b.room_name} · {s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}–{e.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</div>
      <div className="text-[10px] truncate" style={{ color: "var(--fg-soft)" }}>{b.user_name}</div>
    </button>
  );
}

function WeekView({ anchor, bookings, onSelect }) {
  const monday = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="grid grid-cols-[80px_repeat(7,1fr)]" style={{ background: "var(--surface-muted)", borderBottom: "1px solid var(--border)" }}>
        <div />
        {days.map((d) => (
          <div key={d.toISOString()} className="px-3 py-2.5 text-[10px] tracking-[0.18em] uppercase font-semibold" style={{ borderLeft: "1px solid var(--divider)", color: "var(--fg-soft)" }}>
            <div>{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
            <div className={`text-base font-display ${isSameDay(d, new Date()) ? "" : ""}`} style={{ color: isSameDay(d, new Date()) ? "var(--fg)" : "var(--fg-faint)" }}>{d.getDate()}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[80px_repeat(7,1fr)]">
        <div>
          {HOURS.map((h) => (
            <div key={`wk-l-${h}`} className="h-14 border-b text-[10px] tracking-[0.18em] uppercase font-semibold px-3 pt-1.5" style={{ borderColor: "var(--divider)", color: "var(--fg-faint)" }}>{`${h}:00`}</div>
          ))}
        </div>
        {days.map((d) => {
          const items = bookingsForDay(bookings, d).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
          return (
            <div key={d.toISOString()} className="relative" style={{ borderLeft: "1px solid var(--divider)", minHeight: HOURS.length * 56 }}>
              {HOURS.map((h) => (<div key={`wk-hr-${d.toISOString()}-${h}`} className="h-14 border-b" style={{ borderColor: "var(--divider)" }} />))}
              {items.map((b) => <TimelineItem key={b.id} b={b} onClick={() => onSelect(b)} />)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthView({ anchor, bookings, setView, setAnchor }) {
  const first = startOfMonth(anchor);
  const last = endOfMonth(anchor);
  const leadStart = startOfWeek(first);
  const days = [];
  let d = new Date(leadStart);
  while (d <= last || d.getDay() !== 1 || days.length < 35) {
    days.push(new Date(d));
    d = addDays(d, 1);
    if (days.length > 42) break;
  }
  const today = new Date();
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="grid grid-cols-7" style={{ background: "var(--surface-muted)", borderBottom: "1px solid var(--border)" }}>
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((w) => (
          <div key={w} className="px-3 py-2.5 text-[10px] tracking-[0.18em] uppercase font-semibold" style={{ borderLeft: "1px solid var(--divider)", color: "var(--fg-soft)" }}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const items = bookingsForDay(bookings, day);
          const inMonth = day.getMonth() === anchor.getMonth();
          const isToday = isSameDay(day, today);
          return (
            <button
              key={day.toISOString()}
              data-testid={`month-day-${day.toISOString().slice(0, 10)}`}
              onClick={() => { setAnchor(day); setView("day"); }}
              className="text-left p-2 min-h-[120px] transition-all"
              style={{
                borderLeft: "1px solid var(--divider)",
                borderTop: "1px solid var(--divider)",
                background: inMonth ? "var(--surface)" : "var(--surface-muted)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-muted)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = inMonth ? "var(--surface)" : "var(--surface-muted)"; }}
            >
              <div className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 mb-1 text-[12px] font-display rounded-full"
                style={isToday
                  ? { background: "var(--accent)", color: "var(--accent-fg)", fontWeight: 600 }
                  : { color: inMonth ? "var(--fg)" : "var(--fg-faint)" }}
              >
                {day.getDate()}
              </div>
              <div className="space-y-1">
                {items.slice(0, 3).map((b) => (
                  <div key={b.id} className="text-[10px] px-1.5 py-0.5 truncate rounded-sm" style={{ background: "var(--surface-muted)", color: "var(--fg-muted)", borderLeft: `2px solid ${ROOM_TONES[b.room_id] || "var(--fg)"}` }}>
                    {new Date(b.start_time).toLocaleTimeString(undefined, { hour: "numeric" })} {b.title}
                  </div>
                ))}
                {items.length > 3 && <div className="text-[10px] px-1.5" style={{ color: "var(--fg-faint)" }}>+ {items.length - 3} more</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
