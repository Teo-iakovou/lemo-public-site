export const dynamic = 'force-dynamic';

async function fetchMonth(start, barberId) {
  const qs = new URLSearchParams({ start, days: String(new Date(new Date(start).getFullYear(), new Date(start).getMonth()+1, 0).getDate()), include: 'slots' });
  if (barberId) qs.set('barberId', barberId);
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
  const next = new Date(now.getFullYear(), now.getMonth()+1, 1);
  const nextMonthStart = toMonthStart(next);

  const [lemoCurr, forouCurr, lemoNext, forouNext] = await Promise.all([
    fetchMonth(monthStart, 'lemo').catch(()=>null),
    fetchMonth(monthStart, 'forou').catch(()=>null),
    fetchMonth(nextMonthStart, 'lemo').catch(()=>null),
    fetchMonth(nextMonthStart, 'forou').catch(()=>null),
  ]);

  const initial = {
    monthStart,
    nextMonthStart,
    LEMO: { current: lemoCurr || null, next: lemoNext || null },
    FOROU: { current: forouCurr || null, next: forouNext || null },
  };
  const json = JSON.stringify(initial).replace(/</g, '\\u003c');
  return (
    <script
      // Inject initial month bundle for instant modal render
      dangerouslySetInnerHTML={{ __html: `window.__BOOKING_INITIAL=${json};` }}
    />
  );
}
