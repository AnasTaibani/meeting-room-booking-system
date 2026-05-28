import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export function formatApiError(err) {
  const detail = err?.response?.data?.detail;

  if (detail == null) {
    return err?.message || "Something went wrong.";
  }

  if (typeof detail === "string") {
    return detail;
  }

  return JSON.stringify(detail);
}

export default api;