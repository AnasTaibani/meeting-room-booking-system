import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertTriangle, ArrowRight, Sun, Moon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

function Wordmark({ size = "md" }) {
  const sizes = {
    sm: { primary: 18, secondary: 8, gap: 4, secLetter: "0.32em" },
    md: { primary: 22, secondary: 9, gap: 5, secLetter: "0.34em" },
    lg: { primary: 30, secondary: 10, gap: 7, secLetter: "0.38em" },
  };
  const s = sizes[size] || sizes.md;
  return (
    <div className="flex items-center px-1 py-1">
    <img
      src={logo}
      alt="Metamorphosys Technologies"
      className="h-14 md:h-16 w-auto object-contain"
    />
  </div>
  );
}

const SEED = [
  { email: "admin@company.com",  pwd: "admin123",    role: "Admin"       },
  { email: "jane@company.com",   pwd: "employee123", role: "Product"     },
  { email: "alex@company.com",   pwd: "employee123", role: "Engineering" },
  { email: "priya@company.com",  pwd: "employee123", role: "Design"      },
];

export default function Login() {
  const { user, login, register } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [mode, setMode] = useState("signin");

  const [siEmail, setSiEmail] = useState("");
  const [siPwd, setSiPwd] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suName, setSuName] = useState("");
  const [suTeam, setSuTeam] = useState("");
  const [suPwd, setSuPwd] = useState("");

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (user && user.id) return <Navigate to="/" replace />;

  const submitSignIn = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    const r = await login(siEmail.trim().toLowerCase(), siPwd);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    toast.success("Welcome back");
    navigate("/", { replace: true });
  };

  const submitSignUp = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    const r = await register({
      email: suEmail.trim().toLowerCase(), name: suName.trim(),
      team: suTeam.trim(), password: suPwd,
    });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    toast.success(`Welcome, ${suName.split(" ")[0]}`);
    navigate("/", { replace: true });
  };

  const quickFill = (s) => { setSiEmail(s.email); setSiPwd(s.pwd); setMode("signin"); };

  const inputStyle = { background: "var(--surface-muted)", borderColor: "var(--border)", color: "var(--fg)" };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-[1.1fr_1fr] relative" style={{ background: "var(--bg)", color: "var(--fg)" }}>
      {/* Theme toggle floating */}
      <button
        onClick={toggle}
        data-testid="theme-toggle"
        aria-label="Toggle theme"
        className="absolute top-6 right-6 z-30 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", color: "var(--fg-muted)" }}
      >
        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Left: brand panel */}
      <div className="hidden lg:flex relative overflow-hidden" style={{ borderRight: "1px solid var(--border)" }}>
        {/* Decorative blurred shapes */}
        <div
          className="absolute -top-40 -left-32 w-[560px] h-[560px] rounded-full blur-3xl opacity-50"
          style={{ background: "radial-gradient(circle, var(--accent-soft), transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 right-0 w-[440px] h-[440px] rounded-full blur-3xl opacity-40"
          style={{ background: "radial-gradient(circle, var(--accent-soft), transparent 70%)" }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Wordmark size="lg" />

          <div className="max-w-md">
            <div className="flex items-center gap-1.5 text-[10px] tracking-[0.24em] uppercase font-semibold mb-5" style={{ color: "var(--fg-soft)" }}>
              <Sparkles className="w-3 h-3" /> Meeting Room Booking
            </div>
            <h1 className="font-display text-[58px] tracking-tighter leading-[0.95] mb-6" style={{ color: "var(--fg)" }}>
              Find a room. <br />
              <span style={{ color: "var(--fg-muted)" }}>Hold the moment.</span>
            </h1>
            <p className="text-[15px] leading-relaxed" style={{ color: "var(--fg-muted)" }}>
              Live availability, instant reservations, and a calendar that respects everyone's time. Built for Metamorphosys teams that get things done.
            </p>
          </div>

          <div className="flex items-center gap-5 text-[10px] tracking-[0.22em] uppercase font-medium flex-wrap" style={{ color: "var(--fg-soft)" }}>
            <Legend color="var(--status-available-fg)" label="Available" />
            <Legend color="var(--status-booked-fg)" label="Booked" />
            <Legend color="var(--status-occupied-fg)" label="Occupied" />
            <Legend color="var(--status-maintenance-fg)" label="Maintenance" />
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-8 md:p-14 relative">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-10">
            <Wordmark size="md" />
          </div>

          <div className="text-[10px] tracking-[0.24em] uppercase font-semibold mb-3" style={{ color: "var(--fg-soft)" }}>Account access</div>
          <h2 className="font-display text-[32px] tracking-tight mb-8" style={{ color: "var(--fg)" }}>Sign in to your workspace</h2>

          <Tabs value={mode} onValueChange={setMode} className="w-full">
            <TabsList
              className="grid grid-cols-2 rounded-xl p-1 mb-6 h-auto"
              style={{ background: "var(--surface-muted)", border: "1px solid var(--border)" }}
            >
              <TabsTrigger
                data-testid="auth-tab-signin" value="signin"
                className="rounded-lg py-2 text-sm tracking-tight transition-all"
                style={mode === "signin" ? { background: "var(--surface)", color: "var(--fg)", boxShadow: "var(--shadow-xs)" } : { color: "var(--fg-soft)" }}
              >Sign in</TabsTrigger>
              <TabsTrigger
                data-testid="auth-tab-signup" value="signup"
                className="rounded-lg py-2 text-sm tracking-tight transition-all"
                style={mode === "signup" ? { background: "var(--surface)", color: "var(--fg)", boxShadow: "var(--shadow-xs)" } : { color: "var(--fg-soft)" }}
              >Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-0">
              <form onSubmit={submitSignIn} className="space-y-4">
                <Field label="Work email">
                  <Input
                    data-testid="login-email" type="email" required
                    value={siEmail} onChange={(e) => setSiEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="rounded-lg h-11" style={inputStyle}
                  />
                </Field>
                <Field label="Password">
                  <Input
                    data-testid="login-password" type="password" required
                    value={siPwd} onChange={(e) => setSiPwd(e.target.value)}
                    placeholder="••••••••"
                    className="rounded-lg h-11" style={inputStyle}
                  />
                </Field>

                {err && (
                  <div data-testid="auth-error" className="flex items-start gap-2 text-[13px] rounded-lg p-3" style={{ color: "var(--status-maintenance-fg)", background: "var(--status-maintenance-bg)", border: "1px solid var(--status-maintenance-bd)" }}>
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{err}</span>
                  </div>
                )}

                <Button
                  type="submit" disabled={busy} data-testid="login-submit"
                  className="btn-primary w-full h-11 text-sm font-medium"
                >
                  {busy ? "Signing in..." : "Sign in"} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>

              <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="text-[10px] tracking-[0.22em] uppercase font-semibold mb-3" style={{ color: "var(--fg-soft)" }}>
                  Demo accounts
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {SEED.map((s) => (
                    <button
                      key={s.email} type="button" data-testid={`seed-${s.email}`}
                      onClick={() => quickFill(s)}
                      className="flex items-center justify-between text-left px-3 py-2.5 text-xs rounded-lg transition-all"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.background = "var(--surface-muted)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface)"; }}
                    >
                      <span style={{ color: "var(--fg)" }}>{s.email}</span>
                      <span style={{ color: "var(--fg-soft)" }}>{s.role} · {s.pwd}</span>
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="signup" className="mt-0">
              <form onSubmit={submitSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Full name">
                    <Input data-testid="signup-name" required value={suName} onChange={(e) => setSuName(e.target.value)} className="rounded-lg h-11" style={inputStyle} />
                  </Field>
                  <Field label="Team">
                    <Input data-testid="signup-team" required value={suTeam} onChange={(e) => setSuTeam(e.target.value)} placeholder="e.g. Product" className="rounded-lg h-11" style={inputStyle} />
                  </Field>
                </div>
                <Field label="Work email">
                  <Input data-testid="signup-email" type="email" required value={suEmail} onChange={(e) => setSuEmail(e.target.value)} className="rounded-lg h-11" style={inputStyle} />
                </Field>
                <Field label="Password">
                  <Input data-testid="signup-password" type="password" required minLength={6} value={suPwd} onChange={(e) => setSuPwd(e.target.value)} className="rounded-lg h-11" style={inputStyle} />
                </Field>

                {err && (
                  <div data-testid="auth-error" className="flex items-start gap-2 text-[13px] rounded-lg p-3" style={{ color: "var(--status-maintenance-fg)", background: "var(--status-maintenance-bg)", border: "1px solid var(--status-maintenance-bd)" }}>
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{err}</span>
                  </div>
                )}

                <Button type="submit" disabled={busy} data-testid="signup-submit" className="btn-primary w-full h-11 text-sm font-medium">
                  {busy ? "Creating..." : "Create account"} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
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

function Legend({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
