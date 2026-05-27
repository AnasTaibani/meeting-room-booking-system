import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Zap, AlertTriangle } from "lucide-react";

const DURATIONS = [15, 30, 45, 60, 90];
const CAPACITIES = [
  { value: 1,  label: "Just me" },
  { value: 4,  label: "Small (≤4)" },
  { value: 8,  label: "Medium (≤8)" },
  { value: 12, label: "Large (≤12)" },
];

export default function FindRoomDialog({ open, onOpenChange, onBooked }) {
  const [duration, setDuration] = useState(30);
  const [minCapacity, setMinCapacity] = useState(4);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => { setTitle(""); setError(""); setBusy(false); };

  const submit = async (ev) => {
    ev.preventDefault();
    setError("");
    if (!title.trim()) return setError("Give your meeting a quick title.");
    try {
      setBusy(true);
      const { data } = await api.post("/bookings/find-and-book", {
        duration_minutes: duration,
        min_capacity: minCapacity,
        title: title.trim(),
        description: "",
      });
      toast.success(`Booked ${data.room_name}`, { description: `${duration} min · starting now` });
      onBooked?.();
      onOpenChange(false);
      reset();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const Chip = ({ active, onClick, children, testid }) => (
    <button
      type="button"
      data-testid={testid}
      onClick={onClick}
      className="px-3 py-2.5 text-sm rounded-lg border transition-all duration-200 text-center"
      style={{
        background: active ? "var(--accent)" : "var(--surface-muted)",
        color: active ? "var(--accent-fg)" : "var(--fg-muted)",
        borderColor: active ? "var(--accent)" : "var(--border)",
        transform: active ? "scale(1.02)" : "scale(1)",
        boxShadow: active ? "var(--shadow-sm)" : "none",
      }}
    >
      {children}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent
        className="sm:max-w-[480px] w-[calc(100vw-24px)] max-h-[92vh] overflow-y-auto p-0 border-0"
        style={{ background: "var(--bg-elevated)", borderRadius: "20px", boxShadow: "var(--shadow-lg)" }}
        data-testid="findroom-dialog"
      >
        <div className="px-5 sm:px-7 pt-6 sm:pt-7 pb-3">
          <DialogHeader>
            <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase font-semibold mb-2" style={{ color: "var(--fg-faint)" }}>
              <Zap className="w-3 h-3" /> Smart finder
            </div>
            <DialogTitle className="font-display text-[26px] tracking-tight" style={{ color: "var(--fg)" }}>Find me a room now</DialogTitle>
            <DialogDescription style={{ color: "var(--fg-muted)" }}>
              We'll grab the first available room and book it instantly.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={submit} className="px-5 sm:px-7 pb-6 sm:pb-7 space-y-5">
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-[0.18em] uppercase font-semibold" style={{ color: "var(--fg-soft)" }}>Title</Label>
            <Input
              data-testid="findroom-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Quick sync"
              className="rounded-lg h-11"
              style={{ background: "var(--surface-muted)", borderColor: "var(--border)", color: "var(--fg)" }}
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] tracking-[0.18em] uppercase font-semibold" style={{ color: "var(--fg-soft)" }}>Duration</Label>
            <div className="grid grid-cols-5 gap-2" data-testid="findroom-durations">
              {DURATIONS.map((d) => (
                <Chip key={d} active={duration === d} onClick={() => setDuration(d)} testid={`findroom-duration-${d}`}>{d}m</Chip>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] tracking-[0.18em] uppercase font-semibold" style={{ color: "var(--fg-soft)" }}>Team size</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="findroom-capacity">
              {CAPACITIES.map((c) => (
                <Chip key={c.value} active={minCapacity === c.value} onClick={() => setMinCapacity(c.value)} testid={`findroom-capacity-${c.value}`}>{c.label}</Chip>
              ))}
            </div>
          </div>

          {error && (
            <div data-testid="findroom-error" className="flex items-start gap-2 text-[13px] rounded-lg p-3" style={{ color: "var(--status-maintenance-fg)", background: "var(--status-maintenance-bg)", border: "1px solid var(--status-maintenance-bd)" }}>
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" data-testid="findroom-cancel" onClick={() => onOpenChange(false)} className="btn-secondary h-11 px-5">Cancel</Button>
            <Button type="submit" disabled={busy} data-testid="findroom-submit" className="btn-primary h-11 px-5 font-medium">
              <Zap className="w-4 h-4 mr-2" />
              {busy ? "Searching..." : "Find & book"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
