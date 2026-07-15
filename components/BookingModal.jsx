"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Calendar from "./Calendar";
import PhoneInputIntl from "./PhoneInputIntl";
import WaitlistModal from "./WaitlistModal";
import {
  getServices,
  getAvailability,
  getHorizonAvailability,
  createAppointment,
  getPublicSettings,
  rescheduleAppointment,
} from "../lib/api";
import {
  DEFAULT_PUBLIC_SETTINGS,
  VISIBLE_MONTH_LIMITS,
  resolveScopedList,
  toBarberSettingsKey,
} from "../lib/publicSettings";
import { useAuth } from "./AuthProvider";
import { useLanguage } from "./LanguageProvider";
import { mapCommonErrorMessage } from "../lib/i18n";

const ATHENS_TIME_ZONE = "Europe/Athens";

function toAthensDateParts(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: ATHENS_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const map = {};
    parts.forEach((part) => {
      if (part.type !== "literal") {
        map[part.type] = part.value;
      }
    });
    return {
      date: `${map.year}-${map.month}-${map.day}`,
      time: `${map.hour}:${map.minute}`,
    };
  } catch {
    return null;
  }
}

function fromGreekBarberName(value = "") {
  if (!value) return "";
  const normalized = value.toString().trim().toUpperCase();
  if (normalized.includes("ΛΕΜ")) return "Lemo";
  if (normalized.includes("ΦΟΡ")) return "Forou";
  if (normalized.includes("ΚΟΥΣ")) return "Koushis";
  return value;
}

