"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";

export default function ProfilePanel() {
  const { profileOpen, closeProfile, user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState("");
  const [lastFocusedElement, setLastFocusedElement] = useState(null);

  useEffect(() => {
    if (!profileOpen) {
      setAppointments([]);
      setError("");
      return;
    }
    let canceled = false;
    async function load() {
      setLoading(true);
      setError("");
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
              });
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
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
