export const dynamic = 'force-dynamic';

async function fetchMonth(start, barber) {
  const qs = new URLSearchParams({ start, days: String(new Date(new Date(start).getFullYear(), new Date(start).getMonth()+1, 0).getDate()) });
  if (barber) qs.set('barber', barber);
  const res = await fetch(`/api/availability/horizon?${qs.toString()}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

function toMonthStart(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  return `${y}-${m}-01`;
}

export default async function BookingSSRProvider() {
  const now = new Date();
  const monthStart = toMonthStart(now);
  const lemo = await fetchMonth(monthStart, 'ΛΕΜΟ').catch(()=>null);
  const forou = await fetchMonth(monthStart, 'ΦΟΡΟΥ').catch(()=>null);
  const initial = { monthStart, LEMO: lemo || null, FOROU: forou || null };
  const json = JSON.stringify(initial).replace(/</g, '\\u003c');
  return (
    <script
      // Inject initial month bundle for instant modal render
      dangerouslySetInnerHTML={{ __html: `window.__BOOKING_INITIAL=${json};` }}
    />
  );
}