export default function BookingModal({ open, onClose, editAppointment }) {
  const { t, locale } = useLanguage();
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
  const [publicSettings, setPublicSettings] = useState(DEFAULT_PUBLIC_SETTINGS);
  const [loadingPublicSettings, setLoadingPublicSettings] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(""); // deprecated in UI; kept for compatibility
  const [time, setTime] = useState("");
  const [lastTime, setLastTime] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [render, setRender] = useState(false);
  const [animateForm, setAnimateForm] = useState(false);
  const [waitlistToast, setWaitlistToast] = useState("");
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const bodyLockRef = useRef(null);
  const confirmingRef = useRef(false);
  const { user } = useAuth();
  const [editContext, setEditContext] = useState(null);
  const [editRequiresSelection, setEditRequiresSelection] = useState(false);
  const editPrefilledRef = useRef(false);

  // Public settings drive barber pricing; fallback keeps booking safe if settings are missing.
  const PRICES = useMemo(() => {
    const defaults = { lemo: 15, forou: 15 };
    const map = publicSettings?.barberPrices || {};
    return {
      lemo: Number.isFinite(Number(map.LEMO)) ? Number(map.LEMO) : defaults.lemo,
      forou: Number.isFinite(Number(map.FOROU)) ? Number(map.FOROU) : defaults.forou,
      // Koushis price is intentionally hidden for now.
      koushis: null,
    };
  }, [publicSettings]);
  function formatEuro(v) {
    try {
      return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
    } catch {
      return `€${v}`;
    }
  }

  function resetModalState() {
    editPrefilledRef.current = false;
    setEditRequiresSelection(false);
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
    setWaitlistToast("");
    setWaitlistOpen(false);
  }

  const editingActive = Boolean(editContext?.id);

  // Dynamic step title shown in the modal header to save vertical space
  const stepTitle = useMemo(() => {
    const base = (!barber)
      ? t("booking.step.selectBarber")
      : (!date)
        ? t("booking.step.selectDate")
        : (!time)
          ? t("booking.step.selectTime")
          : t("booking.step.yourDetails");
    const prefix = editingActive ? t("booking.step.editPrefix") : "";
    if (!barber) return `${prefix}${base}`;
    const price = PRICES[toBarberId(barber)];
    const full = price ? `${base} — ${formatEuro(price)}` : base;
    return `${prefix}${full}`.trim();
  }, [barber, date, time, editingActive, t]);
  const confirmButtonLabel = editingActive
    ? submitting
      ? t("booking.buttons.saving")
      : editContext?.locked
      ? t("booking.buttons.editLocked")
      : t("booking.buttons.confirmChanges")
    : submitting
    ? t("booking.buttons.creating")
    : t("booking.buttons.confirmAndBook");

  const HORIZON_DAYS = 14;
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  // Use local Y-M-D to avoid UTC shifting yesterday into "today"
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const visibleMonthCount = useMemo(() => {
    const raw = Number(publicSettings.visibleMonthCount);
    if (!Number.isFinite(raw)) return DEFAULT_PUBLIC_SETTINGS.visibleMonthCount;
    const clamped = Math.min(
      VISIBLE_MONTH_LIMITS.max,
      Math.max(VISIBLE_MONTH_LIMITS.min, Math.floor(raw))
    );
    return clamped;
  }, [publicSettings.visibleMonthCount]);
  // Allow navigation through the configured number of months (current month counts as the first)
  const endOfVisibleRange = new Date(
    today.getFullYear(),
    today.getMonth() + visibleMonthCount,
    0
  );
  const maxDate = `${endOfVisibleRange.getFullYear()}-${String(
    endOfVisibleRange.getMonth() + 1
  ).padStart(2, "0")}-${String(endOfVisibleRange.getDate()).padStart(2, "0")}`;
  const selectedBarberKey = useMemo(
    () => toBarberSettingsKey(toBarberId(barber) || barber),
    [barber]
  );
  const closedMonthsSet = useMemo(
    () =>
      new Set(
        resolveScopedList(
          publicSettings,
          "barberClosedMonths",
          "closedMonths",
          selectedBarberKey
        )
      ),
    [publicSettings, selectedBarberKey]
  );
  const blockedDatesSet = useMemo(
    () =>
      new Set(
        resolveScopedList(
          publicSettings,
          "barberBlockedDates",
          "blockedDates",
          selectedBarberKey
        )
      ),
    [publicSettings, selectedBarberKey]
  );
  const allowedDatesSet = useMemo(
    () => new Set(publicSettings.allowedDates || []),
    [publicSettings.allowedDates]
  );
  const whitelistDatesSet = useMemo(
    () => new Set(Object.keys(publicSettings.specialDayHours || {})),
    [publicSettings.specialDayHours]
  );
  const extraDatesSet = useMemo(
    () => new Set(Object.keys(publicSettings.extraDaySlots || {})),
    [publicSettings.extraDaySlots]
  );
  const manualOpenDatesSet = useMemo(() => {
    const next = new Set();
    allowedDatesSet.forEach((value) => next.add(value));
    whitelistDatesSet.forEach((value) => next.add(value));
    extraDatesSet.forEach((value) => next.add(value));
    return next;
  }, [allowedDatesSet, whitelistDatesSet, extraDatesSet]);
  const blockedDatesList = useMemo(() => Array.from(blockedDatesSet), [blockedDatesSet]);
  const disabledMonthsList = useMemo(() => Array.from(closedMonthsSet), [closedMonthsSet]);
  const manualOpenDatesList = useMemo(() => Array.from(manualOpenDatesSet), [manualOpenDatesSet]);
  const isDateManuallyClosed = useCallback(
    (ds) => {
      if (!ds) return false;
      if (blockedDatesSet.has(ds)) return true;
      const parsed = new Date(`${ds}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) return blockedDatesSet.has(ds);
      const monthClosed = closedMonthsSet.has(parsed.getMonth());
      return monthClosed && !manualOpenDatesSet.has(ds);
    },
    [blockedDatesSet, closedMonthsSet, manualOpenDatesSet]
  );
  const isDateManuallyOpen = useCallback(
    (ds) => manualOpenDatesSet.has(ds),
    [manualOpenDatesSet]
  );

  useEffect(() => {
    if (!waitlistToast) return;
    const timer = setTimeout(() => setWaitlistToast(""), 3500);
    return () => clearTimeout(timer);
  }, [waitlistToast]);

  const handleWaitlistSuccess = useCallback(() => {
    setWaitlistToast(t("booking.toasts.waitlistSuccess"));
  }, [t]);

  function toGreekBarber(id) {
    if (!id) return "";
    if (id === "Lemo") return t("booking.barberNames.lemoUpper");
    if (id === "Forou") return t("booking.barberNames.forouUpper");
    if (id === "Koushis") return t("booking.barberNames.koushisUpper");
    return id;
  }
  function toBarberId(id) {
    if (!id) return "";
    if (id === "Lemo") return "lemo";
    if (id === "Forou") return "forou";
    if (id === "Koushis") return "koushis";
    return String(id).toLowerCase();
  }

  // UI display names in Greek (title case), keep payload mapping separate
  function toGreekBarberUI(name) {
    if (!name) return "";
    if (name === "Lemo") return t("booking.barberNames.lemoUi");
    if (name === "Forou") return t("booking.barberNames.forouUi");
    if (name === "Koushis") return t("booking.barberNames.koushisUi");
    return name;
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

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoadingPublicSettings(true);
    getPublicSettings()
      .then((data) => {
        if (!cancelled && data) {
          setPublicSettings(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPublicSettings(DEFAULT_PUBLIC_SETTINGS);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingPublicSettings(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Preload barber images as soon as modal opens for instant paint
  useEffect(() => {
    if (!open) return;
    ["/team/lemo.jpg", "/team/forou.jpg", "/team/koushis.jpg"].forEach((src) => {
      try {
        const img = new Image();
        img.decoding = "async";
        img.src = src;
      } catch {}
    });
  }, [open]);

  // Ensure we always start from the barber selection when opening
  useEffect(() => {
    if (open) {
      resetModalState();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (user?.displayName) {
      setName((prev) => prev || user.displayName);
    }
    if (user?.phoneNumber) {
      setPhone((prev) => prev || user.phoneNumber);
    }
  }, [open, user]);

  useEffect(() => {
    if (!open) {
      setEditContext(null);
      setEditRequiresSelection(false);
      editPrefilledRef.current = false;
      return;
    }
    if (!editAppointment) {
      setEditContext(null);
      editPrefilledRef.current = false;
      return;
    }
    const apptDateTime = editAppointment.appointmentDateTime || editAppointment.dateTime || "";
    const parts = toAthensDateParts(apptDateTime);
    const cutoffMs = 24 * 60 * 60 * 1000;
    const isLocked =
      typeof editAppointment.locked === "boolean"
        ? editAppointment.locked
        : (() => {
            const timestamp = Date.parse(apptDateTime);
            if (!Number.isFinite(timestamp)) return false;
            return timestamp - Date.now() < cutoffMs;
          })();
    const nextContext = {
      id: editAppointment.id || editAppointment._id || editAppointment.appointmentId,
      barber: editAppointment.barber,
      uiBarber: fromGreekBarberName(editAppointment.barber),
      date: parts?.date || "",
      time: parts?.time || "",
      customerName: editAppointment.customerName || "",
      originalDateTime: apptDateTime,
      locked: isLocked,
    };
    setEditContext(nextContext);
    if (nextContext.uiBarber) {
      setBarberChoice(nextContext.uiBarber);
    }
    if (nextContext.customerName) {
      setName(nextContext.customerName);
    }
    editPrefilledRef.current = false;
    setEditRequiresSelection(true);
  }, [open, editAppointment]);

  useEffect(() => {
    if (!open || !editContext || !barber) return;
    if (editPrefilledRef.current) return;
    if (editContext.uiBarber && editContext.uiBarber !== barber) return;
    if (editContext.date) {
      setDate(editContext.date);
    }
    if (!editRequiresSelection && editContext.time) {
      setTime(editContext.time);
      setLastTime(editContext.time);
    }
    editPrefilledRef.current = true;
  }, [open, editContext, barber, editRequiresSelection]);

  useEffect(() => {
    if (!barber) {
      editPrefilledRef.current = false;
    }
  }, [barber]);

  useEffect(() => {
    if (time && editRequiresSelection) {
      setEditRequiresSelection(false);
    }
  }, [time, editRequiresSelection]);

  useEffect(() => {
    if (date && isDateManuallyClosed(date)) {
      setTime("");
      setSlots([]);
    }
  }, [date, isDateManuallyClosed]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return undefined;
    const body = document.body;
    const prev = Number(body.dataset.modalLockCount || 0);
    if (prev === 0) {
      bodyLockRef.current = {
        top: body.style.top,
        position: body.style.position,
        width: body.style.width,
        overflow: body.style.overflow,
        scrollY: window.scrollY,
      };
      body.style.top = `-${window.scrollY}px`;
      body.style.position = "fixed";
      body.style.width = "100%";
      body.style.overflow = "hidden";
    }
    body.dataset.modalLockCount = String(prev + 1);

    return () => {
      const count = Number(body.dataset.modalLockCount || 1) - 1;
      if (count <= 0) {
        const state = bodyLockRef.current || {};
        body.style.position = state.position || "";
        body.style.width = state.width || "";
        body.style.top = state.top || "";
        body.style.overflow = state.overflow || "";
        body.removeAttribute("data-modal-lock-count");
        const y = state.scrollY || 0;
        window.scrollTo(0, y);
        bodyLockRef.current = null;
      } else {
        body.dataset.modalLockCount = String(count);
      }
    };
  }, [open]);

  // Fade-in animation for the details form when entering the final step
  useEffect(() => {
    if (time) {
      setAnimateForm(false);
      const id = requestAnimationFrame(() => setAnimateForm(true));
      return () => cancelAnimationFrame(id);
    } else {
      setAnimateForm(false);
    }
  }, [time]);

  // Smooth pop-in animation on open (double rAF to ensure first paint applies)
  useEffect(() => {
    if (open) {
      setRender(true);
      setAnimateIn(false);
      let id1, id2;
      id1 = requestAnimationFrame(() => {
        id2 = requestAnimationFrame(() => setAnimateIn(true));
      });
      return () => {
        if (id1) cancelAnimationFrame(id1);
        if (id2) cancelAnimationFrame(id2);
      };
    } else {
      // Animate out, then unmount after transition (match transition duration)
      setAnimateIn(false);
      const timeout = setTimeout(() => {
        setRender(false);
        resetModalState();
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  // Load slots when date changes (use preloaded map when available)
  useEffect(() => {
    let mounted = true;
    async function run() {
      if (!date || !barber) return;
      if (isDateManuallyClosed(date)) {
        setSlots([]);
        setLoadingSlots(false);
        setSlotsByDate((prev) => {
          if (!prev[date]) return prev;
          const next = { ...prev };
          delete next[date];
          return next;
        });
        return;
      }
      const hasPre = Object.prototype.hasOwnProperty.call(slotsByDate, date);
      if (debugEnabled) console.debug('[Booking] date-change', { barberId: toBarberId(barber), date, hasPre, preCount: hasPre ? (slotsByDate[date]?.length ?? 0) : undefined });
      // Show any preloaded slots immediately for snappy UI, but still refresh from per-day endpoint
      if (hasPre && mounted) {
        setSlots(slotsByDate[date]);
      }
      setLoadingSlots(true);
      try {
        if (debugEnabled) console.debug('[Booking] fetch per-day (fresh)', { date, barberId: toBarberId(barber) });
        const res = await getAvailability({ serviceId, date, barberId: toBarberId(barber) });
        const arr = Array.isArray(res) ? res : res?.slots || [];
        if (mounted) {
          setSlots(arr);
          setSlotsByDate((m) => ({ ...m, [date]: arr }));
          // Reflect fresh availability in the calendar bar for the selected day
          setHighlights((m) => ({ ...m, [date]: arr.length }));
        }
      } catch (e) {
        if (mounted && !hasPre) setSlots([]);
      } finally {
        if (mounted) setLoadingSlots(false);
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, [serviceId, date, barber, isDateManuallyClosed]);

  // Prefetch availability counts and per-day slots via horizon; prefill first available
  const [highlights, setHighlights] = useState({});
  const [loadingHints, setLoadingHints] = useState(false);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [blockCalendar, setBlockCalendar] = useState(false);
  const calendarBusy = blockCalendar || loadingPublicSettings;
  const calendarHighlights = useMemo(() => {
    if (!blockedDatesSet.size) return highlights;
    const next = { ...highlights };
    blockedDatesSet.forEach((ds) => {
      next[ds] = 0;
    });
    return next;
  }, [highlights, blockedDatesSet]);

  // Utility: list all YYYY-MM-DD dates for a given month start string
  function listMonthDates(monthStartStr) {
    try {
      const [y, m] = monthStartStr.split('-').map(Number);
      const daysInMonth = new Date(y, m, 0).getDate();
      const out = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(y, m - 1, d);
        out.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`);
      }
      return out;
    } catch {
      return [];
    }
  }

  async function verifyZeroDays(dates, barberId) {
    // Double-check days that show 0 to avoid false "fully booked" indicators
    if (!barberId) return;
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const openWeekdays = new Set([2,3,4,5,6]); // Tue-Sat
    const targets = dates
      .filter((ds) => ds >= todayStr)
      .filter((ds) => {
        const d = new Date(ds + 'T00:00:00');
        if (isDateManuallyClosed(ds)) return false;
        if (isDateManuallyOpen(ds)) return true;
        return openWeekdays.has(d.getDay());
      })
      .filter((ds) => (highlights[ds] === 0))
      .filter((ds) => !Object.prototype.hasOwnProperty.call(slotsByDate, ds));
    const MAX_VERIFY = 12;
    const limited = targets.slice(0, MAX_VERIFY);
    const CHUNK = 4;
    for (let i = 0; i < limited.length; i += CHUNK) {
      const part = limited.slice(i, i + CHUNK);
      const results = await Promise.all(part.map(async (ds) => {
        try {
          const res = await getAvailability({ serviceId, date: ds, barberId });
          const arr = Array.isArray(res) ? res : res?.slots || [];
          return [ds, arr];
        } catch {
          return [ds, null];
        }
      }));
      const nextMap = {};
      const nextCounts = {};
      for (const [ds, arr] of results) {
        if (Array.isArray(arr)) {
          nextMap[ds] = arr;
          nextCounts[ds] = arr.length;
        }
      }
      if (Object.keys(nextMap).length) setSlotsByDate((prev) => ({ ...prev, ...nextMap }));
      if (Object.keys(nextCounts).length) setHighlights((prev) => ({ ...prev, ...nextCounts }));
    }
  }
  useEffect(() => {
    let aborted = false;
    async function run() {
      if (!open || !barber) return;
      // Seed from SSR bundle if present for instant paint
      const initial = typeof window !== 'undefined' ? window.__BOOKING_INITIAL : null;
      try {
        if (initial) {
          const key =
            barber === "Lemo" ? "LEMO" : barber === "Forou" ? "FOROU" : "KOUSHIS";
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
            if (bundle) {
              const counts = bundle.counts || {};
              const map = bundle.slots || {};
              // Overlay counts with lengths from provided slots map to avoid false "fully booked"
              const derived = Object.fromEntries(Object.entries(map).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]));
              const merged = { ...counts, ...derived };
              if (Object.keys(merged).length) setHighlights((prev) => ({ ...prev, ...merged }));
              if (Object.keys(map).length) setSlotsByDate((prev) => ({ ...prev, ...map }));
            }
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
      const initKey =
        barber === "Lemo" ? "LEMO" : barber === "Forou" ? "FOROU" : "KOUSHIS";
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
        // Derive counts from slots maps (more reliable) and overlay on backend counts
        const derived = Object.fromEntries(Object.entries(map).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]));
        const nDerived = Object.fromEntries(Object.entries(nMap).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]));
        const mergedCounts = { ...(counts || {}), ...(nCounts || {}), ...derived, ...nDerived };
        // Replace state instead of merging to avoid mixing barbers' data
        setHighlights({ ...mergedCounts });
        setSlotsByDate({ ...(map || {}), ...(nMap || {}) });
        // Proactively verify a subset of days that appear as 0 (to avoid false purple bars)
        verifyZeroDays(listMonthDates(currMonthStart), toBarberId(barber));
        verifyZeroDays(listMonthDates(nextMonthStart), toBarberId(barber));
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

  // Delay resetting state until after close animation (handled in open-effect)

  async function onConfirm() {
    if (!serviceId || !date || !time || !name || !phone) return;
    if (confirmingRef.current) return;
    confirmingRef.current = true;
    setSubmitting(true);
    setError("");
    try {
      const dateTime = `${date}T${time}`;
      if (editingActive) {
        const rawId = editContext?.id ?? editContext?._id ?? editContext?.appointmentId;
        const appointmentId =
          typeof rawId === "string" ? rawId.trim() : rawId;
        if (!appointmentId) {
          setError(mapCommonErrorMessage("request failed", t));
          return;
        }
        const payload = {
          appointmentDateTime: dateTime,
          dateTime,
          barber: toGreekBarber(barber),
          customerName: name,
          phoneNumber: phone,
        };
        const result = await rescheduleAppointment(appointmentId, payload);
        const updatedId = result?.appointment?._id || result?.id || appointmentId;
        const params = new URLSearchParams();
        if (updatedId) params.set("id", updatedId);
        params.set("mode", "updated");
        router.push(`/success?${params.toString()}`);
      } else {
        const payload = { serviceId, dateTime, name, phone, barber: toGreekBarber(barber) };
        const result = await createAppointment(payload);
        const id = result?.id || result?._id || "";
        const p = new URLSearchParams();
        if (id) p.set("id", id);
        router.push(`/success?${p.toString()}`);
      }
    } catch (e) {
      let msg = e.message || "Failed to complete request";
      try {
        const parsed = JSON.parse(msg);
        if (parsed?.message) msg = parsed.message;
      } catch {}
      setError(msg);
    } finally {
      confirmingRef.current = false;
      setSubmitting(false);
    }
  }

  if (!render) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-1000 ${animateIn ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Panel: full screen on mobile, centered card on larger screens (zoom + fade-in) */}
      <div
        className={`absolute inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full h-full sm:h-auto sm:w-[720px] bg-black sm:rounded-xl border border-white/10 overflow-auto sm:overflow-visible transform-gpu will-change-transform transition-all duration-1000 ease-out ${animateIn ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
          <div className="font-display text-lg">{stepTitle}</div>
          <button onClick={onClose} className="px-2 py-1 rounded border border-white/10 text-sm">{t("common.close")}</button>
        </div>

        {/* Body */}
        <div
          className="p-4 sm:p-6 grid grid-cols-1 gap-6"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
        >
          {/* Step 1: Barber selection */}
          {!barber && (
            <div className="sm:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 place-items-center">
                {[
                  { id: "Lemo", name: "Lemo", image: "/team/lemo.jpg" },
                  { id: "Forou", name: "Forou", image: "/team/forou.jpg" },
                  { id: "Koushis", name: "Koushis", image: "/team/koushis.jpg" },
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBarberChoice(b.id)}
                    className={`relative p-3 sm:p-4 border rounded-2xl text-center hover:bg-white/5 shadow-sm flex flex-col items-center w-[320px] sm:w-[300px] mx-auto ${barberChoice === b.id ? 'border-purple-500' : 'border-white/20'}`}
                  >
                    <div className={"relative h-36 w-36 sm:h-44 sm:w-44 rounded-full overflow-hidden bg-white/10 border border-white/10 transition-shadow"}
                    >
                      <Image
                        src={b.image}
                        alt={b.name}
                        fill
                        priority
                        fetchPriority="high"
                        sizes="(max-width: 640px) 176px, 192px"
                        className="object-cover object-center"
                      />
                    </div>
                    <div className="h-px w-11/12 my-2 sm:my-2 bg-white/15" />
                    <div className="font-extrabold tracking-wide uppercase text-sm">{b.name}</div>
                    {Number.isFinite(PRICES[toBarberId(b.id)]) && (
                      <div className="text-xs sm:text-sm text-white/80 mt-1">
                        {formatEuro(PRICES[toBarberId(b.id)])}
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div
                className="mt-3 flex justify-end"
                style={{ marginBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
              >
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
                calendarBusy ? 'opacity-0 pointer-events-none' : 'opacity-100'
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
                highlights={calendarHighlights}
                disabledMonths={disabledMonthsList}
                blockedDates={blockedDatesList}
                allowedDates={manualOpenDatesList}
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
                    const map = data?.slots || {};
                    const derived = Object.fromEntries(Object.entries(map).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]));
                    const mergedCounts = { ...counts, ...derived };
                    setHighlights((prev) => ({ ...prev, ...mergedCounts }));
                    if (map && Object.keys(map).length) setSlotsByDate((prev) => ({ ...prev, ...map }));
                    // Verify zeros for this visible month to avoid false "fully booked" bars
                    const daysInMonth = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth() + 1, 0).getDate();
                    const monthDates = Array.from({ length: daysInMonth }, (_, i) => {
                      const d = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth(), i + 1);
                      const y = d.getFullYear();
                      const m = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      return `${y}-${m}-${day}`;
                    });
                    verifyZeroDays(monthDates, toBarberId(barber));
                    // Background prefetch one more month ahead
                    const nextMonth = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth() + 1, 1);
                    const nextStart = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
                    getHorizonAvailability({ start: nextStart, days: 35, barberId: toBarberId(barber), include: 'slots' })
                      .then((nxt) => {
                        const nCounts = nxt?.counts || {};
                        const nMap = nxt?.slots || {};
                        const nDerived = Object.fromEntries(Object.entries(nMap).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]));
                        const mergedNext = { ...nCounts, ...nDerived };
                        if (Object.keys(mergedNext).length) setHighlights((prev) => ({ ...prev, ...mergedNext }));
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
            {(calendarBusy && (loadingMonth || loadingHints || loadingPublicSettings)) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-200 ease-out opacity-100">
                <div
                  aria-label={t("booking.labels.loadingAvailability")}
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
                  {t("booking.labels.pickTimeFor")}
                  {" "}
                  <span className="text-purple-500 font-semibold">
                    {new Date(`${date}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long' })}
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
                      <p className="text-sm text-neutral-400">{t("booking.labels.noSlots")}</p>
                    )}
                  </div>
                }
                <div className="mt-4 rounded-2xl border border-white/15 bg-white/5 p-4 text-white">
                  <p className="text-base font-semibold">
                    {t("booking.labels.cantFindTime")}
                  </p>
                  <p className="mt-1 text-sm text-white/70">
                    {t("booking.labels.notifyRelease")}{" "}
                    {date
                      ? new Date(`${date}T00:00:00`).toLocaleDateString(locale, {
                          day: "numeric",
                          month: "long",
                        })
                      : t("booking.labels.selectedDate")}.
                  </p>
                  <button
                    type="button"
                    disabled={!date}
                    onClick={() => setWaitlistOpen(true)}
                    className="mt-3 inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                  >
                    {t("booking.buttons.joinWaitlist")}
                  </button>
                </div>
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
                    aria-label={t("common.back")}
                    title={t("common.back")}
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
                    aria-label={t("common.next")}
                    title={t("common.next")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M7.22 3.72a.75.75 0 0 1 1.06 0l6 6a.75.75 0 0 1 0 1.06l-6 6a.75.75 0 1 1-1.06-1.06L12.19 10.75H4a.75.75 0 0 1 0-1.5h8.19L7.22 4.78a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {time && (
            <form
              className={`grid gap-3 mt-4 transition-opacity duration-500 ease-out ${
                animateForm ? "opacity-100" : "opacity-0"
              } pb-24 sm:pb-0`}
              onSubmit={(e) => e.preventDefault()}
            >
              {/* Selection summary */}
              <div className="p-3 border border-white/10 rounded-md bg-white/5 text-sm flex flex-wrap gap-x-4 gap-y-1">
                <div>
                  <span className="text-neutral-400">{t("booking.labels.barber")}</span> {toGreekBarberUI(barber) || '-'}
                </div>
                <div>
                  <span className="text-neutral-400">{t("booking.labels.date")}</span> {date ? new Date(`${date}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long' }) : '-'}
                </div>
                <div>
                  <span className="text-neutral-400">{t("booking.labels.time")}</span> {time || '-'}
                </div>
                <div>
                  <span className="text-neutral-400">{t("booking.labels.service")}</span> {services[0]?.name || t("booking.labels.defaultService")}
                  {barber && (
                    Number.isFinite(PRICES[toBarberId(barber)]) && (
                      <span className="ml-2 text-neutral-200">— {formatEuro(PRICES[toBarberId(barber)])}</span>
                    )
                  )}
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
                    placeholder={t("booking.labels.namePlaceholder")}
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
              {/* Email field removed from public UI */}
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div
                className="sticky bottom-0 left-0 right-0 z-10 -mx-2 flex items-center gap-3 bg-black/90 px-2 py-3 backdrop-blur-sm sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:py-0"
                style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px))" }}
              >
                <button
                  type="button"
                  onClick={() => setTime("")}
                  className="px-3 py-2 rounded-md border border-white/20 text-white hover:bg-white/10 inline-flex items-center gap-2 sm:mt-0"
                  aria-label={t("common.back")}
                  title={t("common.back")}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M10.78 3.22a.75.75 0 0 1 0 1.06L5.56 9.5H17a.75.75 0 0 1 0 1.5H5.56l5.22 5.22a.75.75 0 1 1-1.06 1.06l-6.5-6.5a.75.75 0 0 1 0-1.06l6.5-6.5a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  type="button"
                  disabled={!serviceId || !date || !time || !name || !phone || submitting || (editingActive && editContext?.locked)}
                  onClick={onConfirm}
                  className="ml-auto px-4 py-2 rounded-md bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-400 disabled:text-white/80 disabled:cursor-not-allowed"
                >
                  {confirmButtonLabel}
                </button>
              </div>
              {editingActive && editContext?.locked && (
                <p className="text-xs text-red-400 mt-2">
                  {t("booking.labels.cannotRescheduleLocked")}
                </p>
              )}
            </form>
            )}
          </div>
        </div>
      </div>
      <WaitlistModal
        open={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
        date={date}
        serviceId={serviceId}
        barberId={barberChoice || toBarberId(barber)}
        onSuccess={() => {
          handleWaitlistSuccess();
        }}
        onError={() => {
          setWaitlistToast(t("booking.toasts.waitlistError"));
        }}
      />
      {waitlistToast && (
        <div className="fixed bottom-6 left-1/2 z-[10000] -translate-x-1/2 rounded-full bg-black px-5 py-2 text-sm font-semibold text-white shadow-lg">
          {waitlistToast}
        </div>
      )}
    </div>
  );
}
