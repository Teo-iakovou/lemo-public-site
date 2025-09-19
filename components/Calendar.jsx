"use client";

import { useMemo, useState } from "react";

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

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Calendar({ value, onChange, minDate, maxDate, closedWeekdays = [], highlights = {}, onMonthChange }) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const selected = value ? new Date(value + "T00:00:00") : null;
  const min = minDate ? new Date(minDate + "T00:00:00") : today;
  const max = maxDate ? new Date(maxDate + "T00:00:00") : addDays(today, 365);

  const [cursor, setCursor] = useState(selected || today);

  const month = useMemo(() => {
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    // Determine the first Monday before/at month start (iso week starting Monday)
    const startDay = (start.getDay() + 6) % 7; // 0 = Monday
    const first = addDays(start, -startDay);
    const weeks = [];
    let d = new Date(first);
    for (let w = 0; w < 6; w++) {
      const row = [];
      for (let i = 0; i < 7; i++) {
        row.push(new Date(d));
        d = addDays(d, 1);
      }
      weeks.push(row);
    }
    return { start, end, weeks };
  }, [cursor]);

  // Weekday labels remain English abbreviations

  function isDisabled(d) {
    const ds = toYMD(d);
    const outOfRange = ds < toYMD(min) || ds > toYMD(max);
    const isClosed = closedWeekdays.includes(d.getDay()); // 0=Sun,1=Mon,...
    return outOfRange || isClosed;
  }

  const canPrev = startOfMonth(cursor) > startOfMonth(min);
  const canNext = startOfMonth(cursor) < startOfMonth(max);

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
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
          Prev
        </button>
        <div className="font-display text-lg">
          {cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
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
          Next
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-white/10">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bg-black/60 text-center py-2 text-xs uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-white/10">
        {month.weeks.map((row, r) =>
          row.map((d, i) => {
            const ds = toYMD(d);
            const inMonth = d.getMonth() === cursor.getMonth();
            const isSel = selected && toYMD(selected) === ds;
            const disabled = isDisabled(d);
            const count = highlights[ds] ?? null;
            const values = Object.values(highlights).filter((v) => typeof v === "number" && v > 0);
            const max = values.length ? Math.max(...values) : 0;
            let width = 0;
            let barCls = "";
            const isClosedDay = closedWeekdays.includes(d.getDay());
            const isFutureOrToday = ds >= toYMD(today);
            if (!isFutureOrToday || isClosedDay) {
              width = 0; // no bars for past days or closed (Sun/Mon)
            } else if (count === null) {
              width = 0; // unknown -> no bar
            } else if (count <= 0) {
              width = 100; // fully booked -> full red bar
              barCls = "bg-red-500";
            } else {
              if (max > 0) {
                width = Math.round((count / max) * 100);
                width = Math.max(6, Math.min(width, 100)); // emphasize relative availability
              } else {
                width = 0;
              }
              // Single color for availability bars
              barCls = "bg-purple-500";
            }
            return (
              <button
                key={`${r}-${i}`}
                type="button"
                disabled={disabled}
                onClick={() => onChange && onChange(ds)}
                className={`relative h-12 sm:h-14 md:h-16 text-sm flex flex-col items-center justify-center ${
                  inMonth ? "" : "opacity-40"
                } ${
                  isSel
                    ? "bg-transparent text-white font-bold text-base sm:text-lg"
                    : "bg-black/60 text-white hover:bg-white/10"
                } disabled:opacity-20`}
              >
                <span>{d.getDate()}</span>
                {(
                  // Show bars only for today/future and not on closed days, and only within current visible month
                  inMonth && (ds >= toYMD(today)) && !isClosedDay && (count !== null)
                ) && (
                  <span
                    className={`absolute bottom-1 left-0 h-1 rounded ${barCls}`}
                    style={{ width: `${width}%` }}
                  />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
