import { BACKEND_BASE_URL, DIRECT_BACKEND_URL } from "../../../../lib/config";
import { fetchPublicSettingsServer } from "../../../../lib/publicSettingsServer";
import { resolveScopedList, toBarberSettingsKey } from "../../../../lib/publicSettings";

export const runtime = 'nodejs';
// Always compute fresh; disable framework-level caching for this route
export const dynamic = 'force-dynamic';

// Simple in-memory cache with TTL (disabled)
const CACHE = new Map();
const TTL_MS = 0; // disable to reflect latest backend state immediately

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
  const explicitBarber = searchParams.get("barber") || "";
  const greekBarber =
    barberId === "lemo"
      ? "ΛΕΜΟ"
      : barberId === "forou"
      ? "ΦΟΡΟΥ"
      : barberId === "koushis"
      ? "ΚΟΥΣΙΗΣ"
      : explicitBarber;
  const normalizedKey =
    barberId ||
    (greekBarber === "ΛΕΜΟ"
      ? "lemo"
      : greekBarber === "ΦΟΡΟΥ"
      ? "forou"
      : greekBarber === "ΚΟΥΣΙΗΣ"
      ? "koushis"
      : "");
  // const serviceId = searchParams.get("serviceId"); // reserved

  if (!start) return Response.json({}, { status: 200 });
  if (!greekBarber) {
    return Response.json(
      { error: "Missing barber. Provide barberId=lemo|forou|koushis or barber=ΛΕΜΟ|ΦΟΡΟΥ|ΚΟΥΣΙΗΣ." },
      { status: 400 }
    );
  }

  // IMPORTANT: include a stable barber key even when only Greek 'barber' is provided
  const cacheKey = `${start}|${days}|${normalizedKey}|${include.sort().join(',')}`;
  const hit = CACHE.get(cacheKey);
  const cacheHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Vary': 'barberId, barber, start, days, include',
    'X-Debug-Barber-Key': normalizedKey,
  };
  if (TTL_MS > 0 && hit && Date.now() - hit.ts < TTL_MS) {
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
      // Backend expects 'barber' (Greek). Always set it to avoid unfiltered queries.
      qs.set("barber", greekBarber);
      if (include.includes('slots')) qs.set('include', 'slots');
      // Always bypass caches for freshness
      const res = await fetch(`${BASE}/api/availability/month?${qs.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const payload = data && data.counts ? data : { counts: data };
        const settings = await fetchPublicSettingsServer();
        const adjusted = applyManualOverlay(
          payload,
          startDate,
          endDate,
          settings,
          toBarberSettingsKey(barberId || greekBarber)
        );
        if (TTL_MS > 0) CACHE.set(cacheKey, { ts: Date.now(), data: adjusted });
        return Response.json(adjusted, { status: 200, headers: cacheHeaders });
      }
    } catch {}
  }

  // Fallback: return empty payload rather than recomputing heavy logic
  const empty = { counts: {} };
  const settings = await fetchPublicSettingsServer();
  const adjustedEmpty = applyManualOverlay(
    empty,
    startDate,
    endDate,
    settings,
    toBarberSettingsKey(barberId || greekBarber)
  );
  if (TTL_MS > 0) CACHE.set(cacheKey, { ts: Date.now(), data: adjustedEmpty });
  return Response.json(adjustedEmpty, { status: 200, headers: cacheHeaders });
}

function applyManualOverlay(payload, startDate, endDate, settings, barberKey) {
  const counts = { ...(payload.counts || {}) };
  const slots = payload.slots ? { ...(payload.slots || {}) } : undefined;
  const blockedDatesSet = new Set(
    resolveScopedList(settings, "barberBlockedDates", "blockedDates", barberKey)
  );
  const closedMonthsSet = new Set(
    resolveScopedList(settings, "barberClosedMonths", "closedMonths", barberKey)
  );
  const manualOpenDatesSet = new Set();
  (settings.allowedDates || []).forEach((ds) => manualOpenDatesSet.add(ds));
  Object.keys(settings.specialDayHours || {}).forEach((ds) => manualOpenDatesSet.add(ds));
  Object.keys(settings.extraDaySlots || {}).forEach((ds) => manualOpenDatesSet.add(ds));

  const iter = new Date(startDate.getTime());
  while (iter <= endDate) {
    const ds = toYMD(iter);
    const monthClosed = closedMonthsSet.has(iter.getMonth());
    const manualOpen = manualOpenDatesSet.has(ds);
    const manualClosed = blockedDatesSet.has(ds) || (monthClosed && !manualOpen);
    if (manualClosed) {
      counts[ds] = 0;
      if (slots) slots[ds] = [];
    }
    iter.setDate(iter.getDate() + 1);
  }

  const next = { ...payload, counts };
  if (slots) next.slots = slots;
  return next;
}
