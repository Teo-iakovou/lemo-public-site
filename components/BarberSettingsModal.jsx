"use client";

import { useEffect } from "react";
import { useAuth } from "./AuthProvider";
import BarberControls from "./BarberControls";

function canManageSettings(user) {
  if (!user) return false;
  const role = (user.role || "customer").toLowerCase();
  return role === "barber" || role === "admin";
}

export default function BarberSettingsModal() {
  const { settingsOpen, closeSettings, user } = useAuth();
  const allowed = canManageSettings(user);

  useEffect(() => {
    if (!settingsOpen) return undefined;
    const prev = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
      scrollY: window.scrollY,
    };
    document.body.style.position = "fixed";
    document.body.style.top = `-${window.scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.position = prev.position || "";
      document.body.style.top = prev.top || "";
      document.body.style.width = prev.width || "";
      document.body.style.overflow = prev.overflow || "";
      window.scrollTo(0, prev.scrollY || 0);
    };
  }, [settingsOpen]);

  if (!settingsOpen || !allowed) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl rounded-3xl border border-white/10 bg-black/90 p-6 shadow-2xl">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display">Ρυθμίσεις Δημόσιου Booking</h2>
            
          </div>
          <button
            type="button"
            onClick={closeSettings}
            className="h-9 w-9 rounded-full border border-white/20 text-lg text-white hover:bg-white/10"
            aria-label="Κλείσιμο"
          >
            ×
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          <BarberControls />
        </div>
      </div>
    </div>
  );
}
