import { BACKEND_BASE_URL } from "../../../../lib/config";

// Simple in-memory cache with TTL
const CACHE = new Map();
const TTL_MS = 180 * 1000; // 3 minutes

function toYMD(d) {
  // Local YYYY-MM-DD to avoid UTC day drift
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYMD(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function businessWindow(date) {
  const dow = date.getDay();
  // Closed Sun (0) and Mon (1)
  if (dow === 0 || dow === 1) return null;
  // Saturday until 17:40, Tue–Fri until 19:00
  if (dow === 6) return { open: 9 * 60, close: 17 * 60 + 40 };
  return { open: 9 * 60, close: 19 * 60 };
}

function generateSlots({ date, duration = 40, step = 40 }) {
  const win = businessWindow(date);
  if (!win) return [];
  const out = [];
  const breakStart = 13 * 60; // 13:00
  const breakEnd = 14 * 60; // 14:00
  for (let t = win.open; t + duration <= win.close; t += step) {
    const overlapsBreak = !(t + duration <= breakStart || breakEnd <= t);
    if (overlapsBreak) continue;
    out.push(t);
  }
  return out;
}

function overlaps(aStart, aDur, bStart, bDur) {
  const aEnd = aStart + aDur;
  const bEnd = bStart + bDur;
  return aStart < bEnd && bStart < aEnd;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start"); // YYYY-MM-DD
  const days = Math.max(1, Math.min(parseInt(searchParams.get("days") || "14", 10), 90));
  const include = (searchParams.get("include") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const barberRaw = searchParams.get("barber") || ""; // pass this to backend as-is (e.g., ΛΕΜΟ / ΦΟΡΟΥ)
  const barber = barberRaw.toLowerCase(); // use lowercase only for local filtering & cache key
  // const serviceId = searchParams.get("serviceId"); // reserved

  if (!start) return Response.json({}, { status: 200 });

  const cacheKey = `${start}|${days}|${barber}|${include.sort().join(',')}`;
  const hit = CACHE.get(cacheKey);
  if (hit && Date.now() - hit.ts < TTL_MS) {
    return Response.json(hit.data, { status: 200, headers: { 'Cache-Control': 's-maxage=180, stale-while-revalidate=600' } });
  }

  const startDate = parseYMD(start);
  const endDate = new Date(startDate.getTime() + (days - 1) * 86400000);

  // If caller needs per-day slots, compute from appointment range in one backend call
  if (BACKEND_BASE_URL && include.includes('slots')) {
    try {
      const from = toYMD(startDate);
      const to = toYMD(endDate);
      const qs = new URLSearchParams({ from, to });
      if (barberRaw) qs.set("barber", barberRaw);
      const res = await fetch(`${BACKEND_BASE_URL}/api/appointments/range?${qs.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const docs = await res.json();
        const breakDays = new Set(
          (Array.isArray(docs) ? docs : [])
            .filter((a) => a?.type === 'break')
            .map((a) => toYMD(new Date(a.appointmentDateTime || a.start)))
        );
        const existing = (Array.isArray(docs) ? docs : [])
          .filter((a) => a?.appointmentDateTime || a?.start)
          .map((a) => ({
            start: new Date(a.appointmentDateTime || a.start),
            duration: 40,
            barber: (a.barber || '').toLowerCase(),
          }));

        const counts = {};
        const slotsMap = {};
        let firstAvailable = null;
        const todayYMD = toYMD(new Date());
        for (let i = 0; i < days; i++) {
          const d = new Date(startDate.getTime() + i * 86400000);
          const ds = toYMD(d);
          // Disallow past days (e.g., yesterday) from showing availability
          if (ds < todayYMD) { counts[ds] = 0; slotsMap[ds] = []; continue; }
          if (breakDays.has(ds)) { counts[ds] = 0; slotsMap[ds] = []; continue; }
          const cand = generateSlots({ date: d, duration: 40, step: 40 });
          if (!cand.length) { counts[ds] = 0; slotsMap[ds] = []; continue; }
          const dayAppts = existing.filter((b) => toYMD(b.start) === ds);
          const freeNums = cand.filter((s) => !dayAppts.some((b) => {
            const bStart = b.start.getHours() * 60 + b.start.getMinutes();
            return overlaps(s, 40, bStart, b.duration);
          }));
          // Same-day cutoff 60'
          const now = new Date();
          if (toYMD(now) === ds) {
            const cutoff = now.getHours() * 60 + now.getMinutes() + 60;
            for (let k = freeNums.length - 1; k >= 0; k--) if (freeNums[k] < cutoff) freeNums.splice(k, 1);
          }
          const labels = freeNums.map((t) => `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`);
          counts[ds] = labels.length;
          slotsMap[ds] = labels;
          if (!firstAvailable && ds >= todayYMD && labels.length) {
            firstAvailable = { date: ds, slots: labels };
          }
        }
        const payload = { counts, slots: slotsMap, firstAvailable };
        CACHE.set(cacheKey, { ts: Date.now(), data: payload });
        return Response.json(payload, { status: 200, headers: { 'Cache-Control': 's-maxage=180, stale-while-revalidate=600' } });
      }
    } catch {}
  }

  // Delegate to backend month endpoint when available for speed (counts only)
  if (BACKEND_BASE_URL) {
    try {
      const from = toYMD(startDate);
      const to = toYMD(endDate);
      const qs = new URLSearchParams({ from, to });
      if (barberRaw) qs.set("barber", barberRaw);
      const res = await fetch(`${BACKEND_BASE_URL}/api/availability/month?${qs.toString()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const payload = data && data.counts ? data : { counts: data };
        CACHE.set(cacheKey, { ts: Date.now(), data: payload });
        return Response.json(payload, { status: 200, headers: { 'Cache-Control': 's-maxage=180, stale-while-revalidate=600' } });
      }
    } catch {}
  }

  // Fetch all appointments once from backend
  let existing = [];
  try {
    const base = BACKEND_BASE_URL || "";
    if (base) {
      const res = await fetch(`${base}/api/appointments?limit=2000`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.appointments || [];
        existing = list
          .filter((a) => a?.appointmentDateTime)
          // Include breaks as blocking as well
          .filter((a) => (a?.appointmentStatus ? a.appointmentStatus === "confirmed" : true))
          .map((a) => ({
            start: new Date(a.appointmentDateTime),
            // Enforce 40-minute appointments for overlap logic
            duration: 40,
            barber: (a.barber || "").toLowerCase(),
          }))
          .filter((a) => a.start >= startDate && a.start <= new Date(endDate.getTime() + 86399999))
          .filter((a) => !barber || !a.barber || a.barber === barber);
      }
    }
  } catch (e) {
    // ignore errors; treat as no appointments
  }

  const result = {};
  const slotsMap = include.includes('slots') ? {} : null;
  const todayYMD = toYMD(new Date());
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate.getTime() + i * 86400000);
    const ds = toYMD(d);
    // Disallow past days in counts/slots
    if (ds < todayYMD) {
      result[ds] = 0;
      if (slotsMap) slotsMap[ds] = [];
      continue;
    }
    const slots = generateSlots({ date: d, duration: 40, step: 40 });
    if (!slots.length) {
      result[ds] = 0;
      if (slotsMap) slotsMap[ds] = [];
      continue;
    }
    const dayAppointments = existing.filter((b) => toYMD(b.start) === ds);
    const free = slots.filter((s) => {
      return !dayAppointments.some((b) => {
        const bStart = b.start.getHours() * 60 + b.start.getMinutes();
        return overlaps(s, 40, bStart, b.duration);
      });
    });
    // Apply same-day 60' cutoff
    const now = new Date();
    if (toYMD(now) === ds) {
      const cutoff = now.getHours() * 60 + now.getMinutes() + 60;
      for (let k = free.length - 1; k >= 0; k--) if (free[k] < cutoff) free.splice(k, 1);
    }
    result[ds] = free.length;
    if (slotsMap) {
      const labels = free.map((t) => `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`);
      slotsMap[ds] = labels;
    }
  }

  const payload = slotsMap ? { counts: { ...result }, slots: slotsMap } : { counts: { ...result } };
  CACHE.set(cacheKey, { ts: Date.now(), data: payload });
  return Response.json(payload, { status: 200, headers: { 'Cache-Control': 's-maxage=180, stale-while-revalidate=600' } });
}
