import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { LayoutDashboard, CalendarRange, ClipboardList, ShieldCheck, LogOut, Sun, Moon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import logo from "@/assets/logo.png";

function Wordmark({ size = "sm" }) {
  const sizes = {
    sm: { primary: 18, secondary: 8, gap: 4, secLetter: "0.32em" },
    md: { primary: 22, secondary: 9, gap: 5, secLetter: "0.34em" },
    lg: { primary: 30, secondary: 10, gap: 7, secLetter: "0.38em" },
  };
  const s = sizes[size] || sizes.sm;
  return (
    <div className="flex items-center px-1">
    <img
      src={logo}
      alt="Metamorphosys Technologies"
      className="h-10 md:h-12 w-auto object-contain"
    />
  </div>
  );
}

const NavItem = ({ to, icon: Icon, label, testid }) => (
  <NavLink
    to={to}
    end={to === "/"}
    data-testid={testid}
    className={({ isActive }) =>
      `group relative flex items-center gap-3 px-3 py-2 text-sm tracking-tight rounded-lg transition-all duration-200 ${
        isActive
          ? "font-medium"
          : "hover:translate-x-0.5"
      }`
    }
    style={({ isActive }) => ({
      background: isActive ? "var(--accent)" : "transparent",
      color: isActive ? "var(--accent-fg)" : "var(--fg-muted)",
    })}
  >
    {({ isActive }) => (
      <>
        <Icon className={`w-[18px] h-[18px] transition-transform duration-200 ${isActive ? "" : "group-hover:scale-110"}`} strokeWidth={isActive ? 2.1 : 1.7} />
        <span>{label}</span>
      </>
    )}
  </NavLink>
);

function ThemeToggle({ stretched = false }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      data-testid="theme-toggle"
      onClick={toggle}
      aria-label="Toggle theme"
      className={`relative inline-flex items-center gap-2 rounded-full p-1 transition-all duration-300 overflow-hidden border ${stretched ? "w-full justify-between px-3 py-2" : ""}`}
      style={{ background: "var(--surface-muted)", borderColor: "var(--border)" }}
    >
      <span className="flex items-center gap-2">
        <span
          className="flex items-center justify-center w-7 h-7 rounded-full transition-transform duration-500"
          style={{
            background: isDark ? "transparent" : "var(--accent)",
            color: isDark ? "var(--fg-soft)" : "var(--accent-fg)",
            transform: isDark ? "scale(0.85)" : "scale(1)",
          }}
        >
          <Sun className="w-3.5 h-3.5" />
        </span>
        {stretched && <span className="text-xs" style={{ color: isDark ? "var(--fg-faint)" : "var(--fg)" }}>Light</span>}
      </span>
      <span className="flex items-center gap-2">
        {stretched && <span className="text-xs" style={{ color: isDark ? "var(--fg)" : "var(--fg-faint)" }}>Dark</span>}
        <span
          className="flex items-center justify-center w-7 h-7 rounded-full transition-transform duration-500"
          style={{
            background: isDark ? "var(--accent)" : "transparent",
            color: isDark ? "var(--accent-fg)" : "var(--fg-soft)",
            transform: isDark ? "scale(1)" : "scale(0.85)",
          }}
        >
          <Moon className="w-3.5 h-3.5" />
        </span>
      </span>
    </button>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = (user?.name || "U")
    .split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex relative" style={{ background: "var(--bg)", color: "var(--fg)" }}>
      {/* Sidebar */}
      <aside
        className="hidden md:flex flex-col w-[248px] shrink-0 z-10 sticky top-0 h-screen"
        style={{ background: "var(--bg-elevated)", borderRight: "1px solid var(--border)" }}
      >
        <div className="px-5 py-6">
          <Wordmark size="sm" />
        </div>

        <div className="px-5 mb-4">
          <div className="text-[10px] tracking-[0.2em] uppercase font-medium" style={{ color: "var(--fg-faint)" }}>
            Room Booking
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5" data-testid="sidebar-nav">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" testid="nav-dashboard" />
          <NavItem to="/calendar" icon={CalendarRange} label="Calendar" testid="nav-calendar" />
          <NavItem to="/my-bookings" icon={ClipboardList} label="My Bookings" testid="nav-my-bookings" />
          {user?.role === "admin" && (
            <NavItem to="/admin" icon={ShieldCheck} label="Admin Panel" testid="nav-admin" />
          )}
        </nav>

        <div className="px-3 pb-4">
          <div className="mb-3 px-1"><ThemeToggle stretched /></div>

          <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "var(--surface-muted)", border: "1px solid var(--border)" }}>
            <Avatar className="w-9 h-9 rounded-full">
              <AvatarFallback className="rounded-full text-[11px] font-semibold" style={{ background: "var(--accent)", color: "var(--accent-fg)" }}>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate" data-testid="sidebar-user-name" style={{ color: "var(--fg)" }}>{user?.name}</div>
              <div className="text-[11px] truncate" style={{ color: "var(--fg-soft)" }}>{user?.team} · {user?.role}</div>
            </div>
            <button
              data-testid="logout-button"
              onClick={handleLogout}
              aria-label="Sign out"
              className="btn-ghost p-1.5 rounded-md"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 glass px-4 py-3 flex items-center justify-between">
          <Wordmark size="sm" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              data-testid="logout-button-mobile"
              onClick={handleLogout}
              className="btn-ghost p-2 rounded-md"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Mobile bottom nav */}
        <div
          className="md:hidden fixed bottom-0 inset-x-0 z-40 glass grid"
          style={{
            borderTop: "1px solid var(--border)",
            gridTemplateColumns: user?.role === "admin" ? "repeat(4, 1fr)" : "repeat(3, 1fr)",
          }}
        >
          {[
            { to: "/", icon: LayoutDashboard, label: "Home", testid: "mnav-home" },
            { to: "/calendar", icon: CalendarRange, label: "Calendar", testid: "mnav-calendar" },
            { to: "/my-bookings", icon: ClipboardList, label: "Mine", testid: "mnav-mine" },
            ...(user?.role === "admin"
              ? [{ to: "/admin", icon: ShieldCheck, label: "Admin", testid: "mnav-admin" }]
              : []),
          ].map((it) => (
            <NavLink
              key={it.testid}
              to={it.to}
              end={it.to === "/"}
              data-testid={it.testid}
              className="flex flex-col items-center justify-center py-2.5 text-[10px] tracking-wide uppercase transition-colors duration-200"
              style={({ isActive }) => ({ color: isActive ? "var(--fg)" : "var(--fg-soft)" })}
            >
              <it.icon className="w-5 h-5 mb-0.5" strokeWidth={1.8} />
              {it.label}
            </NavLink>
          ))}
        </div>

        <main className="flex-1 overflow-y-auto px-5 md:px-10 lg:px-14 py-8 pb-24 md:pb-10" data-testid="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
