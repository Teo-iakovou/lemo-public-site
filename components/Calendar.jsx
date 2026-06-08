"use client";

import { useMemo, useState } from "react";
import WaitlistModal from "./WaitlistModal";
import { useLanguage } from "./LanguageProvider";

function toYMD(d) {
  // Local date string: YYYY-MM-DD (avoid UTC shift from toISOString)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}


function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export default function Calendar({
  value,
  selectedDates = [],
  onChange,
  minDate,
  maxDate,
  closedWeekdays = [],
  highlights = {},
  onMonthChange,
  disabledMonths = [11],
  blockedDates = [],
  allowedDates = [],
  waitlistOptions,
}) {
  const { t, locale } = useLanguage();
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const selected = value ? new Date(value + "T00:00:00") : null;
  const selectedDatesSet = useMemo(
    () => new Set(Array.isArray(selectedDates) ? selectedDates : []),
    [selectedDates]
  );
  const min = minDate ? new Date(minDate + "T00:00:00") : today;
  const max = maxDate ? new Date(maxDate + "T00:00:00") : addDays(today, 365);

  const [cursor, setCursor] = useState(selected || today);
  const disabledMonthsSet = useMemo(
    () => new Set(Array.isArray(disabledMonths) ? disabledMonths : []),
    [disabledMonths]
  );
  const blockedDatesSet = useMemo(
    () => new Set(Array.isArray(blockedDates) ? blockedDates : []),
    [blockedDates]
  );
  const allowedDatesSet = useMemo(
    () => new Set(Array.isArray(allowedDates) ? allowedDates : []),
    [allowedDates]
  );

  const month = useMemo(() => {
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    // Determine the first Monday before/at month start (iso week starting Monday)
    const startDay = (start.getDay() + 6) % 7; // 0 = Monday
    const first = addDays(start, -startDay);
    // Determine the last Sunday at/after month end
    const endDay = (end.getDay() + 6) % 7; // 0 = Monday
    const last = addDays(end, 6 - endDay);
    const totalDays = Math.round((last - first) / 86400000) + 1;
    const weeksCount = Math.ceil(totalDays / 7); // usually 5 or 6

    const weeks = [];
    let d = new Date(first);
    for (let w = 0; w < weeksCount; w++) {
      const row = [];
      for (let i = 0; i < 7; i++) {
        row.push(new Date(d));
        d = addDays(d, 1);
      }
      weeks.push(row);
    }
    return { start, end, weeks };
  }, [cursor]);

  const weekdayLabels = useMemo(() => {
    const baseMonday = new Date(Date.UTC(2026, 0, 5)); // Monday
    return Array.from({ length: 7 }, (_, index) =>
      new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
        new Date(baseMonday.getTime() + index * 24 * 60 * 60 * 1000)
      )
    );
  }, [locale]);

  function isDisabled(d) {
    const ds = toYMD(d);
    const outOfRange = ds < toYMD(min) || ds > toYMD(max);
    const manualOpen = allowedDatesSet.has(ds);
    const manualClosed = blockedDatesSet.has(ds);
    const weekdayClosed = closedWeekdays.includes(d.getDay());
    const monthClosed = disabledMonthsSet.has(d.getMonth());
    const derivedClosed = manualClosed || ((weekdayClosed || monthClosed) && !manualOpen);
    return outOfRange || derivedClosed;
  }

  const canPrev = startOfMonth(cursor) > startOfMonth(min);
  const canNext = startOfMonth(cursor) < startOfMonth(max);
  const cursorMonthIndex = cursor.getMonth();
  const cursorMonthDisabled = disabledMonthsSet.has(cursorMonthIndex);
  const cursorMonthHasOverride = useMemo(() => {
    if (!Array.isArray(allowedDates) || allowedDates.length === 0) return false;
    const year = cursor.getFullYear();
    return allowedDates.some((ds) => {
      try {
        const dt = new Date(`${ds}T00:00:00`);
        if (Number.isNaN(dt.getTime())) return false;
        return dt.getFullYear() === year && dt.getMonth() === cursorMonthIndex;
      } catch {
        return false;
      }
    });
  }, [allowedDates, cursor, cursorMonthIndex]);

  const waitlistEnabled = Boolean(waitlistOptions);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const waitlistDate = value || "";
  const readableWaitlistDate = useMemo(() => {
    if (!waitlistDate) return "";
    try {
      const [y, m, d] = waitlistDate.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      return new Intl.DateTimeFormat(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(dt);
    } catch {
      return waitlistDate;
    }
  }, [waitlistDate]);

  return (
    <div>
      <div className="relative border border-white/10 rounded-lg overflow-hidden">
      {/* Subtle logo background */}
      {/* Mobile photo position (lower in frame) */}
      <div
        className="absolute inset-0 pointer-events-none block sm:hidden"
        style={{
          backgroundImage: "url(/459C72EF-CE49-4DCF-A1B3-4B2F2C82FDA5.JPG)",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center 40%",
          backgroundSize: "cover",
          opacity: 0.3,
          filter: "none",
        }}
      />
      {/* Desktop/tablet photo position */}
      <div
        className="absolute inset-0 pointer-events-none hidden sm:block"
        style={{
          backgroundImage: "url(/459C72EF-CE49-4DCF-A1B3-4B2F2C82FDA5.JPG)",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center 45%",
          backgroundSize: "cover",
          opacity: 0.3,
          filter: "none",
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-black/25" />
      <div className="relative z-10">
        <div className="flex items-center justify-between px-4 py-3 bg-white/5">
          <button
            type="button"
            onClick={() => {
              if (!canPrev) return;
              const nextCur = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
              setCursor(nextCur);
              onMonthChange && onMonthChange(new Date(nextCur.getFullYear(), nextCur.getMonth(), 1));
            }}
            disabled={!canPrev}
            className="px-2 py-1 rounded border border-white/10 text-sm disabled:opacity-40"
          >
            {t("calendar.prev")}
          </button>
          <div className="font-display text-lg">
            {cursor.toLocaleString(locale, { month: "long", year: "numeric" })}
          </div>
          <button
            type="button"
            onClick={() => {
              if (!canNext) return;
              const nextCur = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
              setCursor(nextCur);
              onMonthChange && onMonthChange(new Date(nextCur.getFullYear(), nextCur.getMonth(), 1));
            }}
            disabled={!canNext}
            className="px-2 py-1 rounded border border-white/10 text-sm disabled:opacity-40"
          >
            {t("calendar.next")}
          </button>
        </div>
        {cursorMonthDisabled && (
          <div className="px-4 py-2 text-center text-xs text-amber-200 bg-amber-500/10 border-t border-amber-500/20">
            {cursorMonthHasOverride
              ? t("calendar.monthClosedWithOverrides")
              : t("calendar.monthClosed")}
          </div>
        )}

        <div className="grid grid-cols-7 gap-0">
          {weekdayLabels.map((d) => (
            <div key={d} className="bg-transparent text-center py-2 text-xs uppercase tracking-wider text-white/80">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0">
          {month.weeks.map((row, r) =>
            row.map((d, i) => {
            const ds = toYMD(d);
            const inMonth = d.getMonth() === cursor.getMonth();
            // Only allow days from the current month to be selectable/colored
            const inDisplay = inMonth;
            const isSel = (selected && toYMD(selected) === ds) || selectedDatesSet.has(ds);
            // Allow selecting days within current month only
            const manualOpen = allowedDatesSet.has(ds);
            const lockedBySettings = blockedDatesSet.has(ds);
            const monthClosed = disabledMonthsSet.has(d.getMonth());
            const weekdayClosed = closedWeekdays.includes(d.getDay());
            const derivedClosed = lockedBySettings || ((weekdayClosed || monthClosed) && !manualOpen);
            const disabled = isDisabled(d) || !inDisplay;
            const count = highlights[ds] ?? null;
            const values = Object.values(highlights).filter((v) => typeof v === "number" && v > 0);
            const max = values.length ? Math.max(...values) : 0;
            let width = 0;
            let barCls = "";
            const isClosedDay = derivedClosed && (ds >= toYMD(today));
            const isFutureOrToday = ds >= toYMD(today);
            if (!isFutureOrToday) {
              width = 0; // no bars for past days
            } else if (isClosedDay) {
              width = 100;
              barCls = "bg-red-500";
            } else if (count === null) {
              width = 0; // unknown -> no bar
            } else if (count <= 0) {
              width = 100; // fully booked -> full purple bar
              barCls = "bg-purple-500";
            } else {
              if (max > 0) {
                width = Math.round((count / max) * 100);
                width = Math.max(6, Math.min(width, 100)); // emphasize relative availability
              } else {
                width = 0;
              }
              // Available: turquoise bar
              barCls = "bg-teal-400";
            }
            // Render empty placeholder cells for days outside the current month
            if (!inMonth) {
              return (
                <div
                  key={`${r}-${i}`}
                  className="relative h-12 sm:h-14 md:h-16 bg-transparent"
                  aria-hidden
                />
              );
            }
            return (
              <button
                key={`${r}-${i}`}
                type="button"
                disabled={disabled}
                onClick={() => onChange && onChange(ds)}
                className={`group relative h-12 sm:h-14 md:h-16 text-sm flex flex-col items-center justify-center ${
                  inDisplay ? "" : "opacity-40"
                } ${lockedBySettings ? "text-red-200" : "text-white"}`}
              >
                <span className={`${isSel ? 'font-extrabold text-white text-base sm:text-lg tracking-wide' : 'font-semibold text-white/90'}`}>
                  {d.getDate()}
                </span>
                {disabled && (
                  <span
                    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-white"
                    aria-hidden
                    title={t("calendar.unavailable")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" className="h-3.5 w-3.5">
                      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                      <line x1="6.2" y1="13.8" x2="13.8" y2="6.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </span>
                )}
                {(
                  inDisplay && isFutureOrToday && (isClosedDay || count !== null)
                ) && (
                  <span
                    className={`absolute bottom-1 h-1 rounded ${barCls}`}
                    style={{ width: `${width}%`, left: '50%', transform: 'translateX(-50%)' }}
                  />
                )}
              </button>
            );
            })
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/70">
        <div className="flex items-center gap-2">
          <span className="h-1 w-8 rounded bg-teal-400 inline-block" />
          <span>{t("calendar.available")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1 w-8 rounded bg-purple-500 inline-block" />
          <span>{t("calendar.full")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1 w-8 rounded bg-red-500 inline-block" />
          <span>{t("calendar.closed")}</span>
        </div>
      </div>
      </div>
      {waitlistEnabled && (
        <>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
            <p className="text-base font-semibold">
              {t("calendar.cantFindTime")}
            </p>
            <p className="mt-1 text-sm text-white/70">
              {waitlistDate
                ? t("calendar.waitlistPromptDate", { date: readableWaitlistDate })
                : t("calendar.waitlistPromptNoDate")}
            </p>
            <button
              type="button"
              onClick={() => setWaitlistOpen(true)}
              disabled={!waitlistDate}
              className="mt-3 inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              {t("calendar.joinWaitlist")}
            </button>
          </div>
          <WaitlistModal
            open={waitlistOpen}
            onClose={() => setWaitlistOpen(false)}
            date={waitlistDate}
            serviceId={waitlistOptions?.serviceId}
            barberId={waitlistOptions?.barberId}
            onSuccess={() => {
              waitlistOptions?.onSuccess?.();
            }}
          />
        </>
      )}
    </div>
  );
}
