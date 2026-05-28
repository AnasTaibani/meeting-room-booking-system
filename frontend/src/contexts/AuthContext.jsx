import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  const fetchMe = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setUser(false);
        return;
      }

      const { data } = await api.get("/auth/me");

      setUser(data);

    } catch (err) {
      console.error("[AuthContext] /auth/me failed:", err);

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      setUser(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (email, password) => {
    setError("");

    try {
      const { data } = await api.post("/auth/login", {
        email,
        password,
      });

      // Save JWT token
      localStorage.setItem("token", data.access_token);

      // Save user
      localStorage.setItem("user", JSON.stringify(data.user));

      setUser(data.user);

      return { ok: true };

    } catch (e) {
      const msg = formatApiError(e);

      setError(msg);

      return {
        ok: false,
        error: msg,
      };
    }
  };

  const register = async (payload) => {
    setError("");

    try {
      const { data } = await api.post("/auth/register", payload);

      // Save JWT token
      localStorage.setItem("token", data.access_token);

      // Save user
      localStorage.setItem("user", JSON.stringify(data.user));

      setUser(data.user);

      return { ok: true };

    } catch (e) {
      const msg = formatApiError(e);

      setError(msg);

      return {
        ok: false,
        error: msg,
      };
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("[AuthContext] logout failed:", err);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        error,
        login,
        register,
        logout,
        refresh: fetchMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }

  return ctx;
}