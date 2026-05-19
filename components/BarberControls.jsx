"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Calendar from "./Calendar";
import { getPublicSettings, updatePublicSettings } from "../lib/api";
import {
  BARBER_KEYS,
  DEFAULT_PUBLIC_SETTINGS,
  normalizePublicSettings,
  resolveScopedList,
  VISIBLE_MONTH_LIMITS,
} from "../lib/publicSettings";

const MONTH_LABELS = [
  "Ιαν",
  "Φεβ",
  "Μαρ",
  "Απρ",
  "Μάι",
  "Ιουν",
  "Ιουλ",
  "Αυγ",
  "Σεπ",
  "Οκτ",
  "Νοε",
  "Δεκ",
];

const DEFAULT_DAY_OPEN_MINUTES = 9 * 60;
const DEFAULT_DAY_CLOSE_MINUTES = 19 * 60 + 40;
const SATURDAY_CLOSE_MINUTES = 17 * 60 + 40;
const SLOT_STEP_MINUTES = 40;
const EXTRA_WINDOW_MINUTES = 120;
const VISIBLE_MONTH_CHOICES = Array.from(
  { length: VISIBLE_MONTH_LIMITS.max - VISIBLE_MONTH_LIMITS.min + 1 },
  (_, idx) => VISIBLE_MONTH_LIMITS.min + idx
);

