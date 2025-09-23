import { BACKEND_BASE_URL, DIRECT_BACKEND_URL } from "../../../lib/config";

export const runtime = 'edge';
export const revalidate = 60; // seconds

// Lightweight in-memory cache for per-day availability
const CACHE = new Map();
const TTL_MS = 60 * 1000; // 60 seconds

function toYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalDate(dateStr) {
  // YYYY-MM-DD to Date at local midnight
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function businessWindow(date) {
  // Closed Sun (0) and Mon (1)
  const dow = date.getDay();
  if (dow === 0 || dow === 1) return null;
  // Saturday until 17:40, Tue–Fri until 19:00
  if (dow === 6) return { open: 9 * 60, close: 17 * 60 + 40 };
  return { open: 9 * 60, close: 19 * 60 };
}

function slotify({ date, duration = 40, step = 40 }) {
  const win = businessWindow(date);
  if (!win) return [];
  const slots = [];
  for (let t = win.open; t + duration <= win.close; t += step) {
    const hh = Math.floor(t / 60);
    const mm = t % 60;
    // Exclude exactly the 13:00–13:40 slot every day
    if (t === 13 * 60) continue;
    slots.push({ start: t, label: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}` });
  }
  return slots;
}

function overlaps(aStart, aDur, bStart, bDur) {
  const aEnd = aStart + aDur;
  const bEnd = bStart + bDur;
  return aStart < bEnd && bStart < aEnd;
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
  }
  // const serviceId = searchParams.get("serviceId");
  const cacheHeaders = {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    'Netlify-CDN-Cache-Control': 's-maxage=60, stale-while-revalidate=120',
    'Vary': 'barberId, barber, date, serviceId',
  };
  if (!date) return Response.json({ slots: [], ...(debugMode ? { debug: { ...dbg, reason: 'no-date' } } : {}) }, { status: 200, headers: cacheHeaders });

  const base = DIRECT_BACKEND_URL || BACKEND_BASE_URL || "";
  const duration = 40; // minutes per haircut
  const step = 40; // grid step in minutes (appointments every 40')

  const day = parseLocalDate(date);
  const win = businessWindow(day);
  if (!win) return Response.json({ slots: [], ...(debugMode ? { debug: { ...dbg, reason: 'closed-day' } } : {}) }, { status: 200, headers: cacheHeaders });

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
  if (hit && Date.now() - hit.ts < TTL_MS) {
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
      const res = await fetch(backendURL, { next: { revalidate: 60 } });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.appointments || [];
        // If backend returns any break for this date, treat the day as fully blocked
        const hasBreak = list.some((a) => a?.type === 'break' && toYMD(new Date(a.appointmentDateTime || a.start)) === date);
        if (debugMode) dbg.hasBreak = !!hasBreak;
        if (hasBreak) {
          return Response.json({ slots: [], ...(debugMode ? { debug: { ...dbg, cache: 'miss' } } : {}) }, { status: 200, headers: cacheHeaders });
        }
        existing = list
          .filter((a) => a?.appointmentDateTime || a?.start)
          // Treat both real appointments and breaks as blocking
          .filter((a) => (a?.appointmentStatus ? a.appointmentStatus === "confirmed" : true))
          .map((a) => ({
            start: new Date(a.appointmentDateTime || a.start),
            // Enforce 40-minute appointments for overlap logic
            duration: 40,
            barber: (a.barber || "").toLowerCase(),
          }))
          .filter((a) => toYMD(a.start) === date)
          // Compare using Greek lowercase id (backend data is Greek)
          .filter((a) => !greekLower || !a.barber || a.barber === greekLower);
        if (debugMode) dbg.existingCount = existing.length;
      }
    }
  } catch {
    // ignore backend errors; treat as no existing bookings
  }

  // Generate candidate slots and remove overlaps
  const candidates = slotify({ date: day, duration, step });
  const free = candidates.filter((c) => {
    // Convert minutes-from-midnight to minutes in the day and compare
    const startMinutes = c.start;
    return !existing.some((b) => {
      const bStartMinutes = b.start.getHours() * 60 + b.start.getMinutes();
      return overlaps(startMinutes, duration, bStartMinutes, b.duration);
    });
  });
  if (debugMode) dbg.candidates = candidates.length, dbg.free = free.length;

  // Apply cutoff if date is today (no booking inside next 60')
  const now = new Date();
  if (toYMD(now) === date) {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const cutoff = currentMinutes + 60;
    for (let i = free.length - 1; i >= 0; i--) {
      if (free[i].start < cutoff) free.splice(i, 1);
    }
    if (debugMode) dbg.freeAfterCutoff = free.length;
  }

  const out = free.map((s) => s.label);
  // Store in cache
  CACHE.set(cacheKey, { ts: Date.now(), slots: out });
  return Response.json({ slots: out, ...(debugMode ? { debug: { ...dbg, cache: 'miss' } } : {}) }, { status: 200, headers: cacheHeaders });
}
