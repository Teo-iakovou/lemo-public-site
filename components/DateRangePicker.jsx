"use client";

import { useMemo, useState } from "react";

const TZ = "Europe/Athens";
const WEEKDAYS = ["Δ", "Τ", "Τ", "Π", "Π", "Σ", "Κ"]; // Mon → Sun
const MONTHS = [
  "Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος",
  "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος",
];

const pad = (n) => String(n).padStart(2, "0");
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`; // m is 0-based
const todayYMD = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });
const parse = (s) => {
  const [y, m, d] = String(s).split("-").map(Number);
  return { y, m: m - 1, d };
};
const lastDay = (y, m) => new Date(y, m + 1, 0).getDate();
const addDays = (s, n) => {
  const { y, m, d } = parse(s);
  const dt = new Date(y, m, d + n);
  return ymd(dt.getFullYear(), dt.getMonth(), dt.getDate());
};
export const formatShortDate = (s) => {
  if (!s) return "";
  const { y, m, d } = parse(s);
  return new Date(y, m, d).toLocaleDateString("el-GR", { day: "numeric", month: "short", year: "numeric" });
};

// Inline range picker: tap the first day, then the last day. Past days are disabled.
// `to` may be "" (open-ended) when allowOpenEnd is on.
export default function DateRangePicker({ from, to, onChange, allowOpenEnd = true }) {
  const today = todayYMD();
  const initial = parse(from || today);
  const [view, setView] = useState({ y: initial.y, m: initial.m });
  // "start" → next tap sets the start; "end" → next tap sets the end.
  const [picking, setPicking] = useState(from && !to ? "end" : "start");

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const lead = (first.getDay() + 6) % 7; // Monday-first
    const n = lastDay(view.y, view.m);
    return [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: n }, (_, i) => ymd(view.y, view.m, i + 1)),
    ];
  }, [view]);

  const tap = (ds) => {
    if (picking === "start" || !from || ds < from) {
      onChange({ from: ds, to: "" });
      setPicking("end");
    } else {
      onChange({ from, to: ds });
      setPicking("start");
    }
  };

  const shiftMonth = (delta) =>
    setView((v) => {
      const dt = new Date(v.y, v.m + delta, 1);
      return { y: dt.getFullYear(), m: dt.getMonth() };
    });

  const t = parse(today);
  const nextM = new Date(t.y, t.m + 1, 1);
  const presets = [
    {
      label: "Αυτός ο μήνας",
      from: today,
      to: ymd(t.y, t.m, lastDay(t.y, t.m)),
    },
    {
      label: MONTHS[nextM.getMonth()],
      from: ymd(nextM.getFullYear(), nextM.getMonth(), 1),
      to: ymd(nextM.getFullYear(), nextM.getMonth(), lastDay(nextM.getFullYear(), nextM.getMonth())),
    },
    { label: "Επόμενες 7 μέρες", from: today, to: addDays(today, 6) },
  ];
  const applyPreset = (p) => {
    onChange({ from: p.from, to: p.to });
    const f = parse(p.from);
    setView({ y: f.y, m: f.m });
    setPicking("start");
  };

  const canGoBack = view.y > t.y || (view.y === t.y && view.m > t.m);
  const chip = (active) =>
    `rounded-md border px-3 py-1.5 text-sm transition ${
      active
        ? "border-[#8B2FF0] bg-[#8B2FF0]/20 text-white"
        : "border-white/20 text-white/80 hover:bg-white/10"
    }`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            className={chip(from === p.from && to === p.to)}
            onClick={() => applyPreset(p)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            disabled={!canGoBack}
            aria-label="Προηγούμενος μήνας"
            className="h-9 w-9 rounded-lg border border-white/15 text-lg text-white/80 hover:bg-white/10 disabled:opacity-30"
          >
            ‹
          </button>
          <div className="text-sm font-semibold">
            {MONTHS[view.m]} {view.y}
          </div>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Επόμενος μήνας"
            className="h-9 w-9 rounded-lg border border-white/15 text-lg text-white/80 hover:bg-white/10"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-white/40">
          {WEEKDAYS.map((w, i) => (
            <div key={i} className="py-1">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((ds, i) => {
            if (!ds) return <div key={`e${i}`} />;
            const past = ds < today;
            const isStart = ds === from;
            const isEnd = ds === to;
            const inRange = from && to && ds > from && ds < to;
            const openTail = from && !to && allowOpenEnd && ds > from && picking !== "end";
            return (
              <button
                key={ds}
                type="button"
                disabled={past}
                onClick={() => tap(ds)}
                className={`h-10 rounded-lg text-sm transition ${
                  isStart || isEnd
                    ? "bg-[#8B2FF0] font-bold text-white"
                    : inRange
                    ? "bg-[#8B2FF0]/25 text-white"
                    : openTail
                    ? "bg-[#8B2FF0]/10 text-white/80"
                    : past
                    ? "text-white/20"
                    : "text-white/85 hover:bg-white/10"
                } ${ds === today && !isStart && !isEnd ? "ring-1 ring-white/30" : ""}`}
              >
                {parse(ds).d}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-white/80">
          {from ? (
            <>
              <b>{formatShortDate(from)}</b> →{" "}
              <b>{to ? formatShortDate(to) : allowOpenEnd ? "χωρίς λήξη" : "…"}</b>
            </>
          ) : (
            "Πάτα την πρώτη μέρα"
          )}
        </span>
        <span className="text-xs text-white/50">
          {picking === "end" ? "Πάτα την τελευταία μέρα" : "Πάτα για νέα αρχή"}
        </span>
      </div>
      {allowOpenEnd && from && to && (
        <button
          type="button"
          onClick={() => {
            onChange({ from, to: "" });
            setPicking("start");
          }}
          className="text-xs text-white/60 underline underline-offset-2 hover:text-white"
        >
          Χωρίς ημερομηνία λήξης
        </button>
      )}
    </div>
  );
}