function formatLongDate(value) {
  try {
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("el-GR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function toYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeHoursInput(value = "") {
  const parts = value
    .split(/[, ]+/)
    .map((v) => v.trim())
    .filter(Boolean);
  const sanitized = Array.from(
    new Set(
      parts
        .map((part) => {
          const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(part);
          if (!m) return null;
          return `${m[1]}:${m[2]}`;
        })
        .filter(Boolean)
    )
  ).sort();
  return sanitized;
}

function minutesToHHMM(totalMinutes) {
  const clamped = Math.max(0, Math.min(totalMinutes, 23 * 60 + 40));
  const h = String(Math.floor(clamped / 60)).padStart(2, "0");
  const m = String(clamped % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function generateExtraSlotSuggestions(dateStr) {
  const suggestions = [];
  let startMin = DEFAULT_DAY_OPEN_MINUTES;
  let endMin = DEFAULT_DAY_CLOSE_MINUTES;
  if (dateStr) {
    try {
      const [y, m, d] = dateStr.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      if (!Number.isNaN(date.getTime())) {
        const dow = date.getDay();
        if (dow === 6) {
          endMin = SATURDAY_CLOSE_MINUTES;
        }
      }
    } catch {}
  }
  for (
    let min = startMin - EXTRA_WINDOW_MINUTES;
    min < startMin;
    min += SLOT_STEP_MINUTES
  ) {
    if (min >= 0) suggestions.push(minutesToHHMM(min));
  }
  for (
    let min = endMin + SLOT_STEP_MINUTES;
    min <= endMin + EXTRA_WINDOW_MINUTES;
    min += SLOT_STEP_MINUTES
  ) {
    if (min < 24 * 60) suggestions.push(minutesToHHMM(min));
  }
  return suggestions;
}

function generateStandardSlotsForDate(value) {
  if (!value) return [];
  try {
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const dow = date.getDay();
    if (dow === 0 || dow === 1) return [];
    const slots = [];
    for (
      let min = DEFAULT_DAY_OPEN_MINUTES;
      min <= DEFAULT_DAY_CLOSE_MINUTES;
      min += SLOT_STEP_MINUTES
    ) {
      slots.push(minutesToHHMM(min));
    }
    return slots;
  } catch {
    return [];
  }
}

export default function BarberControls() {
  const [selectedBarberKey, setSelectedBarberKey] = useState("LEMO");
  const [barberPriceDraft, setBarberPriceDraft] = useState("15");
  const [settings, setSettings] = useState(DEFAULT_PUBLIC_SETTINGS);
  const [initialSettings, setInitialSettings] = useState(
    DEFAULT_PUBLIC_SETTINGS
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openDate, setOpenDate] = useState("");
  const [lockDate, setLockDate] = useState("");
  const [whitelistDate, setWhitelistDate] = useState("");
  const [extraDate, setExtraDate] = useState("");
  const [overrideDraft, setOverrideDraft] = useState("");
  const [extraDraft, setExtraDraft] = useState("");
  const [calendarState, setCalendarState] = useState({ open: false, target: null });
  const [calendarTemp, setCalendarTemp] = useState("");
  const calendarRef = useRef(null);
  const whitelistAreaRef = useRef(null);
  const extraAreaRef = useRef(null);
  const [whitelistSuggestionsOpen, setWhitelistSuggestionsOpen] = useState(false);
  const [extraSuggestionsOpen, setExtraSuggestionsOpen] = useState(false);
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const maxDate = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() + 3, 0);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [today]);
  const minDateStr = useMemo(() => toYMD(today), [today]);
  const maxDateStr = useMemo(() => toYMD(maxDate), [maxDate]);
  const manageHighlights = useMemo(() => {
    const map = {};
    settings.allowedDates.forEach((date) => {
      map[date] = (map[date] || 0) + 80;
    });
    Object.keys(settings.extraDaySlots || {}).forEach((date) => {
      map[date] = Math.max(map[date] || 0, 40);
    });
    return map;
  }, [settings.allowedDates, settings.extraDaySlots]);

  useEffect(() => {
    if (whitelistDate) {
      setOverrideDraft(
        Array.isArray(settings.specialDayHours?.[whitelistDate])
          ? settings.specialDayHours[whitelistDate].join(", ")
          : ""
      );
    } else {
      setOverrideDraft("");
    }
  }, [whitelistDate, settings.specialDayHours]);

  useEffect(() => {
    if (extraDate) {
      setExtraDraft(
        Array.isArray(settings.extraDaySlots?.[extraDate])
          ? settings.extraDaySlots[extraDate].join(", ")
          : ""
      );
    } else {
      setExtraDraft("");
    }
  }, [extraDate, settings.extraDaySlots]);
  const WHITELIST_ENABLED = false;
  const extraSlotSuggestions = useMemo(
    () => generateExtraSlotSuggestions(extraDate),
    [extraDate]
  );
  const baseSlotSuggestions = useMemo(
    () => generateStandardSlotsForDate(extraDate),
    [extraDate]
  );
  const whitelistDraftValues = useMemo(
    () => normalizeHoursInput(overrideDraft),
    [overrideDraft]
  );
  const extraDraftValues = useMemo(
    () => normalizeHoursInput(extraDraft),
    [extraDraft]
  );
  const extraDayEntries = useMemo(() => {
    const entries = Object.entries(settings.extraDaySlots || {});
    return entries.sort(([a], [b]) => a.localeCompare(b));
  }, [settings.extraDaySlots]);

  const toggleTimeValue = useCallback(
    (target, time) => {
      if (!time) return;
      if (target === "whitelist") {
        const exists = whitelistDraftValues.includes(time);
        const next = exists
          ? whitelistDraftValues.filter((t) => t !== time)
          : [...whitelistDraftValues, time];
        setOverrideDraft(next.join(", "));
      } else if (target === "extra") {
        const exists = extraDraftValues.includes(time);
        const next = exists
          ? extraDraftValues.filter((t) => t !== time)
          : [...extraDraftValues, time];
        setExtraDraft(next.join(", "));
      }
    },
    [whitelistDraftValues, extraDraftValues]
  );

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getPublicSettings();
      const normalized = normalizePublicSettings(data);
      setSettings(normalized);
      setInitialSettings(normalized);
    } catch (err) {
      setError(err.message || "Αποτυχία φόρτωσης ρυθμίσεων.");
    } finally {
      setLoading(false);
    }
  }, []);

  const scopedClosedMonths = useMemo(
    () =>
      resolveScopedList(
        settings,
        "barberClosedMonths",
        "closedMonths",
        selectedBarberKey
      ),
    [settings, selectedBarberKey]
  );
  const scopedBlockedDates = useMemo(
    () =>
      resolveScopedList(
        settings,
        "barberBlockedDates",
        "blockedDates",
        selectedBarberKey
      ),
    [settings, selectedBarberKey]
  );
  const selectedBarberPrice = useMemo(() => {
    const raw = settings?.barberPrices?.[selectedBarberKey];
    return Number.isFinite(Number(raw)) ? Number(raw) : 15;
  }, [settings, selectedBarberKey]);

  useEffect(() => {
    setBarberPriceDraft(String(selectedBarberPrice));
  }, [selectedBarberPrice]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    function handleClick(e) {
      if (!calendarState.open) return;
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setCalendarState({ open: false, target: null });
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [calendarState.open]);

  useEffect(() => {
    function handleSuggestionClick(event) {
      if (
        whitelistSuggestionsOpen &&
        whitelistAreaRef.current &&
        !whitelistAreaRef.current.contains(event.target)
      ) {
        setWhitelistSuggestionsOpen(false);
      }
      if (
        extraSuggestionsOpen &&
        extraAreaRef.current &&
        !extraAreaRef.current.contains(event.target)
      ) {
        setExtraSuggestionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleSuggestionClick);
    return () => document.removeEventListener("mousedown", handleSuggestionClick);
  }, [whitelistSuggestionsOpen, extraSuggestionsOpen]);

  const toggleMonth = (index) => {
    setSettings((prev) => {
      const current = resolveScopedList(
        prev,
        "barberClosedMonths",
        "closedMonths",
        selectedBarberKey
      );
      const set = new Set(current);
      if (set.has(index)) {
        set.delete(index);
      } else {
        set.add(index);
      }
      return {
        ...prev,
        barberClosedMonths: {
          ...(prev.barberClosedMonths || {}),
          [selectedBarberKey]: Array.from(set).sort((a, b) => a - b),
        },
      };
    });
  };

  const removeDate = (type, value) => {
    setSettings((prev) => {
      if (type === "blocked") {
        const current = resolveScopedList(
          prev,
          "barberBlockedDates",
          "blockedDates",
          selectedBarberKey
        );
        return {
          ...prev,
          barberBlockedDates: {
            ...(prev.barberBlockedDates || {}),
            [selectedBarberKey]: current.filter((d) => d !== value),
          },
        };
      }
      const next = {
        ...prev,
        allowedDates: prev.allowedDates.filter((d) => d !== value),
      };
      if (next.specialDayHours?.[value]) {
        const copy = { ...(next.specialDayHours || {}) };
        delete copy[value];
        next.specialDayHours = copy;
      }
      return next;
    });
  };
  
  const handleOpenDay = () => {
    if (!openDate) {
      setError("Επιλέξτε ημερομηνία για άνοιγμα.");
      return;
    }
    setSettings((prev) => {
      const set = new Set(prev.allowedDates);
      set.add(openDate);
      return { ...prev, allowedDates: Array.from(set).sort() };
    });
    setSuccess(`Ημέρα ${formatLongDate(openDate)} άνοιξε.`);
  };

  const handleLockDay = () => {
    if (!lockDate) {
      setError("Επιλέξτε ημερομηνία για κλείσιμο.");
      return;
    }
    setSettings((prev) => {
      const current = resolveScopedList(
        prev,
        "barberBlockedDates",
        "blockedDates",
        selectedBarberKey
      );
      const set = new Set(current);
      set.add(lockDate);
      return {
        ...prev,
        barberBlockedDates: {
          ...(prev.barberBlockedDates || {}),
          [selectedBarberKey]: Array.from(set).sort(),
        },
      };
    });
    setSuccess(`Ημέρα ${formatLongDate(lockDate)} έκλεισε.`);
  };

  const removeExtraSlot = useCallback((date, time) => {
    if (!date) return;
    setSettings((prev) => {
      const map = { ...(prev.extraDaySlots || {}) };
      if (!map[date]) return prev;
      if (time) {
        const nextTimes = (map[date] || []).filter((t) => t !== time);
        if (nextTimes.length) {
          map[date] = nextTimes;
        } else {
          delete map[date];
        }
      } else {
        delete map[date];
      }
      return { ...prev, extraDaySlots: map };
    });
    if (time) {
      setSuccess(`Η ώρα ${time} αφαιρέθηκε από ${formatLongDate(date)}.`);
    } else {
      setSuccess(`Οι έξτρα ώρες για ${formatLongDate(date)} αφαιρέθηκαν.`);
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const next = await updatePublicSettings(settings);
      const normalized = normalizePublicSettings(next);
      setSettings(normalized);
      setInitialSettings(normalized);
      setSuccess("Οι ρυθμίσεις ενημερώθηκαν.");
    } catch (err) {
      setError(err.message || "Αποτυχία αποθήκευσης ρυθμίσεων.");
    } finally {
      setSaving(false);
    }
  };

  const applyBarberPrice = useCallback(() => {
    const next = Number(barberPriceDraft);
    if (!Number.isFinite(next) || next < 0) {
      setError("Μη έγκυρη τιμή. Βάλτε αριθμό >= 0.");
      return;
    }
    setSettings((prev) => ({
      ...prev,
      barberPrices: {
        ...(prev.barberPrices || {}),
        [selectedBarberKey]: Math.round(next * 100) / 100,
      },
    }));
    setSuccess("Η τιμή ενημερώθηκε.");
  }, [barberPriceDraft, selectedBarberKey]);

  const saveWhitelist = () => {
    if (!whitelistDate) {
      setError("Επιλέξτε ημερομηνία για whitelist.");
      return;
    }
    const normalized = normalizeHoursInput(overrideDraft);
    setSettings((prev) => {
      const map = { ...(prev.specialDayHours || {}) };
      if (normalized.length) map[whitelistDate] = normalized;
      else delete map[whitelistDate];
      return { ...prev, specialDayHours: map };
    });
    setSuccess("Οι ειδικές ώρες αποθηκεύτηκαν.");
  };

  const clearWhitelist = () => {
    if (!whitelistDate) return;
    setOverrideDraft("");
    setSettings((prev) => {
      const map = { ...(prev.specialDayHours || {}) };
      delete map[whitelistDate];
      return { ...prev, specialDayHours: map };
    });
  };

  const saveExtraSlots = () => {
    if (!extraDate) {
      setError("Επιλέξτε ημερομηνία για έξτρα ώρες.");
      return;
    }
    const normalized = normalizeHoursInput(extraDraft);
    setSettings((prev) => {
      const map = { ...(prev.extraDaySlots || {}) };
      if (normalized.length) map[extraDate] = normalized;
      else delete map[extraDate];
      return { ...prev, extraDaySlots: map };
    });
    setExtraDraft(normalized.join(", "));
    setSuccess("Προστέθηκαν έξτρα ώρες.");
  };

  const clearExtraSlots = () => {
    if (!extraDate) return;
    setExtraDraft("");
    setSettings((prev) => {
      const map = { ...(prev.extraDaySlots || {}) };
      delete map[extraDate];
      return { ...prev, extraDaySlots: map };
    });
  };

  const hasPendingChanges = useMemo(() => {
    return (
      (settings.visibleMonthCount || DEFAULT_PUBLIC_SETTINGS.visibleMonthCount) !==
        (initialSettings.visibleMonthCount || DEFAULT_PUBLIC_SETTINGS.visibleMonthCount) ||
      JSON.stringify(settings.closedMonths) !==
        JSON.stringify(initialSettings.closedMonths) ||
      JSON.stringify(settings.barberClosedMonths || {}) !==
        JSON.stringify(initialSettings.barberClosedMonths || {}) ||
      JSON.stringify(settings.allowedDates) !==
        JSON.stringify(initialSettings.allowedDates) ||
      JSON.stringify(settings.blockedDates) !==
        JSON.stringify(initialSettings.blockedDates) ||
      JSON.stringify(settings.barberBlockedDates || {}) !==
        JSON.stringify(initialSettings.barberBlockedDates || {}) ||
      JSON.stringify(settings.barberPrices || {}) !==
        JSON.stringify(initialSettings.barberPrices || {}) ||
      JSON.stringify(settings.specialDayHours || {}) !==
        JSON.stringify(initialSettings.specialDayHours || {}) ||
      JSON.stringify(settings.extraDaySlots || {}) !==
        JSON.stringify(initialSettings.extraDaySlots || {})
    );
  }, [settings, initialSettings]);

  const openCalendarFor = (target, currentValue) => {
    setCalendarTemp(currentValue || "");
    setCalendarState({ open: true, target });
  };

  const handleCalendarSelect = (value) => {
    switch (calendarState.target) {
      case "open":
        setOpenDate(value);
        break;
      case "lock":
        setLockDate(value);
        break;
      case "whitelist":
        setWhitelistDate(value);
        break;
      case "extra":
        setExtraDate(value);
        break;
      default:
        break;
    }
    setCalendarState({ open: false, target: null });
  };

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Πίνακας Διαθεσιμότητας</h3>
        <p className="mt-1 text-sm text-white/70">
          Επιλέξτε πόσους μήνες μπροστά βλέπουν οι πελάτες. Ο τρέχων μήνας μετράει ως ο πρώτος.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <label className="text-xs uppercase tracking-wide text-white/60">Κουρέας</label>
          <select
            value={selectedBarberKey}
            onChange={(e) => setSelectedBarberKey(e.target.value)}
            className="rounded-lg border border-white/20 bg-black/30 px-3 py-1.5 text-sm text-white focus:border-emerald-300 focus:outline-none"
          >
            {BARBER_KEYS.map((key) => (
              <option key={key} value={key}>
                {key === "LEMO" ? "ΛΕΜΟ" : key === "FOROU" ? "ΦΟΡΟΥ" : "ΚΟΥΣΙΗΣ"}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-xs uppercase tracking-wide text-white/60">Τιμή ({selectedBarberKey})</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={barberPriceDraft}
            onChange={(e) => setBarberPriceDraft(e.target.value)}
            className="w-28 rounded-lg border border-white/20 bg-black/30 px-3 py-1.5 text-sm text-white focus:border-emerald-300 focus:outline-none"
          />
          <button
            type="button"
            onClick={applyBarberPrice}
            className="rounded-lg border border-white/25 px-3 py-1.5 text-xs text-white/80 hover:border-white/50 hover:text-white"
          >
            Εφαρμογή
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {VISIBLE_MONTH_CHOICES.map((count) => {
            const active =
              (settings.visibleMonthCount ||
                DEFAULT_PUBLIC_SETTINGS.visibleMonthCount) === count;
            return (
              <button
                key={count}
                type="button"
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    visibleMonthCount: count,
                  }))
                }
                className={`rounded-full px-3 py-1 text-sm border transition ${
                  active
                    ? "border-emerald-300 bg-emerald-500/20 text-white"
                    : "border-white/15 text-white/70 hover:border-white/40"
                }`}
              >
                {count === 1 ? "1 μήνα" : `${count} μήνες`}
              </button>
            );
          })}
        </div>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-white/70">
          <span className="h-4 w-4 animate-spin rounded-full border border-white/30 border-t-white" />
          Φόρτωση ρυθμίσεων…
        </div>
      ) : (
        <>
          <div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {MONTH_LABELS.map((label, idx) => {
                const active = scopedClosedMonths.includes(idx);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleMonth(idx)}
                    className={`rounded-lg px-3 py-2 text-sm border transition ${
                      active
                        ? "border-rose-400 bg-rose-500/20 text-rose-100"
                        : "border-white/15 text-white/80 hover:border-white/40"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-semibold mb-2">Ειδικά ανοιχτές ημέρες</p>
              {settings.allowedDates.length === 0 ? (
                <p className="text-xs text-white/50">Δεν έχουν οριστεί ακόμα.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {settings.allowedDates.map((date) => (
                    <li
                      key={date}
                      className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2"
                    >
                      <span>{formatLongDate(date)}</span>
                      <button
                        type="button"
                        onClick={() => removeDate("allowed", date)}
                        className="text-xs text-white/60 hover:text-white"
                      >
                        Αφαίρεση
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-semibold mb-2">Ημέρες που είναι κλειστές</p>
              {scopedBlockedDates.length === 0 ? (
                <p className="text-xs text-white/50">Καμία επιπλέον κλειστή ημέρα.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {scopedBlockedDates.map((date) => (
                    <li
                      key={date}
                      className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2"
                    >
                      <span>{formatLongDate(date)}</span>
                      <button
                        type="button"
                        onClick={() => removeDate("blocked", date)}
                        className="text-xs text-white/60 hover:text-white"
                      >
                        Αφαίρεση
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3">
            <p className="text-sm font-semibold">Έξτρα ώρες που έχουν οριστεί</p>
            {extraDayEntries.length === 0 ? (
              <p className="text-xs text-white/50">
                Δεν υπάρχουν αποθηκευμένες έξτρα ώρες. Πρόσθεσε τες από την παρακάτω ενότητα.
              </p>
            ) : (
              <div className="space-y-4">
                {extraDayEntries.map(([date, slots]) => {
                  const times = Array.isArray(slots) ? slots.slice().sort() : [];
                  return (
                    <div key={date} className="rounded-xl border border-white/10 bg-black/10 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">{formatLongDate(date)}</span>
                        <button
                          type="button"
                          onClick={() => removeExtraSlot(date)}
                          className="text-[11px] text-white/60 hover:text-white underline"
                        >
                          Κατάργηση ημέρας
                        </button>
                      </div>
                      {times.length === 0 ? (
                        <p className="text-xs text-white/50 mt-2">Καμία έξτρα ώρα.</p>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {times.map((time) => (
                            <button
                              key={`${date}-${time}`}
                              type="button"
                              onClick={() => removeExtraSlot(date, time)}
                              className="text-xs rounded-full border border-white/25 px-3 py-1 hover:border-white/60 hover:text-white"
                            >
                              {time} ×
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-6 relative">
            <div>
              <p className="text-sm font-semibold">Άνοιγμα συγκεκριμένης ημέρας</p>
             
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => openCalendarFor("open", openDate)}
                  className="flex-1 rounded-xl border border-white/20 bg-black/20 px-4 py-2 text-left text-sm hover:border-white/40"
                >
                  {openDate ? formatLongDate(openDate) : "Επιλέξτε ημέρα"}
                </button>
                <button
                  type="button"
                  onClick={handleOpenDay}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-neutral-200"
                >
                  Άνοιγμα ημέρας
                </button>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold">Κλείσιμο συγκεκριμένης ημέρας</p>
              <p className="text-xs text-white/60">
                Μπορείς να αποκρύψεις μία μεμονωμένη ημέρα, ακόμη κι αν ολόκληρος ο μήνας είναι ενεργός.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => openCalendarFor("lock", lockDate)}
                  className="flex-1 rounded-xl border border-white/20 bg-black/20 px-4 py-2 text-left text-sm hover:border-white/40"
                >
                  {lockDate ? formatLongDate(lockDate) : "Επιλέξτε ημέρα"}
                </button>
                <button
                  type="button"
                  onClick={handleLockDay}
                  className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
                >
                  Κλείσιμο ημέρας
                </button>
              </div>
            </div>

            {WHITELIST_ENABLED ? (
              <div>
                <p className="text-sm font-semibold">Ειδικές ώρες (whitelist)</p>
                <p className="text-xs text-white/60">
                  Θα εμφανίζονται μόνο οι ώρες που ορίζεις, αγνοώντας το γενικό ωράριο.
                </p>
                <div className="mt-3 flex flex-col gap-2" ref={whitelistAreaRef}>
                  <button
                    type="button"
                    onClick={() => openCalendarFor("whitelist", whitelistDate)}
                    className="rounded-xl border border-white/20 bg-black/20 px-4 py-2 text-left text-sm hover:border-white/40"
                  >
                    {whitelistDate ? formatLongDate(whitelistDate) : "Επιλέξτε ημέρα"}
                  </button>
                  <input
                    type="text"
                    value={overrideDraft}
                    onClick={() => setWhitelistSuggestionsOpen(true)}
                    onFocus={() => setWhitelistSuggestionsOpen(true)}
                    onChange={(e) => setOverrideDraft(e.target.value)}
                    placeholder="π.χ. 09:00, 12:40"
                    className="rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                  />
                  {whitelistSuggestionsOpen && (
                    <div className="rounded-xl border border-white/15 bg-black/70 px-3 py-2 text-xs text-white/70 space-y-1">
                      <div className="flex flex-wrap gap-2">
                        {extraSlotSuggestions.map((time) => {
                          const active = whitelistDraftValues.includes(time);
                          return (
                            <button
                              key={`wh-${time}`}
                              type="button"
                              onClick={() => toggleTimeValue("whitelist", time)}
                              className={`rounded-full px-3 py-1 border ${
                                active
                                  ? "border-purple-300 bg-purple-500/20 text-white"
                                  : "border-white/25 hover:border-white/50"
                              }`}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => setWhitelistSuggestionsOpen(false)}
                        className="text-[11px] text-white/60 underline"
                      >
                        Απόκρυψη προτάσεων
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={saveWhitelist}
                      className="rounded-lg bg-purple-500/80 px-3 py-2 font-semibold hover:bg-purple-400/80"
                    >
                      Αποθήκευση
                    </button>
                    <button
                      type="button"
                      onClick={clearWhitelist}
                      className="rounded-lg border border-white/30 px-3 py-2 hover:border-white/60"
                    >
                      Καμία
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div>
              <p className="text-sm font-semibold">Έξτρα ώρες</p>
              <p className="text-xs text-white/60">
                Προστίθενται επιπλέον slots χωρίς να πειράζεις το σταθερό πρόγραμμα (ιδανικό για ένα 18:00 Σάββατο).
              </p>
              <div className="mt-3 flex flex-col gap-2" ref={extraAreaRef}>
                <button
                  type="button"
                  onClick={() => openCalendarFor("extra", extraDate)}
                  className="rounded-xl border border-white/20 bg-black/20 px-4 py-2 text-left text-sm hover:border-white/40"
                >
                  {extraDate ? formatLongDate(extraDate) : "Επιλέξτε ημέρα"}
                </button>
                <input
                  type="text"
                  value={extraDraft}
                  onClick={() => setExtraSuggestionsOpen(true)}
                  onFocus={() => setExtraSuggestionsOpen(true)}
                  onChange={(e) => setExtraDraft(e.target.value)}
                  placeholder="π.χ. 18:00"
                  className="rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                />
                {extraSuggestionsOpen && (
                  <div className="rounded-xl border border-white/15 bg-black/70 px-3 py-3 text-xs text-white/70 space-y-3">
                    {baseSlotSuggestions.length > 0 && (
                      <div className="space-y-2">
                        <p className="font-semibold text-white/80 text-[11px]">Ωράριο ημέρας</p>
                        <div className="flex flex-wrap gap-2">
                          {baseSlotSuggestions.map((time) => {
                            const isActive = extraDraftValues.includes(time);
                            return (
                              <button
                                key={`base-${time}`}
                                type="button"
                                onClick={() => toggleTimeValue("extra", time)}
                                className={`rounded-full px-3 py-1 border ${
                                  isActive
                                    ? "border-emerald-300 bg-emerald-500/20 text-white"
                                    : "border-white/25 hover:border-white/50"
                                }`}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {extraSlotSuggestions.length > 0 && (
                      <div className="space-y-2">
                        <p className="font-semibold text-white/80 text-[11px]">Εκτός ωραρίου</p>
                        <div className="flex flex-wrap gap-2">
                          {extraSlotSuggestions.map((time) => {
                            const isActive = extraDraftValues.includes(time);
                            return (
                              <button
                                key={`extra-${time}`}
                                type="button"
                                onClick={() => toggleTimeValue("extra", time)}
                                className={`rounded-full px-3 py-1 border ${
                                  isActive
                                    ? "border-emerald-300 bg-emerald-500/20 text-white"
                                    : "border-white/25 hover-border-white/50"
                                }`}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setExtraSuggestionsOpen(false)}
                      className="text-[11px] text-white/60 underline"
                    >
                      Απόκρυψη προτάσεων
                    </button>
                  </div>
                )}
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={saveExtraSlots}
                    className="rounded-lg bg-emerald-500/80 px-3 py-2 font-semibold text-black hover:bg-emerald-400/80"
                  >
                    Αποθήκευση
                  </button>
                  <button
                    type="button"
                    onClick={clearExtraSlots}
                    className="rounded-lg border border-white/30 px-3 py-2 text-white hover:border-white/60"
                  >
                    Καμία
                  </button>
                </div>
              </div>
            </div>
          </div>

          {calendarState.open && (
            <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 px-4 py-8">
              <div
                ref={calendarRef}
                className="w-full max-w-md rounded-2xl border border-white/15 bg-black/95 p-3 shadow-2xl space-y-3"
              >
                <Calendar
                  value={calendarTemp || ""}
                  onChange={(ds) => {
                    setCalendarTemp(ds);
                    handleCalendarSelect(ds);
                  }}
                  minDate={minDateStr}
                  maxDate={maxDateStr}
                  closedWeekdays={[]}
                  highlights={manageHighlights}
                  disabledMonths={[]}
                  blockedDates={[]}
                  allowedDates={[]}
                  onMonthChange={() => {}}
                />
                <button
                  type="button"
                  onClick={() => setCalendarState({ open: false, target: null })}
                  className="w-full rounded-lg border border-white/20 px-3 py-2 text-sm hover:border-white/50"
                >
                  Κλείσιμο
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-rose-300">{error}</p>}
          {success && <p className="text-sm text-emerald-300">{success}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasPendingChanges}
              className="rounded-lg bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-neutral-200 disabled:opacity-50"
            >
              {saving ? "Αποθήκευση…" : "Αποθήκευση αλλαγών"}
            </button>
            {!saving && success && (
              <span className="text-xs text-white/60">
                Οι αλλαγές εφαρμόζονται άμεσα στο δημόσιο site.
              </span>
            )}
            {!success && !hasPendingChanges && (
              <span className="text-xs text-white/40">
                Δεν υπάρχουν αλλαγές προς αποθήκευση.
              </span>
            )}
          </div>
        </>
      )}
    </section>
  );
}
