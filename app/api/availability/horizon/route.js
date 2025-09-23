import { BACKEND_BASE_URL, DIRECT_BACKEND_URL } from "../../../../lib/config";

export const runtime = 'edge';
export const revalidate = 60; // seconds

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

// function businessWindow(date) {
//   const dow = date.getDay();
//   // Closed Sun (0) and Mon (1)
//   if (dow === 0 || dow === 1) return null;
//   // Saturday until 17:40, Tue–Fri until 19:00
//   if (dow === 6) return { open: 9 * 60, close: 17 * 60 + 40 };
//   return { open: 9 * 60, close: 19 * 60 };
// }

// function generateSlots({ date, duration = 40, step = 40 }) {
//   const win = businessWindow(date);
//   if (!win) return [];
//   const out = [];
//   const breakStart = 13 * 60; // 13:00
//   const breakEnd = 14 * 60; // 14:00
//   for (let t = win.open; t + duration <= win.close; t += step) {
//     const overlapsBreak = !(t + duration <= breakStart || breakEnd <= t);
//     if (overlapsBreak) continue;
//     out.push(t);
//   }
//   return out;
// }

// function overlaps(aStart, aDur, bStart, bDur) {
//   const aEnd = aStart + aDur;
//   const bEnd = bStart + bDur;
//   return aStart < bEnd && bStart < aEnd;
// }

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start"); // YYYY-MM-DD
  const days = Math.max(1, Math.min(parseInt(searchParams.get("days") || "14", 10), 90));
  const include = (searchParams.get("include") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const barberId = (searchParams.get("barberId") || "").toLowerCase();
  const greekBarber = barberId === 'lemo' ? 'ΛΕΜΟ' : barberId === 'forou' ? 'ΦΟΡΟΥ' : (searchParams.get('barber') || '');
  const normalizedKey = barberId || (greekBarber === 'ΛΕΜΟ' ? 'lemo' : greekBarber === 'ΦΟΡΟΥ' ? 'forou' : '');
  // const serviceId = searchParams.get("serviceId"); // reserved

  if (!start) return Response.json({}, { status: 200 });

  // IMPORTANT: include a stable barber key even when only Greek 'barber' is provided
  const cacheKey = `${start}|${days}|${normalizedKey}|${include.sort().join(',')}`;
  const hit = CACHE.get(cacheKey);
  const cacheHeaders = {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    'Netlify-CDN-Cache-Control': 's-maxage=60, stale-while-revalidate=300',
    'Vary': 'barberId, barber, start, days, include',
    'X-Debug-Barber-Key': normalizedKey,
  };
  if (hit && Date.now() - hit.ts < TTL_MS) {
    return Response.json(hit.data, { status: 200, headers: cacheHeaders });
  }

  const startDate = parseYMD(start);
  const endDate = new Date(startDate.getTime() + (days - 1) * 86400000);

  // Always proxy to backend month endpoint; prefer direct backend when configured
  const BASE = DIRECT_BACKEND_URL || BACKEND_BASE_URL;
  if (BASE) {
    try {
      const from = toYMD(startDate);
      const to = toYMD(endDate);
      const qs = new URLSearchParams({ from, to });
      // Backend expects 'barber' (Greek). Map stable ASCII ids to Greek here.
      if (barberId && greekBarber) qs.set('barber', greekBarber);
      else if (greekBarber) qs.set('barber', greekBarber);
      if (include.includes('slots')) qs.set('include', 'slots');
      // Allow backend Cache-Control (s-maxage, stale-while-revalidate) to be honored
      const res = await fetch(`${BASE}/api/availability/month?${qs.toString()}`, { next: { revalidate: 60 } });
      if (res.ok) {
        const data = await res.json();
        const payload = data && data.counts ? data : { counts: data };
        CACHE.set(cacheKey, { ts: Date.now(), data: payload });
        return Response.json(payload, { status: 200, headers: cacheHeaders });
      }
    } catch {}
  }

  // Fallback: return empty payload rather than recomputing heavy logic
  const empty = { counts: {} };
  CACHE.set(cacheKey, { ts: Date.now(), data: empty });
  return Response.json(empty, { status: 200, headers: cacheHeaders });
}
