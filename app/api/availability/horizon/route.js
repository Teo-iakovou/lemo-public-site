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

  // Always proxy to backend month endpoint; backend computes counts/slots
  if (BACKEND_BASE_URL) {
    try {
      const from = toYMD(startDate);
      const to = toYMD(endDate);
      const qs = new URLSearchParams({ from, to });
      if (barberRaw) qs.set("barber", barberRaw);
      if (include.includes('slots')) qs.set('include', 'slots');
      const res = await fetch(`${BACKEND_BASE_URL}/api/availability/month?${qs.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const payload = data && data.counts ? data : { counts: data };
        CACHE.set(cacheKey, { ts: Date.now(), data: payload });
        return Response.json(payload, { status: 200, headers: { 'Cache-Control': 's-maxage=180, stale-while-revalidate=600' } });
      }
    } catch {}
  }

  // Fallback: return empty payload rather than recomputing heavy logic
  const empty = { counts: {} };
  CACHE.set(cacheKey, { ts: Date.now(), data: empty });
  return Response.json(empty, { status: 200, headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } });
}
