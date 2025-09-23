"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import BookingProgress from "../../../components/BookingProgress";
import PhoneInputIntl from "../../../components/PhoneInputIntl";

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
          <div className="mt-2 flex items-center gap-2 p-2 rounded-md border border-neutral-300 bg-white focus-within:border-black">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-neutral-500">
              <path fillRule="evenodd" d="M10 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 14a6 6 0 1 1 12 0v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-1Z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              required
              className="flex-1 bg-transparent outline-none border-0"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-sm">Phone</span>
          <PhoneInputIntl value={phone} onChange={setPhone} defaultCountry="CY" />
        </label>
        <label className="block">
          <div className="mt-2 flex items-center gap-2 p-2 rounded-md border border-neutral-300 bg-white focus-within:border-black">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-neutral-500">
              <path d="M1.94 6.94A2.5 2.5 0 0 1 4.44 4.5h11.12a2.5 2.5 0 0 1 2.5 2.44l-7.06 4.41a1.5 1.5 0 0 1-1.58 0L1.94 6.94Z" />
              <path d="M18 8.86V13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.86l6.35 3.97a3 3 0 0 0 3.3 0L18 8.86Z" />
            </svg>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (optional)"
              className="flex-1 bg-transparent outline-none border-0"
            />
          </div>
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
