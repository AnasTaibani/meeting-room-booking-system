import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import MyBookings from "@/pages/MyBookings";
import CalendarView from "@/pages/CalendarView";
import AdminPanel from "@/pages/AdminPanel";
import { Toaster } from "sonner";

function AppToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      theme={theme}
      position="top-right"
      offset={20}
      toastOptions={{
        style: {
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          color: "var(--fg)",
          boxShadow: "var(--shadow-md)",
          fontFamily: "'IBM Plex Sans', sans-serif",
        },
      }}
    />
  );
}

export default function App() {
  return (
    <div className="App">
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-bookings"
                element={
                  <ProtectedRoute>
                    <MyBookings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calendar"
                element={
                  <ProtectedRoute>
                    <CalendarView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminPanel />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
          <AppToaster />
        </AuthProvider>
      </ThemeProvider>
    </div>
  );
}
