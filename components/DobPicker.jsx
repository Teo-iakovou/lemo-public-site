"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function toYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYMD(s) {
  const [y, m, d] = String(s || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

const MONTHS = [
  "Ιανουάριος",
  "Φεβρουάριος",
  "Μάρτιος",
  "Απρίλιος",
  "Μάιος",
  "Ιούνιος",
  "Ιούλιος",
  "Αύγουστος",
  "Σεπτέμβριος",
  "Οκτώβριος",
  "Νοέμβριος",
  "Δεκέμβριος",
];

const WEEKDAYS = ["Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ", "Κυρ"]; // Monday-first

export default function DobPicker({ value, onChange, min = "1920-01-01", max }) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const maxDate = max ? parseYMD(max) : today;
  const minDate = parseYMD(min) || new Date(1920, 0, 1);

  const initial = parseYMD(value) || new Date(1995, 0, 1);
  const [open, setOpen] = useState(false);
  const [isSmall, setIsSmall] = useState(false);
  const [forceOverlay, setForceOverlay] = useState(false);
  const [cursor, setCursor] = useState(initial);

  useEffect(() => {
    if (value) {
      const v = parseYMD(value);
      if (v) setCursor(v);
    }
  }, [value]);

  // Responsive: treat narrow screens as small and use a centered overlay panel
  useEffect(() => {
    function update() {
      try {
        setIsSmall(window.innerWidth <= 480);
      } catch {}
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // When opening, decide if there's enough space below; if not, use overlay
  useEffect(() => {
    if (!open) return;
    try {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (rect) {
        const spaceBelow = window.innerHeight - rect.bottom;
        // Approximate panel height
        const panelH = 380;
        setForceOverlay(spaceBelow < panelH);
      }
    } catch {
      setForceOverlay(false);
    }
  }, [open]);

  const years = useMemo(() => {
    const ys = [];
    for (let y = maxDate.getFullYear(); y >= minDate.getFullYear(); y--) {
      ys.push(y);
    }
    return ys;
  }, [minDate, maxDate]);

  const month = useMemo(() => {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const startDay = (start.getDay() + 6) % 7; // Monday = 0
    const first = new Date(start);
    first.setDate(first.getDate() - startDay);
    const endDay = (end.getDay() + 6) % 7;
    const last = new Date(end);
    last.setDate(last.getDate() + (6 - endDay));
    const totalDays = Math.round((last - first) / 86400000) + 1;
    const weeks = [];
    let d = new Date(first);
    for (let i = 0; i < totalDays / 7; i++) {
      const row = [];
      for (let j = 0; j < 7; j++) { row.push(new Date(d)); d.setDate(d.getDate() + 1); }
      weeks.push(row);
    }
    return { start, end, weeks };
  }, [cursor]);

  function insideRange(d) {
    const ds = toYMD(d);
    return ds >= toYMD(minDate) && ds <= toYMD(maxDate);
  }

  function clampDate(d) {
    const time = d.getTime();
    const minT = minDate.getTime();
    const maxT = maxDate.getTime();
    const clamped = Math.min(Math.max(time, minT), maxT);
    const result = new Date(clamped);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  function applyMonthYearChange(nextYear, nextMonth) {
    if (Number.isNaN(nextYear) || Number.isNaN(nextMonth)) return;
    const currentDay = cursor.getDate();
    const daysInTargetMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
    const safeDay = Math.min(currentDay, daysInTargetMonth);
    let next = new Date(nextYear, nextMonth, safeDay);
    next = clampDate(next);
    setCursor(next);
    if (value) {
      onChange && onChange(toYMD(next));
    }
  }

  const wrapperRef = useRef(null);
  useEffect(() => {
    function onDoc(e) {
      if (!open) return;
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    function onKey(e) {
      if (!open) return;
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const display = value ? (() => {
    const d = parseYMD(value);
    try { return d ? d.toLocaleDateString('el-GR', { day: '2-digit', month: 'long', year: 'numeric' }) : ''; } catch { return value; }
  })() : "";

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full mt-1 flex items-center gap-2 p-2 rounded-md border border-white/10 bg-white/5 text-left focus:border-purple-500"
        aria-label="Ημερομηνία γέννησης"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-neutral-300" aria-hidden>
          <path d="M6 2a1 1 0 0 1 1 1v1h6V3a1 1 0 1 1 2 0v1h1.5a1.5 1.5 0 0 1 1.5 1.5V16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5.5A1.5 1.5 0 0 1 3.5 4H5V3a1 1 0 0 1 1-1Zm9 6H5v8h10V8Z" />
        </svg>
        <span className={`flex-1 ${display ? 'text-white' : 'text-neutral-400'}`}>
          {display || 'Ημερ. γέννησης (προαιρετικό)'}
        </span>
        <span className="text-xs text-neutral-400">{value || ''}</span>
      </button>
      {open && (
        (isSmall || forceOverlay) ? (
          // Mobile: full-screen overlay sheet
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3 pb-6 pt-16 sm:items-center sm:p-3"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-full sm:w-[360px] max-w-[calc(100vw-24px)] rounded-md border border-white/10 bg-black shadow-lg overflow-hidden max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom))' }}
            >
              <div className="px-3 py-2 flex items-center justify-between border-b border-white/10 sticky top-0 bg-black/90 backdrop-blur">
                <div className="flex items-center gap-2">
                  <select
                    className="bg-transparent text-white text-sm border border-white/10 rounded px-2 py-1"
                    value={cursor.getMonth()}
                    onChange={(e) => {
                      const month = parseInt(e.target.value, 10);
                      applyMonthYearChange(cursor.getFullYear(), month);
                    }}
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i} value={i} className="bg-black">{m}</option>
                    ))}
                  </select>
                  <select
                    className="w-24 bg-transparent text-white text-sm border border-white/10 rounded px-2 py-1"
                    value={cursor.getFullYear()}
                    onChange={(e) => {
                      const year = parseInt(e.target.value, 10);
                      applyMonthYearChange(year, cursor.getMonth());
                    }}
                  >
                    {years.map((y) => (
                      <option key={y} value={y} className="bg-black">{y}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" aria-label="Προηγούμενος" title="Προηγούμενος" className="h-8 w-8 inline-flex items-center justify-center rounded border border-white/10 text-sm"
                    onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth()-1, 1))}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M12.78 15.78a.75.75 0 0 1-1.06 0l-5-5a.75.75 0 0 1 0-1.06l5-5a.75.75 0 1 1 1.06 1.06L8.06 10l4.72 4.72a.75.75 0 0 1 0 1.06Z" clipRule="evenodd"/></svg>
                  </button>
                  <button type="button" aria-label="Επόμενος" title="Επόμενος" className="h-8 w-8 inline-flex items-center justify-center rounded border border-white/10 text-sm"
                    onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth()+1, 1))}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M7.22 4.22a.75.75 0 0 1 1.06 0l5 5a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 1 1-1.06-1.06L11.94 10 7.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd"/></svg>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-0 px-2 pt-2">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center py-1 text-[11px] uppercase tracking-wider text-white/80">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0 p-2 overflow-auto">
                {month.weeks.flat().map((d, idx) => {
                  const ds = toYMD(d);
                  const isInMonth = d.getMonth() === cursor.getMonth();
                  const disabled = !insideRange(d);
                  const isSel = value && ds === value;
                  return (
                    <button
                      key={`${ds}-${idx}`}
                      type="button"
                      disabled={disabled || !isInMonth}
                      onClick={() => { onChange && onChange(ds); setOpen(false); }}
                      className={`h-10 text-sm flex items-center justify-center rounded ${
                        isInMonth ? '' : 'opacity-30'
                      } ${
                        isSel ? 'bg-purple-600 text-white' : 'hover:bg-white/10 text-white'
                      } disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
              <div className="px-3 pb-3 flex items-center justify-between">
                <button
                  type="button"
                  className="text-xs text-neutral-400 hover:text-white"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }}
                >
                  Έξοδος
                </button>
                <button
                  type="button"
                  className="text-xs px-3 py-1 rounded bg-purple-600 text-white hover:bg-purple-500 transition-colors"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }}
                >
                  Επιβαίωση
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Desktop/tablet: anchored popover to the input, aligned right
          <>
            {/* Backdrop to enable click-outside close on desktop popover */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute z-50 right-0 top-full mt-2 w-[320px] sm:w-[360px] max-w-[calc(100vw-24px)] rounded-md border border-white/10 bg-black shadow-lg overflow-hidden">
            <div className="px-3 py-2 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2">
                <select
                  className="bg-transparent text-white text-sm border border-white/10 rounded px-2 py-1"
                  value={cursor.getMonth()}
                  onChange={(e) => {
                    const month = parseInt(e.target.value, 10);
                    applyMonthYearChange(cursor.getFullYear(), month);
                  }}
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i} className="bg-black">{m}</option>
                  ))}
                </select>
                <select
                  className="w-24 bg-transparent text-white text-sm border border-white/10 rounded px-2 py-1"
                  value={cursor.getFullYear()}
                  onChange={(e) => {
                    const year = parseInt(e.target.value, 10);
                    applyMonthYearChange(year, cursor.getMonth());
                  }}
                >
                  {years.map((y) => (
                    <option key={y} value={y} className="bg-black">{y}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" aria-label="Προηγούμενος" title="Προηγούμενος" className="h-8 w-8 inline-flex items-center justify-center rounded border border-white/10 text-sm"
                  onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth()-1, 1))}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M12.78 15.78a.75.75 0 0 1-1.06 0l-5-5a.75.75 0 0 1 0-1.06l5-5a.75.75 0 1 1 1.06 1.06L8.06 10l4.72 4.72a.75.75 0 0 1 0 1.06Z" clipRule="evenodd"/></svg>
                </button>
                <button type="button" aria-label="Επόμενος" title="Επόμενος" className="h-8 w-8 inline-flex items-center justify-center rounded border border-white/10 text-sm"
                  onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth()+1, 1))}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M7.22 4.22a.75.75 0 0 1 1.06 0l5 5a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 1 1-1.06-1.06L11.94 10 7.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd"/></svg>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-0 px-2 pt-2">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center py-1 text-[11px] uppercase tracking-wider text-white/80">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0 p-2 max-h-[70vh] overflow-auto">
              {month.weeks.flat().map((d, idx) => {
                const ds = toYMD(d);
                const isInMonth = d.getMonth() === cursor.getMonth();
                const disabled = !insideRange(d);
                const isSel = value && ds === value;
                return (
                  <button
                    key={`${ds}-${idx}`}
                    type="button"
                    disabled={disabled || !isInMonth}
                    onClick={() => { onChange && onChange(ds); setOpen(false); }}
                    className={`h-9 text-sm flex items-center justify-center rounded ${
                      isInMonth ? '' : 'opacity-30'
                    } ${
                      isSel ? 'bg-purple-600 text-white' : 'hover:bg-white/10 text-white'
                    } disabled:opacity-30 disabled:cursor-not-allowed`}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
            <div className="px-3 pb-3 flex items-center justify-between">
              <button
                type="button"
                className="text-xs text-neutral-400 hover:text-white"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }}
              >
                Έξοδος
              </button>
              <button
                type="button"
                className="text-xs px-3 py-1 rounded bg-purple-600 text-white hover:bg-purple-500 transition-colors"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }}
              >
                Done
              </button>
            </div>
            </div>
          </>
        )
      )}
    </div>
  );
}
