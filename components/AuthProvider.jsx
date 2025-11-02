"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AUTH_DISABLED } from "../lib/auth";

const AuthContext = createContext(null);

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
    loading: false,
    error: "",
  },
  openAuthModal: noop,
  closeAuthModal: noop,
  setAuthMode: noop,
  authenticate: asyncNoop,
  requestPasswordReset: asyncNoop,
  resetPasswordWithOtp: asyncNoop,
  requireAuth: disabledRequireAuth,
  logout: noop,
  profileOpen: false,
  openProfile: noop,
  closeProfile: noop,
  refreshUser: noop,
});

export default function AuthProvider({ children }) {
  if (AUTH_DISABLED) {
    return <AuthContext.Provider value={disabledAuthValue}>{children}</AuthContext.Provider>;
  }

  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [modalState, setModalState] = useState({
    open: false,
    mode: "login",
    loading: false,
    error: "",
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const pendingCallbackRef = useRef(null);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = await res.json();
      setUser(data.user || null);
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
    pendingCallbackRef.current = typeof onSuccess === "function" ? onSuccess : null;
    setModalState({
      open: true,
      mode,
      loading: false,
      error: "",
    });
  }, []);

  const closeAuthModal = useCallback(() => {
    pendingCallbackRef.current = null;
    setModalState((prev) => ({ ...prev, open: false, loading: false, error: "" }));
  }, []);

  const setAuthMode = useCallback((mode) => {
    setModalState((prev) => ({ ...prev, mode, error: "" }));
  }, []);

  const authenticate = useCallback(async ({ mode, name, password, phone }) => {
    setModalState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const payload =
        mode === "signup"
          ? { name, password, phone }
          : { name, password };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Αποτυχία σύνδεσης");
      }
      setUser(data.user || null);
      setModalState({ open: false, mode: "login", loading: false, error: "" });
      if (pendingCallbackRef.current) {
        pendingCallbackRef.current(data.user || null);
        pendingCallbackRef.current = null;
      }
      return data.user || null;
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
  }, []);

  const requireAuth = useCallback(
    (onSuccess) => {
      if (user) {
        if (typeof onSuccess === "function") onSuccess(user);
        return true;
      }
      openAuthModal("login", onSuccess);
      return false;
    },
    [user, openAuthModal]
  );

  const openProfile = useCallback(() => {
    if (user) {
      setProfileOpen(true);
    } else {
      openAuthModal("login", () => setProfileOpen(true));
    }
  }, [user, openAuthModal]);

  const closeProfile = useCallback(() => setProfileOpen(false), []);

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
      requireAuth,
      logout,
      profileOpen,
      openProfile,
      closeProfile,
      refreshUser: fetchCurrentUser,
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
      requireAuth,
      logout,
      profileOpen,
      openProfile,
      closeProfile,
      fetchCurrentUser,
      setAuthMode,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
