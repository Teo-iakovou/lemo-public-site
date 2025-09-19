import { BACKEND_BASE_URL } from "../../../lib/config";

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

function slotify({ date, duration = 40, step = 20 }) {
  const win = businessWindow(date);
  if (!win) return [];
  const slots = [];
  const breakStart = 13 * 60; // 13:00
  const breakEnd = 14 * 60; // 14:00 (1 hour break)
  for (let t = win.open; t + duration <= win.close; t += step) {
    const hh = Math.floor(t / 60);
    const mm = t % 60;
    // Exclude slots overlapping the break window
    const overlapsBreak = !(t + duration <= breakStart || breakEnd <= t);
    if (overlapsBreak) continue;
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
  const date = searchParams.get("date");
  const barberRaw = searchParams.get("barber") || ""; // e.g., ΛΕΜΟ | ΦΟΡΟΥ
  const barber = barberRaw.toLowerCase();
  // const serviceId = searchParams.get("serviceId");
  if (!date) return Response.json({ slots: [] }, { status: 200 });

  const base = BACKEND_BASE_URL || "";
  const duration = 40; // minutes per haircut
  const step = 20; // grid step in minutes

  const day = parseLocalDate(date);
  const win = businessWindow(day);
  if (!win) return Response.json({ slots: [] }, { status: 200 });

  // Do not allow booking in the past (e.g., yesterday)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (toYMD(day) < toYMD(today)) {
    return Response.json({ slots: [] }, { status: 200 });
  }

  // Serve from cache when possible
  const cacheKey = `${date}|${barberRaw}`;
  const hit = CACHE.get(cacheKey);
  if (hit && Date.now() - hit.ts < TTL_MS) {
    return Response.json({ slots: hit.slots }, { status: 200 });
  }

  // Fetch existing appointments for just this day (and barber if provided)
  let existing = [];
  try {
    if (base) {
      const qs = new URLSearchParams({ from: date, to: date });
      if (barberRaw) qs.set("barber", barberRaw);
      const res = await fetch(`${base}/api/appointments/range?${qs.toString()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.appointments || [];
        existing = list
          .filter((a) => a?.appointmentDateTime || a?.start)
          .filter((a) => (a?.type ? a.type === "appointment" : true))
          .filter((a) => (a?.appointmentStatus ? a.appointmentStatus === "confirmed" : true))
          .map((a) => ({
            start: new Date(a.appointmentDateTime || a.start),
            // Enforce 40-minute appointments for overlap logic
            duration: 40,
            barber: (a.barber || "").toLowerCase(),
          }))
          .filter((a) => toYMD(a.start) === date)
          .filter((a) => !barber || !a.barber || a.barber === barber);
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

  // Apply cutoff if date is today (no booking inside next 60')
  const now = new Date();
  if (toYMD(now) === date) {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const cutoff = currentMinutes + 60;
    for (let i = free.length - 1; i >= 0; i--) {
      if (free[i].start < cutoff) free.splice(i, 1);
    }
  }

  const out = free.map((s) => s.label);
  // Store in cache
  CACHE.set(cacheKey, { ts: Date.now(), slots: out });
  return Response.json({ slots: out }, { status: 200 });
}
