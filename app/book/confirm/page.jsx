"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createAppointment } from "../../../lib/api";
import BookingProgress from "../../../components/BookingProgress";

function BookConfirmInner() {
  const search = useSearchParams();
  const router = useRouter();
  const serviceId = search.get("serviceId") || "";
  const date = search.get("date") || "";
  const time = search.get("time") || "";
  const name = search.get("name") || "";
  const phone = search.get("phone") || "";
  const email = search.get("email") || "";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const summary = useMemo(() => {
    return [
      ["Service", serviceId],
      ["Date", date],
      ["Time", time],
      ["Name", name],
      ["Phone", phone],
      email ? ["Email", email] : null,
    ].filter(Boolean);
  }, [serviceId, date, time, name, phone, email]);

  async function onConfirm() {
    setSubmitting(true);
    setError("");
    try {
      const dateTime = `${date}T${time}`;
      const payload = { serviceId, dateTime, name, phone };
      if (email) payload.email = email;
      const result = await createAppointment(payload);
      const id = result?.id || result?._id || "";
      const p = new URLSearchParams();
      if (id) p.set("id", id);
      router.push(`/success?${p.toString()}`);
    } catch (e) {
      setError(e.message || "Failed to create appointment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      <BookingProgress />
      <h1 className="text-2xl font-semibold">Confirm booking</h1>
      <ul className="mt-3 list-disc pl-6">
        {summary.map(([k, v]) => (
          <li key={k}>
            <strong>{k}:</strong> {String(v)}
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-red-600">{error}</p>}
      <button
        onClick={onConfirm}
        disabled={submitting}
        className="mt-4 px-4 py-2 rounded-md bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-400 disabled:cursor-not-allowed"
      >
        {submitting ? "Booking…" : "Confirm and book"}
      </button>
    </main>
  );
}

export default function BookConfirmPage() {
  return (
    <Suspense fallback={<main className="max-w-3xl mx-auto p-6"><h1 className="text-2xl font-semibold">Confirm booking</h1><p className="text-neutral-600">Loading…</p></main>}>
      <BookConfirmInner />
    </Suspense>
  );
}
