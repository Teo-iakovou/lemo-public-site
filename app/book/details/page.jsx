"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import BookingProgress from "../../../components/BookingProgress";

function BookDetailsInner() {
  const search = useSearchParams();
  const router = useRouter();
  const serviceId = search.get("serviceId") || "";
  const date = search.get("date") || "";
  const time = search.get("time") || "";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const canContinue = useMemo(() => {
    return Boolean(serviceId && date && time && name && phone);
  }, [serviceId, date, time, name, phone]);

  function onNext(e) {
    e.preventDefault();
    if (!canContinue) return;
    const p = new URLSearchParams({ serviceId, date, time, name, phone });
    if (email) p.set("email", email);
    router.push(`/book/confirm?${p.toString()}`);
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      <BookingProgress />
      <h1 className="text-2xl font-semibold">Your details</h1>
      <p className="text-neutral-600">
        {date} at {time}
      </p>
      <form onSubmit={onNext} className="grid gap-3 mt-3">
        <label className="block">
          <span className="text-sm">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="block mt-2 p-2 border border-neutral-200 rounded-md w-full"
          />
        </label>
        <label className="block">
          <span className="text-sm">Phone</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="block mt-2 p-2 border border-neutral-200 rounded-md w-full"
          />
        </label>
        <label className="block">
          <span className="text-sm">Email (optional)</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block mt-2 p-2 border border-neutral-200 rounded-md w-full"
          />
        </label>
        <button
          type="submit"
          disabled={!canContinue}
          className={`px-4 py-2 rounded-md text-white ${
            canContinue ? "bg-black hover:bg-neutral-800" : "bg-neutral-400 cursor-not-allowed"
          }`}
        >
          Review booking
        </button>
      </form>
    </main>
  );
}

export default function BookDetailsPage() {
  return (
    <Suspense fallback={<main className="max-w-3xl mx-auto p-6"><h1 className="text-2xl font-semibold">Your details</h1><p className="text-neutral-600">Loading…</p></main>}>
      <BookDetailsInner />
    </Suspense>
  );
}
