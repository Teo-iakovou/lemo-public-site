"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getServices } from "../../lib/api";
import BookingProgress from "../../components/BookingProgress";

export default function BookServicePage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    getServices()
      .then((data) => {
        if (!mounted) return;
        setServices(Array.isArray(data) ? data : data?.services || []);
      })
      .catch((e) => setError(e.message || "Failed to load services"))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  // Auto-skip when exactly one service is available
  useEffect(() => {
    if (!loading && services && services.length === 1) {
      const s = services[0];
      const id = s.id || s._id;
      if (id) {
        const p = new URLSearchParams({ serviceId: String(id) });
        router.replace(`/book/date?${p.toString()}`);
      }
    }
  }, [loading, services, router]);

  return (
    <main className="max-w-3xl mx-auto p-6">
      <BookingProgress />
      <h1 className="text-2xl font-semibold">Book an appointment</h1>
      <p className="text-neutral-600">Select a service to continue.</p>
      {services.length === 1 && (
        <p className="mt-2 text-neutral-600">Redirecting to date selection…</p>
      )}
      {loading && <p className="mt-2">Loading services…</p>}
      {error && <p className="mt-2 text-red-600">{error}</p>}
      <div className="grid gap-3 mt-4">
        {services.map((s) => (
          <Link
            key={s.id || s._id}
            href={`/book/date?serviceId=${encodeURIComponent(s.id || s._id)}`}
            className="block p-4 border border-neutral-200 rounded-lg no-underline hover:bg-neutral-50"
          >
            <strong>{s.name}</strong>
            <div className="opacity-80">
              {s.duration ? `${s.duration} min` : null}
              {s.duration && s.price ? " • " : null}
              {s.price ? `${s.price}€` : null}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
