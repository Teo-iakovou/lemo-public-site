"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Calendar from "./Calendar";
import PhoneInputIntl from "./PhoneInputIntl";
import { getServices, getAvailability, getHorizonAvailability, createAppointment } from "../lib/api";

export default function BookingModal({ open, onClose }) {
  const router = useRouter();
  const debugEnabled = (() => {
    if (typeof window === 'undefined') return false;
    try { return new URLSearchParams(window.location.search).get('debug') === '1'; } catch { return false; }
  })();
  const [services, setServices] = useState([]);
  const serviceId = services[0]?.id || services[0]?._id || "";

  const [barber, setBarber] = useState("");
  const [barberChoice, setBarberChoice] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [slotsByDate, setSlotsByDate] = useState({});
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [time, setTime] = useState("");
  const [lastTime, setLastTime] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [render, setRender] = useState(false);

  // Dynamic step title shown in the modal header to save vertical space
  const stepTitle = useMemo(() => {
    if (!barber) return 'Choose your barber';
    if (barber && !date) return 'Choose your date';
    if (barber && date && !time) return 'Choose your time';
    return 'Your details';
  }, [barber, date, time]);

  const HORIZON_DAYS = 14;
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  // Use local Y-M-D to avoid UTC shifting yesterday into "today"
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  // Allow navigation through the end of next month
  const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
  const maxDate = `${endOfNextMonth.getFullYear()}-${String(endOfNextMonth.getMonth() + 1).padStart(2, '0')}-${String(endOfNextMonth.getDate()).padStart(2, '0')}`;

  function toGreekBarber(id) {
    if (!id) return "";
    if (id === "Lemo") return "ΛΕΜΟ";
    if (id === "Forou") return "ΦΟΡΟΥ";
    return id;
  }
  function toBarberId(id) {
    if (!id) return "";
    if (id === "Lemo") return "lemo";
    if (id === "Forou") return "forou";
    return String(id).toLowerCase();
  }

  // Prefetch services when the modal opens
  useEffect(() => {
    if (!open) return;
    let mounted = true;
    getServices()
      .then((data) => {
        if (!mounted) return;
        const list = Array.isArray(data) ? data : data?.services || [];
        setServices(list);
      })
      .catch(() => setServices([]));
    return () => {
      mounted = false;
    };
  }, [open]);

  // Smooth pop-in animation on open
  useEffect(() => {
    if (open) {
      setRender(true);
      setAnimateIn(false);
      const id = requestAnimationFrame(() => setAnimateIn(true));
      return () => cancelAnimationFrame(id);
    } else {
      // Animate out, then unmount after transition
      setAnimateIn(false);
      const timeout = setTimeout(() => setRender(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  // Load slots when date changes (use preloaded map when available)
  useEffect(() => {
    let mounted = true;
    async function run() {
      if (!serviceId || !date) return;
      const hasPre = Object.prototype.hasOwnProperty.call(slotsByDate, date);
      if (debugEnabled) console.debug('[Booking] date-change', { barberId: toBarberId(barber), date, hasPre, preCount: hasPre ? (slotsByDate[date]?.length ?? 0) : undefined });
      if (hasPre) {
        if (mounted) {
          setSlots(slotsByDate[date]);
          setLoadingSlots(false);
        }
        return;
      }
      setLoadingSlots(true);
      try {
        if (debugEnabled) console.debug('[Booking] fetch per-day', { date, barberId: toBarberId(barber) });
        const res = await getAvailability({ serviceId, date, barberId: toBarberId(barber) });
        const arr = Array.isArray(res) ? res : res?.slots || [];
        if (mounted) {
          setSlots(arr);
          setSlotsByDate((m) => ({ ...m, [date]: arr }));
        }
      } catch (e) {
        if (mounted) setSlots([]);
      } finally {
        if (mounted) setLoadingSlots(false);
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, [serviceId, date, barber, slotsByDate]);

  // Prefetch availability counts and per-day slots via horizon; prefill first available
  const [highlights, setHighlights] = useState({});
  const [loadingHints, setLoadingHints] = useState(false);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [blockCalendar, setBlockCalendar] = useState(false);
  useEffect(() => {
    let aborted = false;
    async function run() {
      if (!open || !serviceId || !barber) return;
      // Seed from SSR bundle if present for instant paint
      const initial = typeof window !== 'undefined' ? window.__BOOKING_INITIAL : null;
      try {
        if (initial) {
          const key = barber === 'Lemo' ? 'LEMO' : 'FOROU';
          const pack = initial[key];
          // Support both old (direct bundle) and new (current/next) shapes
          const bundles = [];
          if (pack && (pack.current || pack.next)) {
            if (pack.current) bundles.push(pack.current);
            if (pack.next) bundles.push(pack.next);
          } else if (pack) {
            bundles.push(pack);
          }
          for (const bundle of bundles) {
            if (bundle && bundle.counts) setHighlights((prev) => ({ ...prev, ...bundle.counts }));
            const map = bundle?.slots || {};
            if (map && Object.keys(map).length) setSlotsByDate((prev) => ({ ...prev, ...map }));
          }
          // Seed firstAvailable from current month only when not preset
          const current = pack?.current || pack; // prefer current
          if (current && current.firstAvailable && !date) {
            setDate(current.firstAvailable.date);
            const s = Array.isArray(current.firstAvailable.slots) ? current.firstAvailable.slots : [];
            setSlots(s);
            setSlotsByDate((m) => ({ ...m, [current.firstAvailable.date]: s }));
          }
        }
      } catch {}

      // If we don't yet have counts, block calendar and show spinner first
      setLoadingHints(true);
      const initKey = barber === 'Lemo' ? 'LEMO' : 'FOROU';
      const hasCounts = initial && (
        (initial[initKey]?.current && initial[initKey].current.counts) ||
        (initial[initKey]?.counts)
      );
      if (!hasCounts) {
        setBlockCalendar(true);
      }
      // Fetch full current month and prefetch next month in background
      const currMonthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const nextMonthStart = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
      // Use a stable 35-day window to overlap next month a bit
      try {
        // Fetch current and next month in parallel for snappier load
        const [data, nxt] = await Promise.all([
          getHorizonAvailability({ start: currMonthStart, days: 35, barberId: toBarberId(barber), include: 'slots' }),
          getHorizonAvailability({ start: nextMonthStart, days: 35, barberId: toBarberId(barber), include: 'slots' })
        ]);
        if (aborted) return;
        const counts = data?.counts || {};
        const map = data?.slots || {};
        const nCounts = nxt?.counts || {};
        const nMap = nxt?.slots || {};
        if (debugEnabled) console.debug('[Booking] horizon merge', {
          barberId: toBarberId(barber),
          currDays: Object.keys(counts).length,
          nextDays: Object.keys(nCounts).length,
          currSlotsDays: Object.keys(map).length,
          nextSlotsDays: Object.keys(nMap).length,
        });
        // Replace state instead of merging to avoid mixing barbers' data
        setHighlights({ ...(counts || {}), ...(nCounts || {}) });
        setSlotsByDate({ ...(map || {}), ...(nMap || {}) });
        // Prefill first available selection and slots when picking a barber
        const first = data?.firstAvailable;
        if (first && !date) {
          setDate(first.date);
          setSlots(Array.isArray(first.slots) ? first.slots : []);
          setLoadingSlots(false);
          if (debugEnabled) console.debug('[Booking] prefill firstAvailable', { date: first.date, count: (first.slots || []).length });
        }
      } catch (_) {
        if (!aborted) setHighlights({});
      } finally {
        if (!aborted) {
          setLoadingHints(false);
          setBlockCalendar(false);
        }
      }
    }
    run();
    return () => { aborted = true; };
  }, [open, serviceId, barber, today, HORIZON_DAYS]);

  // When the modal closes, reset barber and selection so user must choose again
  useEffect(() => {
    if (!open) {
      setBarber("");
      setBarberChoice("");
      setDate("");
      setTime("");
      setLastTime("");
      setSlots([]);
      setSlotsByDate({});
      setHighlights({});
      setLoadingHints(false);
      setLoadingSlots(false);
      setBlockCalendar(false);
      setError("");
      setSubmitting(false);
      setName("");
      setPhone("");
      setEmail("");
    }
  }, [open]);

  async function onConfirm() {
    if (!serviceId || !date || !time || !name || !phone) return;
    setSubmitting(true);
    setError("");
    try {
      const dateTime = `${date}T${time}`;
      const payload = { serviceId, dateTime, name, phone, barber: toGreekBarber(barber) };
      if (email) payload.email = email;
      const result = await createAppointment(payload);
      const id = result?.id || result?._id || "";
      const p = new URLSearchParams();
      if (id) p.set("id", id);
      // Navigate first; do not close the modal before routing to avoid a brief flash of the home page
      router.push(`/success?${p.toString()}`);
    } catch (e) {
      setError(e.message || "Failed to create appointment");
    } finally {
      setSubmitting(false);
    }
  }

  if (!render) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${animateIn ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Panel: full screen on mobile, centered card on larger screens */}
      <div
        className={`absolute inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full h-full sm:h-auto sm:w-[720px] bg-black sm:rounded-xl border border-white/10 overflow-hidden transform transition-transform transition-opacity duration-300 ease-out ${animateIn ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
          <div className="font-display text-lg">{stepTitle}</div>
          <button onClick={onClose} className="px-2 py-1 rounded border border-white/10 text-sm">Close</button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 grid grid-cols-1 gap-6">
          {/* Step 1: Barber selection */}
          {!barber && (
            <div className="sm:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 place-items-center">
                {[{ id: "Lemo", name: "Lemo" }, { id: "Forou", name: "Forou" }].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBarberChoice(b.id)}
                    className={`relative p-5 sm:p-4 border rounded-2xl text-center hover:bg-white/5 shadow-sm flex flex-col items-center w-[360px] sm:w-[300px] mx-auto ${barberChoice === b.id ? 'border-purple-500' : 'border-white/20'}`}
                  >
                    <div className={"h-44 w-44 sm:h-44 sm:w-44 rounded-full overflow-hidden bg-white/10 border border-white/10 transition-shadow"}
                    >
                      <img
                        src={b.id === 'Lemo' ? '/DSC_0275.JPG' : '/DSC_0262.JPG'}
                        alt={b.name}
                        className={`w-full h-full object-cover object-center ${b.id === 'Forou' ? 'transform scale-110' : ''}`}
                      />
                    </div>
                    <div className="h-px w-11/12 my-3 sm:my-2 bg-white/15" />
                    <div className="font-extrabold tracking-wide uppercase text-sm sm:text-base">{b.name}</div>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  disabled={!barberChoice}
                  onClick={() => {
                    setBarber(barberChoice);
                    setDate("");
                    setTime("");
                    setLastTime("");
                    setHighlights({});
                    setSlotsByDate({});
                    setLoadingHints(true);
                    setLoadingMonth(false);
                    setBlockCalendar(true);
                  }}
                  className={`px-4 py-2 rounded-md ${barberChoice ? 'bg-white text-black hover:bg-neutral-200' : 'bg-neutral-400 text-white/80 cursor-not-allowed'}`}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Left: Calendar */}
          {barber && !time && (
          <div className="relative">
            <div
              className={`transition-opacity duration-300 ease-out ${
                blockCalendar ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            >
              <Calendar
                value={date}
              onChange={(ds) => {
                setDate(ds);
                setTime("");
                // If we already have preloaded slots (even empty array), suppress spinner
                if (Object.prototype.hasOwnProperty.call(slotsByDate, ds)) setLoadingSlots(false);
              }}
                minDate={minDate}
                maxDate={maxDate}
                closedWeekdays={[0, 1]}
                highlights={highlights}
                onMonthChange={(firstOfMonth) => {
                // When navigating months, warm counts for that visible range
                const start = `${firstOfMonth.getFullYear()}-${String(firstOfMonth.getMonth() + 1).padStart(2, '0')}-01`;
                // Decide if we already have full month data (counts + slots) to avoid spinner
                const daysInMonth = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth() + 1, 0).getDate();
                const monthDates = Array.from({ length: daysInMonth }, (_, i) => {
                  const d = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth(), i + 1);
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  return `${y}-${m}-${day}`;
                });
                const countsLoaded = monthDates.every((ds) => Object.prototype.hasOwnProperty.call(highlights, ds));
                const slotsLoaded = monthDates.every((ds) => Object.prototype.hasOwnProperty.call(slotsByDate, ds));
                const needSpinner = !(countsLoaded && slotsLoaded);
                if (needSpinner) {
                  setLoadingMonth(true);
                  setBlockCalendar(true);
                }
                getHorizonAvailability({ start, days: 35, barberId: toBarberId(barber), include: 'slots' })
                  .then((data) => {
                    const counts = data?.counts || {};
                    setHighlights((prev) => ({ ...prev, ...counts }));
                    const map = data?.slots || {};
                    if (map && Object.keys(map).length) {
                      setSlotsByDate((prev) => ({ ...prev, ...map }));
                    }
                    // Background prefetch one more month ahead
                    const nextMonth = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth() + 1, 1);
                    const nextStart = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
                    getHorizonAvailability({ start: nextStart, days: 35, barberId: toBarberId(barber), include: 'slots' })
                      .then((nxt) => {
                        const nCounts = nxt?.counts || {};
                        const nMap = nxt?.slots || {};
                        if (Object.keys(nCounts).length) setHighlights((prev) => ({ ...prev, ...nCounts }));
                        if (Object.keys(nMap).length) setSlotsByDate((prev) => ({ ...prev, ...nMap }));
                      })
                      .catch(() => {});
                  })
                  .catch(() => {})
                  .finally(() => {
                    if (needSpinner) {
                      setLoadingMonth(false);
                      setBlockCalendar(false);
                    }
                  });
              }}
              />
            </div>
            {(blockCalendar && (loadingMonth || loadingHints)) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-200 ease-out opacity-100">
                <div
                  aria-label="Loading availability"
                  className="h-6 w-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"
                />
              </div>
            )}
            
          </div>
          )}

          {/* Right: Slots + Details */}
          <div>
            {!time && barber && date && (
              <div>
                <div className="text-sm mb-2">
                  Select time for
                  {" "}
                  <span className="text-purple-500 font-semibold">
                    {new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
                  </span>
                </div>
                {
                  <div className="flex flex-wrap gap-2">
                    {slots.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => { setLastTime(t); }}
                        className={`relative px-3 py-2 rounded-md border text-sm ${
                          (time ? time === t : lastTime === t)
                            ? "border-2 border-purple-500 text-white bg-purple-600/20 shadow-[0_0_0_2px_rgba(168,85,247,0.4)]"
                            : "border-white/20 hover:bg-white/10"
                          }`}
                      >
                        {t}
                        {(time ? time === t : lastTime === t) && (
                          <span
                            aria-hidden
                            className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-purple-500 text-black flex items-center justify-center text-[10px]"
                          >
                            ✓
                          </span>
                        )}
                      </button>
                    ))}
                    {(!loadingSlots && slots.length === 0) && (
                      <p className="text-sm text-neutral-400">No free slots</p>
                    )}
                  </div>
                }
                {/* Bottom controls under time slots: Prev (left) and Next (right) */}
                <div className="mt-4 flex items-center justify-between">
                  {/* Prev: back to barber selection */}
                  <button
                    type="button"
                    onClick={() => { 
                      setBarber("");
                      setBarberChoice("");
                      setDate(""); 
                      setTime(""); 
                      setLastTime(""); 
                      setBlockCalendar(false);
                    }}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-white/20 hover:bg-white/10"
                    aria-label="Back to barber"
                    title="Back"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M12.78 16.28a.75.75 0 0 1-1.06 0l-6-6a.75.75 0 0 1 0-1.06l6-6a.75.75 0 1 1 1.06 1.06L7.81 9.25H16a.75.75 0 0 1 0 1.5H7.81l4.97 4.97a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    disabled={!lastTime}
                    onClick={() => lastTime && setTime(lastTime)}
                    className={`h-9 w-9 inline-flex items-center justify-center rounded-md ${
                      lastTime
                        ? "bg-white text-black hover:bg-neutral-200"
                        : "bg-neutral-400 text-white/80 cursor-not-allowed"
                    }`}
                    aria-label="Next"
                    title="Next"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M7.22 3.72a.75.75 0 0 1 1.06 0l6 6a.75.75 0 0 1 0 1.06l-6 6a.75.75 0 1 1-1.06-1.06L12.19 10.75H4a.75.75 0 0 1 0-1.5h8.19L7.22 4.78a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {time && (
            <form className="grid gap-3 mt-4" onSubmit={(e) => e.preventDefault()}>
              {/* Selection summary */}
              <div className="p-3 border border-white/10 rounded-md bg-white/5 text-sm flex flex-wrap gap-x-4 gap-y-1">
                <div>
                  <span className="text-neutral-400">Barber:</span> {barber || '-'}
                </div>
                <div>
                  <span className="text-neutral-400">Date:</span> {date ? new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) : '-'}
                </div>
                <div>
                  <span className="text-neutral-400">Time:</span> {time || '-'}
                </div>
                <div>
                  <span className="text-neutral-400">Service:</span> {services[0]?.name || 'Haircut'}
                </div>
              </div>
              <label className="block">
                <div className="mt-1 flex items-center gap-2 p-2 rounded-md border border-white/10 bg-white/5 focus-within:border-purple-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-neutral-300">
                    <path fillRule="evenodd" d="M10 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 14a6 6 0 1 1 12 0v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-1Z" clipRule="evenodd" />
                  </svg>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name"
                    className="flex-1 bg-transparent text-white placeholder:text-neutral-400 outline-none border-0"
                    required
                  />
                </div>
              </label>
              <label className="block">
                <PhoneInputIntl
                  id="booking-phone"
                  value={phone}
                  onChange={setPhone}
                  defaultCountry="CY"
                />
              </label>
              <label className="block">
                <div className="mt-1 flex items-center gap-2 p-2 rounded-md border border-white/10 bg-white/5 focus-within:border-purple-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-neutral-300">
                    <path d="M1.94 6.94A2.5 2.5 0 0 1 4.44 4.5h11.12a2.5 2.5 0 0 1 2.5 2.44l-7.06 4.41a1.5 1.5 0 0 1-1.58 0L1.94 6.94Z" />
                    <path d="M18 8.86V13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.86l6.35 3.97a3 3 0 0 0 3.3 0L18 8.86Z" />
                  </svg>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email (optional)"
                    className="flex-1 bg-transparent text-white placeholder:text-neutral-400 outline-none border-0"
                  />
                </div>
              </label>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="mt-6 flex items-center">
                <button
                  type="button"
                  onClick={() => setTime("")}
                  className="px-3 py-2 rounded-md border border-white/20 text-white hover:bg-white/10 inline-flex items-center gap-2"
                  aria-label="Back to times"
                  title="Back"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M10.78 3.22a.75.75 0 0 1 0 1.06L5.56 9.5H17a.75.75 0 0 1 0 1.5H5.56l5.22 5.22a.75.75 0 1 1-1.06 1.06l-6.5-6.5a.75.75 0 0 1 0-1.06l6.5-6.5a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  type="button"
                  disabled={!serviceId || !date || !time || !name || !phone || submitting}
                  onClick={onConfirm}
                  className="ml-auto px-4 py-2 rounded-md bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-400 disabled:text-white/80 disabled:cursor-not-allowed"
                >
                  {submitting ? "Booking…" : "Confirm and book"}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
