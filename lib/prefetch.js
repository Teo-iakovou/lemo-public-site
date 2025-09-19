let cache = {
  ts: 0,
  services: null,
  counts: null,
  appointments: null,
  start: null,
  days: 14,
};

export function getPrefetchedBookingData() {
  return {
    services: cache.services,
    counts: cache.counts,
    appointments: cache.appointments,
    start: cache.start,
    days: cache.days,
    ts: cache.ts,
  };
}

export async function prefetchBookingData(days = 14) {
  try {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const start = `${startDate.getFullYear()}-${String(startDate.getMonth()+1).padStart(2,'0')}-01`;
    const svcPromise = fetch("/api/services", { cache: "no-store" });
    const horizonMonth = fetch(`/api/availability/horizon?start=${start}&days=${days}`, { cache: "no-store" });
    // Warm cache for both barbers current and next month (Greek labels)
    const nextStartDate = new Date(startDate.getFullYear(), startDate.getMonth()+1, 1);
    const nextStart = `${nextStartDate.getFullYear()}-${String(nextStartDate.getMonth()+1).padStart(2,'0')}-01`;
    const horizonLemo = fetch(`/api/availability/horizon?start=${start}&days=${days}&barber=${encodeURIComponent("ΛΕΜΟ")}`, { cache: "no-store" });
    const horizonForou = fetch(`/api/availability/horizon?start=${start}&days=${days}&barber=${encodeURIComponent("ΦΟΡΟΥ")}`, { cache: "no-store" });
    const nextLemo = fetch(`/api/availability/horizon?start=${nextStart}&days=${days}&barber=${encodeURIComponent("ΛΕΜΟ")}`, { cache: "no-store" });
    const nextForou = fetch(`/api/availability/horizon?start=${nextStart}&days=${days}&barber=${encodeURIComponent("ΦΟΡΟΥ")}`, { cache: "no-store" });
    const t0 = Date.now();
    const [svcRes] = await Promise.all([svcPromise]);
    // Fire-and-forget warms
    horizonMonth.catch(()=>{});
    horizonLemo.catch(()=>{});
    horizonForou.catch(()=>{});
    nextLemo.catch(()=>{});
    nextForou.catch(()=>{});
    const elapsedMs = Date.now() - t0;
    const services = await svcRes.json().catch(() => []);
    const counts = {}; // leave empty; modal will fetch month on barber select
    cache = {
      ts: Date.now(),
      services: Array.isArray(services) ? services : services?.services || [],
      counts: counts || {},
      appointments: [],
      start,
      days,
    };
    return { elapsedMs };
  } catch (_) {
    // ignore prefetch errors; cache stays empty
    return { elapsedMs: 0 };
  }
}
