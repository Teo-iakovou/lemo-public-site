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
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    if (!serviceId || !date) return;
    setLoading(true);
    getAvailability({ serviceId, date })
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
    return `/book/date?${p.toString()}`;
  }, [serviceId]);

  return (
    <main className="max-w-3xl mx-auto p-6">
      <BookingProgress />
      <h1 className="text-2xl font-semibold">Select a time</h1>
      <p className="text-neutral-600">
        Service: {serviceId || "(none)"} • Date: {date || "(none)"}
      </p>
      {loading && <p className="mt-2">Loading time slots…</p>}
      {error && <p className="mt-2 text-red-600">{error}</p>}
      <div className="flex gap-2 flex-wrap mt-3">
        {slots.map((t) => {
          const p = new URLSearchParams({ serviceId, date, time: t });
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
          Back
        </Link>
      </div>
    </main>
  );
}

export default function BookTimePage() {
  return (
    <Suspense fallback={<main className="max-w-3xl mx-auto p-6"><h1 className="text-2xl font-semibold">Select a time</h1><p className="text-neutral-600">Loading…</p></main>}>
      <BookTimeInner />
    </Suspense>
  );
}
