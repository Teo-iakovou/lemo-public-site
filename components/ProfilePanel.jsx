"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";

export default function ProfilePanel() {
  const { profileOpen, closeProfile, user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [cancelingId, setCancelingId] = useState(null);
  const [lastFocusedElement, setLastFocusedElement] = useState(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!profileOpen) {
      setAppointments([]);
      setError("");
      setInfoMessage("");
      return;
    }
    let canceled = false;
    async function load() {
      setLoading(true);
      setError("");
      setInfoMessage("");
      try {
        const res = await fetch("/api/appointments/mine", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) {
            await logout();
            if (!canceled) setError("Η συνεδρία έληξε. Συνδεθείτε ξανά.");
            return;
          }
          throw new Error(data?.error || "Αποτυχία φόρτωσης ραντεβού.");
        }
        if (!canceled) setAppointments(data.appointments || []);
      } catch (err) {
        if (!canceled) setError(err.message || "Σφάλμα");
      } finally {
        if (!canceled) setLoading(false);
      }
    }
    load();
    return () => {
      canceled = true;
    };
  }, [profileOpen, logout]);

  useEffect(() => {
    if (profileOpen) {
      setLastFocusedElement(document.activeElement);
      document.body.style.top = `-${window.scrollY}px`;
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      const top = document.body.style.top;
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      if (top) {
        const scrollY = parseInt(top || "0", 10) * -1;
        window.scrollTo(0, Number.isFinite(scrollY) ? scrollY : 0);
      }
      if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
        lastFocusedElement.focus();
      }
    }
    return () => {
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
    };
  }, [profileOpen, lastFocusedElement]);

  useEffect(() => {
    if (infoMessage) {
      setShowToast(true);
      const timeout = window.setTimeout(() => {
        setShowToast(false);
        setInfoMessage("");
      }, 4000);
      return () => window.clearTimeout(timeout);
    }
    setShowToast(false);
    return undefined;
  }, [infoMessage]);

  const handleCancel = useCallback(
    async (id) => {
      if (!id || cancelingId) return;
      setCancelingId(id);
      setError("");
      setInfoMessage("");
      try {
        const res = await fetch(`/api/appointments/mine?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || "Η ακύρωση απέτυχε.");
        }
        setAppointments((prev) => prev.filter((appt) => appt._id !== id));
        setInfoMessage(data?.message || "Το ραντεβού ακυρώθηκε.");
      } catch (err) {
        setError(err.message || "Η ακύρωση απέτυχε.");
      } finally {
        setCancelingId(null);
      }
    },
    [cancelingId]
  );

  if (!profileOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex justify-end bg-black/70 backdrop-blur-sm">
      <div className="relative h-full w-full max-w-md bg-black text-white border-l border-white/10 p-6 overflow-y-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-display">Ο λογαριασμός μου</h2>
            <p className="text-sm text-white/60">{user?.username || "Επισκέπτης"}</p>
          </div>
          <button
            onClick={closeProfile}
            className="h-9 w-9 rounded-full border border-white/15 flex items-center justify-center hover:bg-white/10"
            aria-label="Κλείσιμο"
          >
            ×
          </button>
        </header>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Τα ραντεβού μου</h3>
            <button
              onClick={logout}
              className="text-sm text-red-300 hover:text-red-200 underline"
            >
              Αποσύνδεση
            </button>
          </div>
          {loading && <p className="text-sm text-white/60">Φόρτωση…</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
          {!loading && !error && appointments.length === 0 && (
            <p className="text-sm text-white/60">
              Δεν έχετε κλεισμένα ραντεβού ακόμα. Πατήστε &ldquo;ΚΛΕΙΣΤΕ ΡΑΝΤΕΒΟΥ&rdquo; για να προχωρήσετε!
            </p>
          )}
          <ul className="space-y-3">
            {appointments.map((appt) => {
              const start = new Date(appt.appointmentDateTime);
              const dateLabel = start.toLocaleDateString("el-GR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              });
              const timeLabel = start.toLocaleTimeString("el-GR", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });
              const isUpcoming = start.getTime() > Date.now();
              return (
                <li
                  key={appt._id || `${appt.appointmentDateTime}-${appt.barber}`}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{appt.barber}</span>
                    <span className="text-white/70">{timeLabel}</span>
                  </div>
                  <div className="text-white/80 text-sm">{dateLabel}</div>
                  <div className="text-xs text-white/50 mt-1 capitalize">
                    {appt.type === "appointment"
                      ? "Ραντεβού"
                      : appt.type === "break"
                      ? "Διάλειμμα"
                      : "Κλείδωμα"}
                  </div>
                  {appt.type === "appointment" && isUpcoming && (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleCancel(appt._id)}
                        disabled={cancelingId === appt._id}
                        className="rounded border border-red-400 px-3 py-1 text-xs text-red-200 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {cancelingId === appt._id ? "Ακύρωση..." : "Ακύρωση ραντεβού"}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
        {showToast && infoMessage && (
          <div className="pointer-events-none absolute left-1/2 bottom-6 -translate-x-1/2">
            <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-emerald-500/90 px-4 py-2 shadow-lg">
              <span className="text-sm font-medium text-white">{infoMessage}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
