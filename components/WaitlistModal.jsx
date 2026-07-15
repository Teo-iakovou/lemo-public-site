"use client";

import { useEffect, useMemo, useState } from "react";
import { joinWaitingList, getAvailability } from "../lib/api";
import { useLanguage } from "./LanguageProvider";

const SLOT_DURATION_MIN = 40;
const SLOT_STEP_MIN = 40;
const OPEN_MINUTES = 9 * 60;
const CLOSE_MINUTES = 19 * 60 + 40; // last slot starts 19:00
function minutesToLabel(total) {
  const h = String(Math.floor(total / 60)).padStart(2, "0");
  const m = String(total % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function buildAllSlots() {
  const list = [];
  for (let t = OPEN_MINUTES; t + SLOT_DURATION_MIN <= CLOSE_MINUTES; t += SLOT_STEP_MIN) {
    list.push(minutesToLabel(t));
  }
  return list;
}

const ALL_DAY_SLOTS = buildAllSlots();

export default function WaitlistModal({
  open,
  onClose,
  date,
  serviceId,
  barberId,
  onSuccess,
  onError,
}) {
  const { t, locale } = useLanguage();
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [preferredTimes, setPreferredTimes] = useState([]);
  const [selectedBarber, setSelectedBarber] = useState(barberId || "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [suggestedSlots, setSuggestedSlots] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const sortedPreferredTimes = useMemo(
    () => [...preferredTimes].sort(),
    [preferredTimes]
  );
  const barberOptions = useMemo(
    () => [
      { value: "", label: t("waitlist.anyBarber") },
      { value: "lemo", label: t("booking.barberNames.lemoUpper") },
      { value: "forou", label: t("booking.barberNames.forouUpper") },
      { value: "koushis", label: t("booking.barberNames.koushisUpper") },
    ],
    [t]
  );

  const togglePreferredTime = (slot) => {
    if (!slot) return;
    setError("");
    setPreferredTimes((prev) => {
      const exists = prev.includes(slot);
      if (exists) {
        return prev.filter((value) => value !== slot);
      }
      return [...prev, slot].sort();
    });
  };

  const removePreferredTime = (value) => {
    setPreferredTimes((prev) => prev.filter((slot) => slot !== value));
  };

  // "Select all" toggle for the available-hours picker: if every suggested slot
  // is already picked, clear them; otherwise select all of them. Individual slot
  // selection keeps working — this just checks/unchecks everything at once.
  const allSuggestedSelected =
    suggestedSlots.length > 0 &&
    suggestedSlots.every((slot) => preferredTimes.includes(slot));

  const toggleSelectAllTimes = () => {
    setError("");
    if (allSuggestedSelected) {
      setPreferredTimes((prev) =>
        prev.filter((slot) => !suggestedSlots.includes(slot))
      );
    } else {
      setPreferredTimes((prev) =>
        Array.from(new Set([...prev, ...suggestedSlots])).sort()
      );
    }
  };

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    }
    if (open) {
      window.addEventListener("keydown", handleKey);
    }
    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setError("");
      setName("");
      setPhoneNumber("");
      setPreferredTimes([]);
      setSelectedBarber(barberId || "");
      setSuggestedSlots([]);
      setShowSuggestions(false);
      setSlotsError("");
    }
  }, [open, barberId]);

  useEffect(() => {
    if (!open || !date) return;
    setLoadingSlots(true);
    setSlotsError("");
    getAvailability({
      serviceId,
      date,
      barberId: barberId || undefined,
    })
      .then((data) => {
        const arr = Array.isArray(data) ? data : data?.slots || [];
        const availableSet = new Set(arr);
        const unavailable = ALL_DAY_SLOTS.filter((slot) => !availableSet.has(slot));
        setSuggestedSlots(unavailable);
      })
      .catch((err) => {
        setSlotsError(err?.message || t("waitlist.errors.loadSlots"));
        setSuggestedSlots([]);
      })
      .finally(() => setLoadingSlots(false));
  }, [open, date, serviceId, barberId]);

  const readableDate = useMemo(() => {
    if (!date) return "";
    const [year, month, day] = date.split("-").map((part) => Number(part));
    if (!year || !month || !day) return date;
    const dt = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(dt);
  }, [date, locale]);

  async function handleSubmit(e) {
    e?.preventDefault?.();
    if (!name.trim() || !phoneNumber.trim() || preferredTimes.length === 0) {
      setError(t("waitlist.errors.fillAllFields"));
      return;
    }
    if (!date) {
      setError(t("waitlist.errors.selectDate"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await joinWaitingList({
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        preferredTimes,
        preferredDate: date,
        serviceId,
        barberId: selectedBarber || barberId,
      });
      onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(err?.message || t("waitlist.errors.submitFailed"));
      onError?.(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/80"
        aria-hidden="true"
        onClick={() => onClose?.()}
      />
      <div className="relative w-full max-w-md rounded-3xl border border-[#a855f7]/40 bg-[#07080d] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)] text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {t("waitlist.title")}
            </h2>
            {readableDate && (
              <p className="text-sm text-white/60">{t("waitlist.date", { date: readableDate })}</p>
            )}
          </div>
          <button
            onClick={() => onClose?.()}
            className="text-white/60 hover:text-white"
            aria-label={t("waitlist.close")}
          >
            ×
          </button>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80 block">
              {t("waitlist.preferredBarber")}
            </label>
            <div className="relative">
              <select
                className="w-full appearance-none rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#a855f7] focus:outline-none focus:ring-1 focus:ring-[#a855f7]"
                value={selectedBarber || ""}
                onChange={(e) => setSelectedBarber(e.target.value)}
              >
                {barberOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/40">
                ▾
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm font-medium text-white/80 pt-2">
            <span className="text-[#c084fc]">{t("waitlist.preferredTimes")}</span>
            {sortedPreferredTimes.length > 0 && (
              <span className="text-xs text-white/60">
                {sortedPreferredTimes.join(", ")}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowSuggestions((s) => !s)}
            className="w-full rounded-lg border border-[#a855f7]/40 px-3 py-2 text-sm font-semibold text-white/80 hover:bg-[#a855f7]/10"
          >
            {showSuggestions ? t("waitlist.hideTimes") : t("waitlist.availableTimes")}
          </button>
          {showSuggestions && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              {loadingSlots && <p className="text-sm text-white/60">{t("waitlist.loadingSlots")}</p>}
              {!loadingSlots && slotsError && (
                <p className="text-sm text-red-400">{slotsError}</p>
              )}
              {!loadingSlots && !slotsError && suggestedSlots.length === 0 && (
                <p className="text-sm text-white/60">{t("waitlist.allTimesAvailable")}</p>
              )}
              {!loadingSlots && !slotsError && suggestedSlots.length > 0 && (
                <div className="mb-2 flex items-center justify-end">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-white/80 select-none">
                    <input
                      type="checkbox"
                      checked={allSuggestedSelected}
                      onChange={toggleSelectAllTimes}
                      className="h-4 w-4 rounded border-white/30 bg-transparent accent-[#a855f7]"
                    />
                    {t("waitlist.selectAllTimes")}
                  </label>
                </div>
              )}
              {!loadingSlots && !slotsError && suggestedSlots.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {suggestedSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => togglePreferredTime(slot)}
                      className={`px-3 py-1 rounded-md border text-sm transition-colors ${
                        preferredTimes.includes(slot)
                          ? "border-[#a855f7] bg-gradient-to-r from-[#a855f7] to-[#7c3aed] text-white"
                          : "border-white/20 bg-transparent text-white hover:border-[#a855f7]/60"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {sortedPreferredTimes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sortedPreferredTimes.map((slot) => (
                <span
                  key={slot}
                  className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/80"
                >
                  {slot}
                  <button
                    type="button"
                    onClick={() => removePreferredTime(slot)}
                    className="text-white/50 hover:text-white"
                    aria-label={t("waitlist.removeTime", { slot })}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:border-[#a855f7] focus:outline-none focus:ring-1 focus:ring-[#a855f7]"
            placeholder={t("waitlist.fullNamePlaceholder")}
            required
          />
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:border-[#a855f7] focus:outline-none focus:ring-1 focus:ring-[#a855f7]"
            placeholder={t("waitlist.phonePlaceholder")}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => onClose?.()}
              className="flex-1 rounded-lg border border-white/15 px-4 py-2 text-white/80 hover:bg-white/5"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-gradient-to-r from-[#a855f7] to-[#7c3aed] px-4 py-2 text-white disabled:opacity-60"
            >
              {submitting ? t("waitlist.submitting") : t("waitlist.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
