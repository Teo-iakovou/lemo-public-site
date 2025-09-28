"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getAvailability } from "../../../lib/api";
import BookingProgress from "../../../components/BookingProgress";

function BookTimeInner() {
  const search = useSearchParams();
  const serviceId = search.get("serviceId") || "";
  const date = search.get("date") || "";
  const barberId = (search.get("barberId") || "").toLowerCase();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Seed from SSR-injected month bundle for instant paint (then refresh per-day)
  useEffect(() => {
    try {
      if (!date) return;
      const w = typeof window !== 'undefined' ? window.__BOOKING_INITIAL : null;
      if (!w) return;
      const key = barberId === 'lemo' ? 'LEMO' : barberId === 'forou' ? 'FOROU' : null;
      if (!key) return;
      const pack = w[key];
      const bundles = [];
      if (pack && (pack.current || pack.next)) {
        if (pack.current) bundles.push(pack.current);
        if (pack.next) bundles.push(pack.next);
      } else if (pack) {
        bundles.push(pack);
      }
      for (const b of bundles) {
        const map = b?.slots || {};
        if (map && map[date] && map[date].length) {
          setSlots(map[date]);
          setLoading(false);
          break;
        }
      }
    } catch {}
  }, [date, barberId]);

  useEffect(() => {
    let mounted = true;
    if (!serviceId || !date) return;
    setLoading(true);
    getAvailability({ serviceId, date, barberId: barberId || undefined })
      .then((data) => {
        if (!mounted) return;
        const arr = Array.isArray(data) ? data : data?.slots || [];
        setSlots(arr);
      })
      .catch((e) => setError(e.message || "Failed to load availability"))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [serviceId, date]);

  const backHref = useMemo(() => {
    const p = new URLSearchParams({ serviceId });
    if (barberId) p.set('barberId', barberId);
    return `/book/date?${p.toString()}`;
  }, [serviceId, barberId]);

  return (
    <main className="max-w-3xl mx-auto p-6">
      <BookingProgress />
      <h1 className="text-2xl font-semibold">Επιλέξτε ώρα</h1>
      <p className="text-neutral-600">
        Υπηρεσία: {serviceId || "(καμία)"} • Ημερομηνία: {date || "(καμία)"}
      </p>
      {loading && <p className="mt-2">Φόρτωση διαθέσιμων ωρών…</p>}
      {error && <p className="mt-2 text-red-600">{error}</p>}
      <div className="flex gap-2 flex-wrap mt-3">
        {slots.map((t) => {
          const p = new URLSearchParams({ serviceId, date, time: t });
          if (barberId) p.set('barberId', barberId);
          return (
            <Link
              key={t}
              href={`/book/details?${p.toString()}`}
              className="inline-block px-3 py-2 border border-neutral-200 rounded-md no-underline hover:bg-neutral-50"
            >
              {t}
            </Link>
          );
        })}
      </div>
      <div className="mt-4">
        <Link href={backHref} className="underline">
          Πίσω
        </Link>
      </div>
    </main>
  );
}

export default function BookTimePage() {
  return (
    <Suspense fallback={<main className="max-w-3xl mx-auto p-6"><h1 className="text-2xl font-semibold">Επιλέξτε ώρα</h1><p className="text-neutral-600">Φόρτωση…</p></main>}>
      <BookTimeInner />
    </Suspense>
  );
}
