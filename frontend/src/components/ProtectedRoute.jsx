import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user } = useAuth();
  if (user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-current animate-spin" style={{ color: "var(--fg-soft)" }} />
            <div className="absolute inset-2 rounded-full" style={{ background: "var(--accent)" }} />
          </div>
          <div className="text-xs tracking-[0.18em] uppercase" style={{ color: "var(--fg-soft)" }}>Loading workspace</div>
        </div>
      </div>
    );
  }
  if (user === false) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}
