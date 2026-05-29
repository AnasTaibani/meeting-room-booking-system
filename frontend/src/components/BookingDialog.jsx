import React, { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { toLocalDateInputValue, toLocalTimeInputValue, combineDateTime } from "@/lib/time";
import { AlertTriangle, Sparkles } from "lucide-react";

function buildInitialForm({ editing, initialRoomId, rooms }) {
  if (editing) {
    const s = new Date(editing.start_time);
    const e = new Date(editing.end_time);
    return {
      room_id: editing.room_id,
      title: editing.title,
      description: editing.description || "",
      date: toLocalDateInputValue(s),
      start_t: toLocalTimeInputValue(s),
      end_t: toLocalTimeInputValue(e),
    };
  }
  const next = new Date(Date.now() + 30 * 60 * 1000);
  next.setMinutes(Math.ceil(next.getMinutes() / 15) * 15, 0, 0);
  const end = new Date(next.getTime() + 60 * 60 * 1000);
  return {
    room_id: initialRoomId || (rooms?.[0]?.id ?? ""),
    title: "",
    description: "",
    date: toLocalDateInputValue(next),
    start_t: toLocalTimeInputValue(next),
    end_t: toLocalTimeInputValue(end),
  };
}

export default function BookingDialog({ open, onOpenChange, rooms, initialRoomId, editing = null, onSaved }) {
  const { user } = useAuth();
  const isEdit = Boolean(editing);

  const [form, setForm] = useState(() => buildInitialForm({ editing, initialRoomId, rooms }));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const wasOpenRef = useRef(open);
  const editingIdRef = useRef(editing?.id ?? null);
  const [acceptedGuidelines, setAcceptedGuidelines] = useState(false);

  useEffect(() => {
    const transitionedToOpen = open && !wasOpenRef.current;
    setAcceptedGuidelines(false);
    const editingTargetChanged = (editing?.id ?? null) !== editingIdRef.current;
    if (transitionedToOpen || (open && editingTargetChanged)) {
      const fresh = buildInitialForm({ editing, initialRoomId, rooms });
      setForm(fresh);
      setError("");
      // eslint-disable-next-line no-console
      console.debug("[BookingDialog] initialized form", { editingId: editing?.id ?? null, fresh });
    }
    wasOpenRef.current = open;
    editingIdRef.current = editing?.id ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  const update = (k, v) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      // eslint-disable-next-line no-console
      console.debug(`[BookingDialog] set ${k}=`, v);
      return next;
    });
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setError("");
    if (!form.room_id) return setError("Please choose a room.");
    if (!form.title.trim()) return setError("Meeting title is required.");
    const start = combineDateTime(form.date, form.start_t);
    const end = combineDateTime(form.date, form.end_t);
    if (end <= start) return setError("End time must be after start time.");
    if (!isEdit && start.getTime() < Date.now() - 60 * 1000) return setError("You cannot book a meeting in the past.");

    const payload = {
      room_id: form.room_id,
      title: form.title.trim(),
      description: form.description.trim(),
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    };
    try {
      setSaving(true);
      if (isEdit) {
        await api.patch(`/bookings/${editing.id}`, payload);
        toast.success("Booking updated", { description: form.title });
      } else {
        await api.post("/bookings", payload);
        toast.success("Booking confirmed", { description: form.title });
      }
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "rounded-lg h-11 transition-all duration-200";
  const inputStyle = { background: "var(--surface-muted)", borderColor: "var(--border)", color: "var(--fg)" };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[580px] w-[calc(100vw-24px)] max-h-[92vh] overflow-y-auto p-0 border-0"
        style={{ background: "var(--bg-elevated)", borderRadius: "20px", boxShadow: "var(--shadow-lg)" }}
        data-testid="booking-dialog"
      >
        <div className="px-5 sm:px-7 pt-6 sm:pt-7 pb-3">
          <DialogHeader>
            <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase font-semibold mb-2" style={{ color: "var(--fg-faint)" }}>
              <Sparkles className="w-3 h-3" /> {isEdit ? "Edit booking" : "New reservation"}
            </div>
            <DialogTitle className="font-display text-[26px] tracking-tight" style={{ color: "var(--fg)" }}>
              {isEdit ? "Update your meeting" : "Reserve a meeting room"}
            </DialogTitle>
            <DialogDescription style={{ color: "var(--fg-muted)" }}>
              Auto-filled with your profile: <span className="font-medium" style={{ color: "var(--fg)" }}>{user?.name}</span> · {user?.team} · {user?.email}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="px-5 sm:px-7 pb-6 sm:pb-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Room">
              <Select value={form.room_id} onValueChange={(v) => update("room_id", v)}>
                <SelectTrigger data-testid="booking-room-select" className={inputCls} style={inputStyle}>
                  <SelectValue placeholder="Choose a room" />
                </SelectTrigger>
                <SelectContent style={{ background: "var(--surface)", borderColor: "var(--border)", borderRadius: "10px" }}>
                  {(rooms || []).map((r) => (
                    <SelectItem
                      key={r.id} value={r.id}
                      data-testid={`booking-room-option-${r.id}`}
                      disabled={r.maintenance}
                      className="rounded-md"
                    >
                      {r.name} {r.maintenance ? " · Maintenance" : ` · ${r.capacity} seats`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Date">
              <Input
                data-testid="booking-date" type="date" value={form.date}
                onChange={(e) => update("date", e.target.value)}
                className={inputCls} style={inputStyle}
                required
              />
            </Field>

            <Field label="Start time">
              <Input
                data-testid="booking-start" type="time" value={form.start_t}
                onChange={(e) => update("start_t", e.target.value)}
                className={inputCls} style={inputStyle}
                required
              />
            </Field>

            <Field label="End time">
              <Input
                data-testid="booking-end" type="time" value={form.end_t}
                onChange={(e) => update("end_t", e.target.value)}
                className={inputCls} style={inputStyle}
                required
              />
            </Field>
          </div>

          <Field label="Meeting title / purpose">
            <Input
              data-testid="booking-title" value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Sprint planning"
              className={inputCls} style={inputStyle}
              required
            />
          </Field>

          <Field label="Description (optional)">
            <Textarea
              data-testid="booking-description" value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Agenda, links, notes..."
              rows={3}
              className="rounded-lg transition-all duration-200"
              style={inputStyle}
            />
          </Field>

          {error && (
            <div data-testid="booking-error" className="flex items-start gap-2 text-[13px] rounded-lg p-3" style={{ color: "var(--status-maintenance-fg)", background: "var(--status-maintenance-bg)", border: "1px solid var(--status-maintenance-bd)" }}>
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Guidelines */}
        <div
          className="rounded-xl p-4 space-y-3 mb-4"
          style={{
            background: "var(--surface-muted)",
            border: "1px solid var(--border)",
          }}
        >
          <h4
            className="text-sm font-semibold"
            style={{ color: "var(--fg)" }}
          >
            Meeting Room Guidelines
          </h4>

          <ul
            className="text-xs space-y-1"
            style={{ color: "var(--fg-soft)" }}
          >
            <li>• Do not exceed your booked duration</li>
            <li>• Leave the room clean after use</li>
            <li>• Switch off lights and equipment before leaving</li>
            <li>• Return markers, remotes and accessories</li>
            <li>• Cancel bookings that are no longer required</li>
            <li>• Report any damages or issues immediately</li>
            <li>• Dispose of food and beverages responsibly</li>
          </ul>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedGuidelines}
              onChange={(e) => setAcceptedGuidelines(e.target.checked)}
              className="mt-0.5"
            />

            <span
              className="text-xs"
              style={{ color: "var(--fg)" }}
            >
              I agree to follow the meeting room guidelines
            </span>
          </label>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            type="button"
            data-testid="booking-cancel"
            onClick={() => onOpenChange(false)}
            className="btn-secondary h-11 px-5"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={saving || !acceptedGuidelines}
            data-testid="booking-submit"
            className="btn-primary h-11 px-5 font-medium"
          >
            {saving
              ? "Saving..."
              : isEdit
              ? "Save changes"
              : "Confirm booking"}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] tracking-[0.18em] uppercase font-semibold" style={{ color: "var(--fg-soft)" }}>{label}</Label>
      {children}
    </div>
  );
}
