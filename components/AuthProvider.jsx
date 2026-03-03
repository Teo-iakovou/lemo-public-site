"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AUTH_DISABLED } from "../lib/auth";

const AuthContext = createContext(null);
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

const noop = () => {};
const asyncNoop = async () => null;
const disabledRequireAuth = (onSuccess) => {
  if (typeof onSuccess === "function") onSuccess(null);
  return true;
};

const disabledAuthValue = Object.freeze({
  user: null,
  initializing: false,
  modalState: {
    open: false,
    mode: "login",
    requiresDob: false,
    loading: false,
    error: "",
  },
  openAuthModal: noop,
  closeAuthModal: noop,
  setAuthMode: noop,
  authenticate: asyncNoop,
  requestPasswordReset: asyncNoop,
  resetPasswordWithOtp: asyncNoop,
  completeDob: asyncNoop,
  requireAuth: disabledRequireAuth,
  logout: noop,
  profileOpen: false,
  openProfile: noop,
  closeProfile: noop,
  refreshUser: noop,
  settingsOpen: false,
  openSettings: noop,
  closeSettings: noop,
});

function withDefaultRole(user) {
  if (!user) return null;
  const dob = user.dob || null;
  return {
    role: user.role || "customer",
    ...user,
    dob,
    requiresDob: Boolean(user.requiresDob || !dob),
  };
}

