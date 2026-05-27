import React, { useEffect, useState, useCallback } from "react";
import Layout from "@/components/Layout";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Pencil, Trash2, Clock3, MapPin, Users, Plus } from "lucide-react";
import { formatRange, durationMinutes } from "@/lib/time";
import StatusBadge from "@/components/StatusBadge";
import BookingDialog from "@/components/BookingDialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [tab, setTab] = useState("upcoming");

  const load = useCallback(async () => {
    try {
      const [{ data: bs }, { data: rs }] = await Promise.all([
        api.get("/bookings", { params: { mine: true } }),
        api.get("/rooms"),
      ]);
      setBookings(bs);
      setRooms(rs);
    } catch (err) {
      console.error("[MyBookings] load failed:", err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (id) => {
    try {
      await api.delete(`/bookings/${id}`);
      toast.success("Booking cancelled");
      load();
    } catch (e) {
      toast.error("Failed to cancel", { description: formatApiError(e) });
    }
  };

  const groups = {
    upcoming: bookings.filter((b) => b.status === "upcoming" || b.status === "active"),
    past: bookings.filter((b) => b.status === "past"),
  };

  return (
    <Layout>
      <div className="max-w-[1100px] mx-auto" data-testid="mybookings-root">
        <div className="flex items-end justify-between mb-8 gap-4 flex-wrap rise">
          <div>
            <div className="text-[10px] tracking-[0.22em] uppercase font-semibold mb-3" style={{ color: "var(--fg-soft)" }}>Your schedule</div>
            <h1 className="font-display text-[34px] sm:text-[44px] lg:text-[54px] tracking-tighter font-medium leading-[0.95]" style={{ color: "var(--fg)" }}>My bookings</h1>
            <p className="mt-3 max-w-xl text-[15px]" style={{ color: "var(--fg-muted)" }}>Edit, cancel, or revisit anything you've booked.</p>
          </div>
          <Button data-testid="new-booking-btn" onClick={() => { setEditing(null); setDialogOpen(true); }} className="btn-primary h-11 px-5 font-medium">
            <Plus className="w-4 h-4 mr-2" /> New booking
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList
            className="rounded-xl p-1 mb-6 h-auto"
            style={{ background: "var(--surface-muted)", border: "1px solid var(--border)" }}
          >
            {[
              { v: "upcoming", l: `Upcoming · ${groups.upcoming.length}`, tid: "tab-upcoming" },
              { v: "past", l: `History · ${groups.past.length}`, tid: "tab-history" },
            ].map((t) => (
              <TabsTrigger
                key={t.v} value={t.v} data-testid={t.tid}
                className="rounded-lg px-4 py-2 text-sm tracking-tight transition-all"
                style={tab === t.v
                  ? { background: "var(--surface)", color: "var(--fg)", boxShadow: "var(--shadow-xs)" }
                  : { color: "var(--fg-soft)" }}
              >{t.l}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="upcoming" className="mt-0">
            <BookingList items={groups.upcoming} emptyText="No upcoming bookings. Plan something." onEdit={(b) => { setEditing(b); setDialogOpen(true); }} onCancel={handleCancel} showActions />
          </TabsContent>
          <TabsContent value="past" className="mt-0">
            <BookingList items={groups.past} emptyText="No past bookings yet." />
          </TabsContent>
        </Tabs>

        <BookingDialog open={dialogOpen} onOpenChange={setDialogOpen} rooms={rooms} editing={editing} onSaved={load} />
      </div>
    </Layout>
  );
}

function BookingList({ items, emptyText, onEdit, onCancel, showActions }) {
  if (!items.length) {
    return (
      <div className="py-12 text-center rounded-xl" style={{ background: "var(--surface-muted)", border: "1px dashed var(--border)" }}>
        <div className="text-[13px]" style={{ color: "var(--fg-soft)" }}>{emptyText}</div>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((b, i) => (
        <li
          key={b.id} data-testid={`booking-row-${b.id}`}
          className="surface rise p-5 flex flex-col md:flex-row md:items-center gap-4 hover:border-strong transition-all"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-3 mb-1">
              <h3 className="font-medium truncate text-[15px]" style={{ color: "var(--fg)" }}>{b.title}</h3>
              <StatusBadge status={b.status} />
            </div>
            <div className="text-[11px] flex flex-wrap items-center gap-x-3 gap-y-1 mt-1" style={{ color: "var(--fg-soft)" }}>
              <span className="flex items-center gap-1"><Clock3 className="w-3 h-3" /> {formatRange(b.start_time, b.end_time)} · {durationMinutes(b.start_time, b.end_time)}m</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {b.room_name}</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {b.user_team}</span>
            </div>
            {b.description && <div className="text-[13px] mt-2 line-clamp-2" style={{ color: "var(--fg-muted)" }}>{b.description}</div>}
          </div>
          {showActions && (
            <div className="flex items-center gap-2">
              <Button data-testid={`edit-${b.id}`} onClick={() => onEdit(b)} className="btn-secondary h-9 px-3 text-xs">
                <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    data-testid={`cancel-${b.id}`}
                    className="h-9 px-3 text-xs rounded-lg transition-all"
                    style={{ background: "var(--status-maintenance-bg)", border: "1px solid var(--status-maintenance-bd)", color: "var(--status-maintenance-fg)" }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Cancel
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent style={{ background: "var(--bg-elevated)", borderColor: "var(--border)", borderRadius: "16px", boxShadow: "var(--shadow-lg)" }}>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-display tracking-tight" style={{ color: "var(--fg)" }}>Cancel this booking?</AlertDialogTitle>
                    <AlertDialogDescription style={{ color: "var(--fg-muted)" }}>"{b.title}" will be removed from the schedule. This cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="btn-secondary h-10 px-4" data-testid={`cancel-cancel-${b.id}`}>Keep booking</AlertDialogCancel>
                    <AlertDialogAction
                      data-testid={`cancel-confirm-${b.id}`}
                      onClick={() => onCancel(b.id)}
                      className="h-10 px-4 rounded-lg font-medium"
                      style={{ background: "var(--status-maintenance-fg)", color: "white" }}
                    >
                      Cancel booking
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
