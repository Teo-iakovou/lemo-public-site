"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Calendar from "./Calendar";
import { getServices, createAppointment, getAvailability } from "../lib/api";
import { getPrefetchedBookingData } from "../lib/prefetch";

export default function BookingModal({ open, onClose }) {
  const router = useRouter();
  const [services, setServices] = useState([]);
  const [servicesError, setServicesError] = useState("");
  const serviceId = services[0]?.id || services[0]?._id || "";

  const [date, setDate] = useState("");
  const [showCalendar, setShowCalendar] = useState(true);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef(null);
  const [barber, setBarber] = useState("");
  const DRAFT_KEY = "lemo_booking_draft";

  function mapBarberUiToBackend(name) {
    if (!name) return "";
    const key = String(name).toLowerCase();
    if (key === "lemo") return "ΛΕΜΟ";
    if (key === "forou") return "ΦΟΡΟΥ";
    return name; // fallback
  }

  const HORIZON_DAYS = 60; // extend horizon so bars and cache cover next month
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  // Use local YYYY-MM-DD (not UTC) so we don't expose yesterday when it's today locally
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  // Allow selecting any future date: set a far future max date (10 years)
  const maxDate = new Date(today.getTime() + 3650 * 86400000)
    .toISOString()
    .slice(0, 10);

  // Prefetch services when the modal opens
  useEffect(() => {
    if (!open) return;
    // Always start fresh each time the modal opens
    setBarber("");
    setDate("");
    setTime("");
    setName("");
    setPhone("");
    setEmail("");
    try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
    // First, try to hydrate from prefetched cache for instant UI
    const cached = getPrefetchedBookingData();
    if (cached?.services?.length) setServices(cached.services);
    if (cached?.counts) setHighlights(cached.counts);
    if (cached?.appointments) {
      // normalize appointments to the shape the modal expects when computing slots
      const ap = cached.appointments.map((a) => ({ start: a.start, duration: a.duration }));
      // store raw; conversion happens later
      // We'll stash as JSON-safe in state by keeping strings
      setAppts(ap);
    }
    let mounted = true;
    getServices()
      .then((data) => {
        if (!mounted) return;
        const list = Array.isArray(data) ? data : data?.services || [];
        setServices(list);
        setServicesError("");
      })
      .catch((e) => {
        setServices([]);
        setServicesError(e?.message || "Cannot reach booking backend. Check API URL.");
      });
    return () => {
      mounted = false;
    };
  }, [open]);

  // No draft persistence: always reset on open per user request

  // Helpers to compute slots locally
  function toYMD(d) {
    // Local date string to avoid UTC shifting
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }
  function parseLocalDate(ds) { const [y,m,dd] = ds.split("-").map(Number); return new Date(y, m-1, dd); }
  function businessWindow(date) {
    const dow = date.getDay();
    if (dow === 0 || dow === 1) return null; // Sun, Mon
    // Saturday until 17:40, Tue–Fri until 19:00
    if (dow === 6) return { open: 9*60, close: 17*60 + 40 };
    return { open: 9*60, close: 19*60 };
  }
  function generateSlots({ date, duration = 40, step = 20 }) {
    const win = businessWindow(date);
    if (!win) return [];
    const out = [];
    const breakStart = 13*60, breakEnd = 14*60; // daily break 13:00–14:00
    for (let t = win.open; t + duration <= win.close; t += step) {
      const overlapsBreak = !(t + duration <= breakStart || breakEnd <= t);
      if (overlapsBreak) continue;
      const hh = String(Math.floor(t/60)).padStart(2, "0");
      const mm = String(t%60).padStart(2, "0");
      out.push({ start: t, label: `${hh}:${mm}` });
    }
    return out;
  }
  function overlaps(aStart, aDur, bStart, bDur) { const aEnd=aStart+aDur, bEnd=bStart+bDur; return aStart<bEnd && bStart<aEnd; }

  // Prefetch availability counts to decorate the calendar (single request)
  const [highlights, setHighlights] = useState({});
  const [loadingHints, setLoadingHints] = useState(false);
  const [appts, setAppts] = useState([]);
  const [monthStart, setMonthStart] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
  });
  useEffect(() => {
    let abort = false;
    async function run() {
      if (!open || !serviceId) return;
      setLoadingHints(true);
      try {
        // Fetch counts for the current visible month only
        const start = monthStart;
        const d = new Date(start + "T00:00:00");
        const daysInMonth = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
        const bGreek = mapBarberUiToBackend(barber);
        const barberParam = bGreek ? `&barber=${encodeURIComponent(bGreek)}` : "";
        const res = await fetch(`/api/availability/horizon?serviceId=${encodeURIComponent(serviceId)}&start=${start}&days=${daysInMonth}${barberParam}` , { cache: "no-store" });
        const data = await res.json();
        if (!abort) {
          const counts = data || {};
          setHighlights(counts || {});
          setAppts([]);

          // If no date chosen yet, auto-pick the nearest day with availability and prefill slots
          try {
            if (!date && counts) {
              const dsList = Object.keys(counts).sort();
              const todayYMD = toYMD(today);
              const nextWithSlots = dsList.find((ds) => ds >= todayYMD && Number(counts[ds] || 0) > 0);
              if (nextWithSlots) {
                setDate(nextWithSlots);
                // fetch exact slots for that day (barber-specific)
                getAvailability({ serviceId, date: nextWithSlots, barber: mapBarberUiToBackend(barber) })
                  .then((res2) => {
                    const arr2 = Array.isArray(res2) ? res2 : res2?.slots || [];
                    setSlots(arr2);
                  })
                  .catch(() => setSlots([]))
                  .finally(() => setLoadingSlots(false));
              }
            }
          } catch {}
        }
      } catch {
        if (!abort) { setHighlights({}); setAppts([]); }
      } finally {
        if (!abort) setLoadingHints(false);
      }
    }
    if (barber) run(); else { setHighlights({}); setAppts([]); setLoadingHints(false); }
    return () => { abort = true; };
  }, [open, serviceId, monthStart, barber]);

  // Compute slots when date changes
  useEffect(() => {
    if (!serviceId || !date || !barber) { setSlots([]); return; }
    setLoadingSlots(true);
    const withinHorizon = (() => {
      const d0 = new Date(today.getTime());
      const d1 = new Date(today.getTime() + HORIZON_DAYS*86400000);
      const dx = parseLocalDate(date);
      return dx >= d0 && dx <= d1;
    })();

    if (!withinHorizon) {
      // Fetch accurate slots for dates beyond the prefetch horizon
      getAvailability({ serviceId, date, barber: mapBarberUiToBackend(barber) })
        .then((res) => {
          const arr = Array.isArray(res) ? res : res?.slots || [];
          setSlots(arr);
        })
        .catch(() => setSlots([]))
        .finally(() => setLoadingSlots(false));
      return;
    }

    // Compute from cached appointments for within-horizon dates
    const day = parseLocalDate(date);
    const candidates = generateSlots({ date: day, duration: 40, step: 20 });
    const todays = appts
      .map((a) => ({ start: new Date(a.start), duration: Number(a.duration)||40, barber: a.barber || null }))
      .filter((a) => toYMD(a.start) === date);
    const sel = mapBarberUiToBackend(barber).toLowerCase();
    const free = candidates.filter((c) => !todays.some((b) => {
      const bStart = b.start.getHours()*60 + b.start.getMinutes();
      const overlapsTime = overlaps(c.start, 40, bStart, b.duration);
      if (!overlapsTime) return false;
      const bName = (b.barber || "").toLowerCase();
      const affects = !sel || !bName || bName === sel;
      return affects;
    }));
    const now = new Date();
    if (toYMD(now) === date) {
      const cutoff = now.getHours()*60 + now.getMinutes() + 60;
      for (let i=free.length-1;i>=0;i--) if (free[i].start < cutoff) free.splice(i,1);
    }
    setSlots(free.map((s) => s.label));
    setLoadingSlots(false);
  }, [date, serviceId, appts, barber]);

  async function onConfirm() {
    if (!serviceId || !barber || !date || !time || !name || !phone) return;
    setSubmitting(true);
    setError("");
    try {
      const dateTime = `${date}T${time}`;
      const payload = { serviceId, dateTime, name, phone, barber: mapBarberUiToBackend(barber) };
      if (email) payload.email = email;
      const result = await createAppointment(payload);
      const id = result?.id || result?._id || "";
      const p = new URLSearchParams();
      if (id) p.set("id", id);
      // Clear draft on success
      try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
      onClose?.();
      router.push(`/success?${p.toString()}`);
    } catch (e) {
      setError(e.message || "Failed to create appointment");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = !!(serviceId && barber && date && time && name && phone && !submitting);

  const panelRef = useRef(null);
  const closeBtnRef = useRef(null);

  // Close on Escape and trap focus inside the modal
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      } else if (e.key === "Tab") {
        // Simple focus trap
        const root = panelRef.current;
        if (!root) return;
        const focusables = root.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    // initial focus
    setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 0);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Panel: full screen on mobile, centered card on larger screens */}
      <div
        ref={panelRef}
        className="absolute inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full h-full sm:h-auto sm:w-[720px] bg-black sm:rounded-xl border border-white/10 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
          <div className="font-display text-lg">Book an appointment</div>
          <button ref={closeBtnRef} onClick={onClose} className="px-2 py-1 rounded border border-white/10 text-sm">Close</button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 grid grid-cols-1 gap-6 overflow-y-auto flex-1 max-h-[calc(100vh-64px)] sm:max-h-none">
          {servicesError && (
            <div className="px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
              {servicesError}
            </div>
          )}
          {/* Step 1: Barber selection */}
          {!barber && (
            <div>
              <div className="mb-3 font-display text-lg">Choose your barber</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[{ id: "Lemo", name: "Lemo" }, { id: "Forou", name: "Forou" }].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => { setBarber(b.id); setDate(""); setTime(""); }}
                    className="relative p-4 border border-white/20 rounded-lg text-left hover:bg-white/5"
                  >
                    <div className="h-32 w-full bg-white/10 rounded mb-3" />
                    <div className="font-semibold">{b.name}</div>
                    <div className="text-sm text-neutral-300">Tap to select</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Calendar + slots (hidden after picking a time so only inputs remain) */}
          {barber && !time && (
          <div>
              <Calendar
                value={date}
                onChange={(ds) => {
                  setDate(ds);
                  setTime("");
                }}
                minDate={minDate}
                maxDate={maxDate}
                closedWeekdays={[0, 1]}
                highlights={highlights}
                onMonthChange={(d) => {
                  const start = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
                  setMonthStart(start);
                }}
              />
              {/* Availability/loading hints removed for a cleaner look */}
              {date && (
                <div className="mt-4">
                  <div className="text-sm mb-2">Time</div>
                  {loadingSlots && <p className="text-sm">Loading slots…</p>}
                  {!loadingSlots && (
                    <div className="flex flex-wrap gap-2">
                      {slots.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setTime(t);
                            // Smoothly scroll to the form after picking a slot
                            setTimeout(() => {
                              formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }, 0);
                          }}
                          className={`px-3 py-2 rounded-md border text-sm ${
                            time === t ? "border-white bg-white text-black" : "border-white/20 hover:bg-white/10"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                      {slots.length === 0 && (
                        <p className="text-sm text-neutral-400">No free slots</p>
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* Legend for availability bars */}
              <div className="flex items-center gap-4 text-xs text-neutral-300 mt-3">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-1 w-8 rounded bg-purple-500" />
                  <span>available</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-1 w-8 rounded bg-red-500" />
                  <span>fully booked</span>
                </div>
              </div>
          </div>
          )}

          {/* Details form only after choosing a time */}
          {barber && date && time && (
          <div>
            <form ref={formRef} className="grid gap-3" onSubmit={(e) => e.preventDefault()}>
              <label className="block">
                <span className="text-sm">Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`block mt-1 p-3 border rounded-md w-full bg-transparent text-white border-white/10`}
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm">Phone</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`block mt-1 p-3 border rounded-md w-full bg-transparent text-white border-white/10`}
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm">Email (optional)</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`block mt-1 p-3 border rounded-md w-full bg-transparent text-white border-white/10`}
                />
              </label>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="hidden sm:block">
                <button
                  type="button"
                  disabled={!canSubmit || slots.length === 0}
                  onClick={onConfirm}
                  className="mt-1 px-4 py-2 rounded-md bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-400 disabled:text-white/80 disabled:cursor-not-allowed"
                >
                  {submitting ? "Booking…" : "Confirm and book"}
                </button>
              </div>
            </form>
          </div>
          )}
        </div>

        {/* Mobile sticky confirm bar */}
        {date && time && (
          <div className="sm:hidden sticky bottom-0 left-0 right-0 bg-black/90 backdrop-blur border-t border-white/10 p-3">
            <button
              type="button"
              disabled={!canSubmit || slots.length === 0}
              onClick={onConfirm}
              className="w-full px-4 py-3 rounded-md bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-400 disabled:text-white/80 disabled:cursor-not-allowed"
            >
              {submitting ? "Booking…" : "Confirm and book"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
