import { BACKEND_BASE_URL, DIRECT_BACKEND_URL } from "../../../lib/config";
import { fetchPublicSettingsServer } from "../../../lib/publicSettingsServer";

export const runtime = 'nodejs';
// Always compute fresh; disable framework-level caching for this route
export const dynamic = 'force-dynamic';

// Lightweight in-memory cache for per-day availability
const CACHE = new Map();
const TTL_MS = 5000; // 5s tiny TTL for snappier UX while keeping freshness

const CY_TIMEZONE = "Europe/Athens";
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function toYMD(d) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateStr) {
  // YYYY-MM-DD to Date at local midnight
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function zonedMinutes(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CY_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

function businessWindow(date, forceOpen = false) {
  // Closed Sun (0) and Mon (1)
  const dow = date.getDay();
  if (!forceOpen && (dow === 0 || dow === 1)) return null;
  // Open 09:00 – 19:40 for all trading days so the final 19:00 slot is available
  return { open: 9 * 60, close: 19 * 60 + 40 };
}

function slotify({ date, duration = 40, step = 40, forceOpen = false }) {
  const win = businessWindow(date, forceOpen);
  if (!win) return [];
  const slots = [];
  for (let t = win.open; t + duration <= win.close; t += step) {
    const hh = Math.floor(t / 60);
    const mm = t % 60;
    // Allow all business-window slots; do not exclude lunch by default
    slots.push({ start: t, label: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}` });
  }
  return slots;
}

function overlaps(aStart, aDur, bStart, bDur) {
  const aEnd = aStart + aDur;
  const bEnd = bStart + bDur;
  return aStart < bEnd && bStart < aEnd;
}

function hhmmToMinutes(value) {
  if (typeof value !== "string") return null;
  const match = TIME_RE.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function minutesToHHMM(totalMinutes) {
  const clamped = Math.max(0, Math.min(totalMinutes, 23 * 60 + 40));
  const h = String(Math.floor(clamped / 60)).padStart(2, "0");
  const m = String(clamped % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function listToSlots(list) {
  if (!Array.isArray(list) || !list.length) return [];
  const map = new Map();
  list.forEach((label) => {
    const minutes = hhmmToMinutes(label);
    if (minutes == null) return;
    if (!map.has(minutes)) {
      map.set(minutes, { start: minutes, label: minutesToHHMM(minutes) });
    }
  });
  return Array.from(map.values()).sort((a, b) => a.start - b.start);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const debugMode = searchParams.get("debug") === "1";
  const dbg = {};
  const date = searchParams.get("date");
  const barberId = (searchParams.get("barberId") || "").toLowerCase();
  const barberRaw = barberId === 'lemo' ? 'ΛΕΜΟ' : barberId === 'forou' ? 'ΦΟΡΟΥ' : (searchParams.get('barber') || "");
  // Normalize to Greek lowercase for local comparisons (matches backend data)
  const greekLower = barberId === 'lemo' ? 'λεμο' : barberId === 'forou' ? 'φορου' : (barberRaw || '').toLowerCase();
  if (debugMode) {
    dbg.query = { date, barberId, barberRaw, greekLower };
    dbg.version = 'per-day-v3';
  }
  // const serviceId = searchParams.get("serviceId");
  const cacheHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Vary': 'barberId, barber, date, serviceId',
    'X-Route-Version': 'per-day-v3',
  };
  if (!date) return Response.json({ slots: [], ...(debugMode ? { debug: { ...dbg, reason: 'no-date' } } : {}) }, { status: 200, headers: cacheHeaders });

  const base = DIRECT_BACKEND_URL || BACKEND_BASE_URL || "";
  const duration = 40; // minutes per haircut
  const step = 40; // grid step in minutes (appointments every 40')

  const settings = await fetchPublicSettingsServer();
  const blockedDatesSet = new Set(settings.blockedDates || []);
  const closedMonthsSet = new Set(settings.closedMonths || []);
  const allowedDatesSet = new Set(settings.allowedDates || []);
  const whitelistDatesSet = new Set(Object.keys(settings.specialDayHours || {}));
  const extraDatesSet = new Set(Object.keys(settings.extraDaySlots || {}));
  const manualOpenDatesSet = new Set();
  allowedDatesSet.forEach((ds) => manualOpenDatesSet.add(ds));
  whitelistDatesSet.forEach((ds) => manualOpenDatesSet.add(ds));
  extraDatesSet.forEach((ds) => manualOpenDatesSet.add(ds));

  const day = parseLocalDate(date);
  const monthClosed = closedMonthsSet.has(day.getMonth());
  const manualOpen = manualOpenDatesSet.has(date);
  const manualClosed = blockedDatesSet.has(date) || (monthClosed && !manualOpen);
  if (debugMode) {
    dbg.manual = { open: manualOpen, closed: manualClosed, monthClosed };
  }
  if (manualClosed) {
    return Response.json({ slots: [], ...(debugMode ? { debug: { ...dbg, reason: 'manual-closed' } } : {}) }, { status: 200, headers: cacheHeaders });
  }

  const whitelistTimes = Array.isArray(settings.specialDayHours?.[date]) ? settings.specialDayHours[date] : [];
  const extraTimes = Array.isArray(settings.extraDaySlots?.[date]) ? settings.extraDaySlots[date] : [];

  const win = businessWindow(day, manualOpen);
  if (!win && !manualOpen) {
    return Response.json({ slots: [], ...(debugMode ? { debug: { ...dbg, reason: 'closed-day' } } : {}) }, { status: 200, headers: cacheHeaders });
  }

  let candidates = slotify({ date: day, duration, step, forceOpen: manualOpen });
  if (whitelistTimes.length) {
    candidates = listToSlots(whitelistTimes);
  }

  // Do not allow booking in the past (e.g., yesterday)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (toYMD(day) < toYMD(today)) {
    return Response.json({ slots: [] }, { status: 200, headers: cacheHeaders });
  }

  // Serve from cache when possible
  const cacheKey = `${date}|${barberId || barberRaw}`;
  if (debugMode) dbg.cacheKey = cacheKey;
  const hit = CACHE.get(cacheKey);
  if (TTL_MS > 0 && hit && Date.now() - hit.ts < TTL_MS) {
    return Response.json({ slots: hit.slots, ...(debugMode ? { debug: { ...dbg, cache: 'hit' } } : {}) }, { status: 200, headers: cacheHeaders });
  }

  // Fetch existing appointments for just this day (and barber if provided)
  let existing = [];
  try {
    if (base) {
      const qs = new URLSearchParams({ from: date, to: date });
      // Backend expects Greek barber; do not send barberId
      if (barberRaw) qs.set("barber", barberRaw);
      const backendURL = `${base}/api/appointments/range?${qs.toString()}`;
      if (debugMode) dbg.backendURL = backendURL;
      const res = await fetch(backendURL, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.appointments || [];
        // Breaks are treated as blocking intervals (not whole-day blockers)
        const hasBreak = list.some((a) => a?.type === 'break' && toYMD(new Date(a.appointmentDateTime || a.start)) === date);
        if (debugMode) dbg.hasBreak = !!hasBreak;
        existing = list
          .filter((a) => a?.appointmentDateTime || a?.start)
          // Treat both real appointments and breaks as blocking
          .filter((a) => (a?.appointmentStatus ? a.appointmentStatus === "confirmed" : true))
          .map((a) => {
            const start = new Date(a.appointmentDateTime || a.start);
            let duration = 40;
            if (typeof a.duration === 'number' && isFinite(a.duration) && a.duration > 0) {
              duration = a.duration;
            } else if (a.endTime) {
              const end = new Date(a.endTime);
              const diffMin = Math.max(1, Math.round((end - start) / 60000));
              duration = diffMin;
            }
            // Guard against extreme values (cap to 12 hours)
            duration = Math.min(duration, 12 * 60);
            return {
              start,
              duration,
              barber: (a.barber || "").toLowerCase(),
              type: a.type || 'appointment',
            };
          })
          .filter((a) => toYMD(a.start) === date)
          // When a specific barber is requested, only consider entries for that barber.
          // Do NOT treat missing barber as global; keep breaks strictly per-barber.
          .filter((a) => !greekLower || a.barber === greekLower);
        if (debugMode) {
          dbg.existingCount = existing.length;
          dbg.blocks = existing.map((b) => {
            const startMin = zonedMinutes(b.start);
            const endMin = startMin + b.duration;
            const fmt = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
            return { type: b.type || 'appointment', startMin, endMin, start: fmt(startMin), end: fmt(endMin) };
          });
        }
      }
    }
  } catch {
    // ignore backend errors; treat as no existing bookings
  }

  // Generate candidate slots and remove overlaps
  let removedByOverlap = [];
  let free = [];
  for (const c of candidates) {
    const startMinutes = c.start;
    const overlappers = existing.filter((b) => {
      const bStartMinutes = zonedMinutes(b.start);
      return overlaps(startMinutes, duration, bStartMinutes, b.duration);
    });
    if (overlappers.length) {
      removedByOverlap.push({
        slot: c.label,
        overlaps: overlappers.map((b) => {
          const bs = zonedMinutes(b.start);
          const be = bs + b.duration;
          const fmt = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
          return { type: b.type || 'appointment', start: fmt(bs), end: fmt(be) };
        })
      });
    } else {
      free.push(c);
    }
  }
  if (debugMode) {
    dbg.window = businessWindow(day, manualOpen);
    dbg.candidates = candidates.map((c) => c.label);
    dbg.removedByOverlap = removedByOverlap;
    dbg.freeInitial = free.map((c) => c.label);
  }

  // Apply cutoff if date is today (no booking inside next 60')
  const now = new Date();
  if (toYMD(now) === date) {
    const currentMinutes = zonedMinutes(now);
    const cutoff = currentMinutes + 60;
    const before = free.map((c) => c.label);
    const removed = [];
    for (let i = free.length - 1; i >= 0; i--) {
      if (free[i].start < cutoff) removed.push(free[i].label), free.splice(i, 1);
    }
    if (debugMode) {
      dbg.cutoff = cutoff;
      dbg.removedByCutoff = removed;
      dbg.freeAfterCutoff = free.map((c) => c.label);
    }
  }

  const out = free.map((s) => s.label);
  // Store in cache (guarded by TTL)
  if (TTL_MS > 0) CACHE.set(cacheKey, { ts: Date.now(), slots: out });
  return Response.json({ slots: out, ...(debugMode ? { debug: { ...dbg, cache: 'miss' } } : {}) }, { status: 200, headers: cacheHeaders });
}
