import React, { useEffect, useState, useCallback } from "react";
import Layout from "@/components/Layout";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Trash2, ShieldCheck, BarChart3, Users as UsersIcon, Wrench } from "lucide-react";
import { formatRange } from "@/lib/time";
import StatusBadge from "@/components/StatusBadge";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, CartesianGrid } from "recharts";

export default function AdminPanel() {
  const [tab, setTab] = useState("overview");
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const load = useCallback(async () => {
    try {
      const [{ data: rs }, { data: bs }, { data: us }, { data: an }] = await Promise.all([
        api.get("/rooms"),
        api.get("/admin/bookings"),
        api.get("/admin/users"),
        api.get("/admin/analytics"),
      ]);
      setRooms(rs); setBookings(bs); setUsers(us); setAnalytics(an);
    } catch (err) {
      console.error("[AdminPanel] load failed:", err);
    }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);

  const toggleMaintenance = async (room, value) => {
    try {
      await api.patch(`/admin/rooms/${room.id}/maintenance`, { maintenance: value });
      toast.success(`${room.name} → ${value ? "Maintenance" : "Active"}`);
      load();
    } catch (e) {
      toast.error("Failed", { description: formatApiError(e) });
    }
  };

  const overrideCancel = async (id) => {
    try {
      await api.delete(`/bookings/${id}`);
      toast.success("Booking removed");
      load();
    } catch (e) {
      toast.error("Failed", { description: formatApiError(e) });
    }
  };

  return (
    <Layout>
      <div className="max-w-[1400px] mx-auto" data-testid="admin-root">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4 rise">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase font-semibold mb-3" style={{ color: "var(--fg-soft)" }}>
              <ShieldCheck className="w-3 h-3" /> Admin
            </div>
            <h1 className="font-display text-[34px] sm:text-[44px] lg:text-[54px] tracking-tighter font-medium leading-[0.95]" style={{ color: "var(--fg)" }}>Operations</h1>
            <p className="mt-3 text-[15px]" style={{ color: "var(--fg-muted)" }}>Manage rooms, oversee bookings, and track utilization.</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="rounded-xl p-1 mb-6 h-auto inline-flex" style={{ background: "var(--surface-muted)", border: "1px solid var(--border)" }}>
            {[
              { v: "overview", l: "Overview", icon: BarChart3 },
              { v: "bookings", l: "All bookings", icon: ShieldCheck },
              { v: "rooms", l: "Rooms", icon: Wrench },
              { v: "users", l: "Users", icon: UsersIcon },
            ].map((t) => (
              <TabsTrigger
                key={t.v} value={t.v} data-testid={`admin-tab-${t.v}`}
                className="rounded-lg px-3.5 py-1.5 text-sm tracking-tight transition-all flex items-center gap-2"
                style={tab === t.v
                  ? { background: "var(--accent)", color: "var(--accent-fg)", boxShadow: "var(--shadow-xs)" }
                  : { color: "var(--fg-soft)" }}
              >
                <t.icon className="w-3.5 h-3.5" /> {t.l}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-0">{analytics && <Overview analytics={analytics} />}</TabsContent>
          <TabsContent value="bookings" className="mt-0"><AllBookings bookings={bookings} onRemove={overrideCancel} /></TabsContent>
          <TabsContent value="rooms" className="mt-0"><RoomsManagement rooms={rooms} toggleMaintenance={toggleMaintenance} /></TabsContent>
          <TabsContent value="users" className="mt-0"><UsersList users={users} /></TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

const TOOLTIP_STYLE = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  color: "var(--fg)",
  boxShadow: "var(--shadow-md)",
  fontSize: "12px",
};

function Overview({ analytics }) {
  return (
    <div className="space-y-6" data-testid="admin-overview">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Total Bookings" value={analytics.total_bookings} testid="kpi-total" delay={60} />
        <KPI label="Active Now" value={analytics.active} testid="kpi-active" colorVar="--status-occupied-fg" delay={120} />
        <KPI label="Upcoming" value={analytics.upcoming} testid="kpi-upcoming" colorVar="--status-booked-fg" delay={180} />
        <KPI label="Most-used Room" value={analytics.most_used_room || "—"} small testid="kpi-most-used" delay={240} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="surface p-6">
          <div className="text-[10px] tracking-[0.22em] uppercase font-semibold mb-1" style={{ color: "var(--fg-soft)" }}>Room utilization</div>
          <h3 className="font-display text-[19px] tracking-tight mb-4" style={{ color: "var(--fg)" }}>Bookings per room</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.utilization} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--divider)" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="room_name" stroke="var(--fg-soft)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--fg-soft)" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--surface-muted)" }} />
                <Bar dataKey="bookings" fill="var(--fg)" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface p-6">
          <div className="text-[10px] tracking-[0.22em] uppercase font-semibold mb-1" style={{ color: "var(--fg-soft)" }}>Trend</div>
          <h3 className="font-display text-[19px] tracking-tight mb-4" style={{ color: "var(--fg)" }}>Last 7 days</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.last_7_days}>
                <CartesianGrid stroke="var(--divider)" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="date" stroke="var(--fg-soft)" tick={{ fontSize: 10 }} tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })} />
                <YAxis stroke="var(--fg-soft)" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: "var(--border-strong)" }} />
                <Line type="monotone" dataKey="count" stroke="var(--fg)" strokeWidth={2.2} dot={{ fill: "var(--fg)", r: 3 }} activeDot={{ r: 5, fill: "var(--fg)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="surface p-6">
        <div className="text-[10px] tracking-[0.22em] uppercase font-semibold mb-1" style={{ color: "var(--fg-soft)" }}>By team</div>
        <h3 className="font-display text-[19px] tracking-tight mb-4" style={{ color: "var(--fg)" }}>Top booking teams</h3>
        {analytics.by_team?.length ? (
          <div className="space-y-2.5">
            {analytics.by_team.map((t) => {
              const max = analytics.by_team[0]?.count || 1;
              const pct = Math.round((t.count / max) * 100);
              return (
                <div key={t.team} className="grid grid-cols-[120px_1fr_40px] items-center gap-3 text-sm">
                  <div style={{ color: "var(--fg-muted)" }}>{t.team}</div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-muted)" }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "var(--fg)" }} />
                  </div>
                  <div className="text-right" style={{ color: "var(--fg-soft)" }}>{t.count}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-[13px]" style={{ color: "var(--fg-soft)" }}>No bookings yet.</div>
        )}
      </div>
    </div>
  );
}

function KPI({ label, value, colorVar, small = false, testid, delay = 0 }) {
  return (
    <div data-testid={testid} className="surface surface-lift rise p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className="text-[10px] tracking-[0.22em] uppercase font-semibold mb-1.5" style={{ color: "var(--fg-soft)" }}>{label}</div>
      <div className={`font-display tracking-tight ${small ? "text-[18px]" : "text-[28px]"}`} style={{ color: colorVar ? `var(${colorVar})` : "var(--fg)" }}>{value}</div>
    </div>
  );
}

function AllBookings({ bookings, onRemove }) {
  if (!bookings.length) return <div className="py-10 text-center rounded-xl" style={{ background: "var(--surface-muted)", border: "1px dashed var(--border)", color: "var(--fg-soft)" }}>No bookings yet.</div>;
  return (
    <div className="rounded-xl overflow-x-auto" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} data-testid="admin-bookings-table">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent" style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}>
            {["Title","Room","When","Booked by","Status","Action"].map((h, i) => (
              <TableHead key={h} className={`uppercase text-[10px] tracking-[0.16em] font-semibold ${i === 5 ? "text-right" : ""}`} style={{ color: "var(--fg-soft)" }}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((b) => (
            <TableRow key={b.id} className="transition-colors" style={{ borderColor: "var(--divider)" }} data-testid={`admin-row-${b.id}`}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-muted)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              <TableCell className="font-medium" style={{ color: "var(--fg)" }}>{b.title}</TableCell>
              <TableCell style={{ color: "var(--fg-muted)" }}>{b.room_name}</TableCell>
              <TableCell className="text-xs" style={{ color: "var(--fg-soft)" }}>{formatRange(b.start_time, b.end_time)}</TableCell>
              <TableCell className="text-xs" style={{ color: "var(--fg-muted)" }}>{b.user_name}<div className="text-[10px]" style={{ color: "var(--fg-faint)" }}>{b.user_team}</div></TableCell>
              <TableCell><StatusBadge status={b.status} /></TableCell>
              <TableCell className="text-right">
                <Button
                  data-testid={`admin-remove-${b.id}`}
                  onClick={() => onRemove(b.id)}
                  className="h-9 px-3 text-xs rounded-lg"
                  style={{ background: "var(--status-maintenance-bg)", border: "1px solid var(--status-maintenance-bd)", color: "var(--status-maintenance-fg)" }}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Override
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function RoomsManagement({ rooms, toggleMaintenance }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5" data-testid="admin-rooms">
      {rooms.map((r, i) => (
        <div key={r.id} className="surface surface-lift rise p-6" data-testid={`admin-room-${r.id}`} style={{ animationDelay: `${i * 70}ms` }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[10px] tracking-[0.22em] uppercase font-semibold mb-1" style={{ color: "var(--fg-soft)" }}>Room</div>
              <h4 className="font-display text-[20px] tracking-tight" style={{ color: "var(--fg)" }}>{r.name}</h4>
              <div className="text-[11px] mt-1" style={{ color: "var(--fg-soft)" }}>Capacity {r.capacity}</div>
            </div>
            <StatusBadge status={r.maintenance ? "maintenance" : "available"} />
          </div>
          <p className="text-[13px] mb-5" style={{ color: "var(--fg-muted)" }}>{r.description}</p>
          <div className="flex items-center justify-between pt-4" style={{ borderTop: "1px solid var(--divider)" }}>
            <div>
              <div className="text-[13px] font-medium" style={{ color: "var(--fg)" }}>Maintenance mode</div>
              <div className="text-[11px]" style={{ color: "var(--fg-soft)" }}>Block bookings while toggled on.</div>
            </div>
            <Switch data-testid={`maintenance-toggle-${r.id}`} checked={r.maintenance} onCheckedChange={(v) => toggleMaintenance(r, v)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function UsersList({ users }) {
  if (!users.length) return <div className="py-10 text-center rounded-xl" style={{ background: "var(--surface-muted)", border: "1px dashed var(--border)", color: "var(--fg-soft)" }}>No users yet.</div>;
  return (
    <div className="rounded-xl overflow-x-auto" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} data-testid="admin-users-table">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent" style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}>
            {["Name","Email","Team","Role"].map((h) => (
              <TableHead key={h} className="uppercase text-[10px] tracking-[0.16em] font-semibold" style={{ color: "var(--fg-soft)" }}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id} className="transition-colors" style={{ borderColor: "var(--divider)" }} data-testid={`admin-user-${u.id}`}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-muted)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              <TableCell className="font-medium" style={{ color: "var(--fg)" }}>{u.name}</TableCell>
              <TableCell className="text-sm" style={{ color: "var(--fg-muted)" }}>{u.email}</TableCell>
              <TableCell className="text-sm" style={{ color: "var(--fg-muted)" }}>{u.team}</TableCell>
              <TableCell>
                <span
                  className="text-[10px] tracking-[0.18em] uppercase font-semibold px-2 py-1 rounded-full border"
                  style={u.role === "admin"
                    ? { background: "var(--accent)", color: "var(--accent-fg)", borderColor: "var(--accent)" }
                    : { background: "var(--surface-muted)", color: "var(--fg-muted)", borderColor: "var(--border)" }}
                >
                  {u.role}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