export default function AuthProvider({ children }) {
  if (AUTH_DISABLED) {
    return <AuthContext.Provider value={disabledAuthValue}>{children}</AuthContext.Provider>;
  }

  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [modalState, setModalState] = useState({
    open: false,
    mode: "login",
    requiresDob: false,
    loading: false,
    error: "",
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pendingCallbackRef = useRef(null);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = await res.json();
      const nextUser = withDefaultRole(data.user);
      if (nextUser?.requiresDob) {
        // On hard refresh, force re-login instead of auto-opening the DOB gate.
        // The gate appears right after the next successful login.
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch {}
        setUser(null);
        setModalState((prev) => ({
          ...prev,
          open: false,
          requiresDob: false,
          loading: false,
          error: "",
        }));
        return;
      }
      setUser(nextUser);
    } catch {
      setUser(null);
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const openAuthModal = useCallback((mode = "login", onSuccess) => {
    if (user?.requiresDob) {
      setModalState({
        open: true,
        mode: "dob",
        requiresDob: true,
        loading: false,
        error: "",
      });
      return;
    }
    pendingCallbackRef.current = typeof onSuccess === "function" ? onSuccess : null;
    setModalState({
      open: true,
      mode,
      requiresDob: false,
      loading: false,
      error: "",
    });
  }, [user?.requiresDob]);

  const closeAuthModal = useCallback(() => {
    if (modalState.requiresDob) return;
    pendingCallbackRef.current = null;
    setModalState((prev) => ({ ...prev, open: false, requiresDob: false, loading: false, error: "" }));
  }, [modalState.requiresDob]);

  const setAuthMode = useCallback((mode) => {
    setModalState((prev) => ({ ...prev, mode, requiresDob: false, error: "" }));
  }, []);

  const authenticate = useCallback(async ({ mode, name, password, phone, dob }) => {
    setModalState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      let payload;
      if (mode === "signup") {
        payload = { name, password, phone, dob };
      } else {
        payload = { phone, password };
        if ((!phone || !phone.trim()) && name) {
          payload.phone = name;
        }
      }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Αποτυχία σύνδεσης");
      }
      const nextUser = withDefaultRole(data.user);
      setUser(nextUser);
      if (nextUser?.requiresDob) {
        setModalState({
          open: true,
          mode: "dob",
          requiresDob: true,
          loading: false,
          error: "",
        });
      } else {
        setModalState({ open: false, mode: "login", requiresDob: false, loading: false, error: "" });
        if (pendingCallbackRef.current) {
          pendingCallbackRef.current(nextUser || null);
          pendingCallbackRef.current = null;
        }
      }
      return nextUser || null;
    } catch (error) {
      setModalState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || "Σφάλμα",
      }));
      throw error;
    }
  }, []);

  const completeDob = useCallback(async (dob) => {
    setModalState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dob }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Αποτυχία ενημέρωσης DOB");
      }
      const nextUser = withDefaultRole(data.user);
      setUser(nextUser);
      setModalState({ open: false, mode: "login", requiresDob: false, loading: false, error: "" });
      if (pendingCallbackRef.current) {
        pendingCallbackRef.current(nextUser || null);
        pendingCallbackRef.current = null;
      }
      return nextUser;
    } catch (error) {
      setModalState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || "Σφάλμα",
      }));
      throw error;
    }
  }, []);

  const requestPasswordReset = useCallback(async (phone) => {
    setModalState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Αποτυχία αποστολής OTP");
      }
      setModalState((prev) => ({ ...prev, loading: false, error: "" }));
      return true;
    } catch (error) {
      setModalState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || "Σφάλμα",
      }));
      throw error;
    }
  }, []);

  const resetPasswordWithOtp = useCallback(async ({ phone, otp, password }) => {
    setModalState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Αποτυχία επαναφοράς κωδικού");
      }
      setModalState((prev) => ({ ...prev, loading: false, error: "" }));
      return true;
    } catch (error) {
      setModalState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || "Σφάλμα",
      }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setUser(null);
    setProfileOpen(false);
    setSettingsOpen(false);
    setModalState((prev) => ({ ...prev, open: false, requiresDob: false, loading: false, error: "" }));
    pendingCallbackRef.current = null;
  }, []);

  const requireAuth = useCallback(
    (onSuccess) => {
      if (user) {
        if (user.requiresDob) {
          pendingCallbackRef.current = typeof onSuccess === "function" ? onSuccess : null;
          setModalState((prev) => ({
            ...prev,
            open: true,
            mode: "dob",
            requiresDob: true,
            error: "",
          }));
          return false;
        }
        if (typeof onSuccess === "function") onSuccess(user);
        return true;
      }
      openAuthModal("login", onSuccess);
      return false;
    },
    [user, openAuthModal]
  );

  const openProfile = useCallback(() => {
    if (user && !user.requiresDob) {
      setProfileOpen(true);
    } else if (user?.requiresDob) {
      setModalState({
        open: true,
        mode: "dob",
        requiresDob: true,
        loading: false,
        error: "",
      });
    } else {
      openAuthModal("login", () => setProfileOpen(true));
    }
  }, [user, openAuthModal]);

  const closeProfile = useCallback(() => setProfileOpen(false), []);

  const openSettings = useCallback(() => {
    const allow = (u) => {
      const role = (u?.role || "customer").toLowerCase();
      if (role === "barber" || role === "admin") {
        setSettingsOpen(true);
      }
    };
    const currentRole = (user?.role || "customer").toLowerCase();
    if (user?.requiresDob) {
      setModalState({
        open: true,
        mode: "dob",
        requiresDob: true,
        loading: false,
        error: "",
      });
      return;
    }
    if (!user) {
      openAuthModal("login", allow);
      return;
    }
    if (currentRole !== "barber" && currentRole !== "admin") return;
    setSettingsOpen(true);
  }, [user, openAuthModal]);

  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  useEffect(() => {
    const role = (user?.role || "customer").toLowerCase();
    if (role !== "barber" && role !== "admin") {
      setSettingsOpen(false);
    }
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      initializing,
      modalState,
      openAuthModal,
      closeAuthModal,
      setAuthMode,
      authenticate,
      requestPasswordReset,
      resetPasswordWithOtp,
      completeDob,
      requireAuth,
      logout,
      profileOpen,
      openProfile,
      closeProfile,
      refreshUser: fetchCurrentUser,
      settingsOpen,
      openSettings,
      closeSettings,
    }),
    [
      user,
      initializing,
      modalState,
      openAuthModal,
      closeAuthModal,
      setAuthMode,
      authenticate,
      requestPasswordReset,
      resetPasswordWithOtp,
      completeDob,
      requireAuth,
      logout,
      profileOpen,
      openProfile,
      closeProfile,
      fetchCurrentUser,
      settingsOpen,
      openSettings,
      closeSettings,
      setAuthMode,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
