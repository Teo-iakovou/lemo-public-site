"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import BookingProgress from "../../../components/BookingProgress";
import Calendar from "../../../components/Calendar";
import { getAvailability } from "../../../lib/api";
import { useLanguage } from "../../../components/LanguageProvider";

function BookDateInner() {
  const search = useSearchParams();
  const serviceId = search.get("serviceId") || "";
  const barberId = (search.get("barberId") || "").toLowerCase();
  const { t } = useLanguage();
  const [date, setDate] = useState("");
  const [highlights, setHighlights] = useState({});
  const [loadingHints, setLoadingHints] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const HORIZON_DAYS = 365; // allow picking far into the future on this page
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const maxDate = new Date(today.getTime() + HORIZON_DAYS * 86400000)
    .toISOString()
    .slice(0, 10);

  // Prefetch availability hints for horizon to decorate the calendar
  useEffect(() => {
    let abort = false;
    async function run() {
      if (!serviceId) return;
      setLoadingHints(true);
      const next = {};
      const dates = [];
      for (let i = 0; i <= HORIZON_DAYS; i++) {
        const d = new Date(today.getTime() + i * 86400000);
        const ds = d.toISOString().slice(0, 10);
        dates.push(ds);
      }
      // Limit concurrency a bit
      const chunk = 4;
      for (let i = 0; i < dates.length; i += chunk) {
        const part = dates.slice(i, i + chunk);
        const results = await Promise.all(
          part.map(async (ds) => {
            try {
              const res = await getAvailability({ serviceId, date: ds, barberId: barberId || undefined });
              const arr = Array.isArray(res) ? res : res?.slots || [];
              return [ds, arr.length];
            } catch {
              return [ds, null];
            }
          })
        );
        if (abort) return;
        for (const [ds, count] of results) next[ds] = count;
        setHighlights({ ...next });
      }
      setLoadingHints(false);
    }
    run();
    return () => {
      abort = true;
    };
  }, [serviceId, barberId]);

  const nextHref = useMemo(() => {
    if (!serviceId || !date) return "#";
    const p = new URLSearchParams({ serviceId, date });
    if (barberId) p.set('barberId', barberId);
    return `/book/time?${p.toString()}`;
  }, [serviceId, date, barberId]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const handleWaitlistSuccess = () => {
    setToastMessage(t("booking.toasts.waitlistSuccess"));
  };

  return (
    <main className="max-w-3xl mx-auto p-6">
      <BookingProgress />
      <h1 className="text-2xl font-semibold">{t("bookPages.selectDate")}</h1>
      <p className="text-neutral-600">
        {t("bookPages.serviceSelected", { service: serviceId ? serviceId : t("bookPages.none") })}
      </p>
      <div className="mt-3">
        <span className="text-sm">{t("bookPages.dateLabel")}</span>
        <div className="mt-2">
          <Calendar
            value={date}
            onChange={setDate}
            minDate={minDate}
            maxDate={maxDate}
            closedWeekdays={[0, 1]} // Sun, Mon closed
            highlights={highlights}
            waitlistOptions={{
              serviceId,
              barberId,
              onSuccess: handleWaitlistSuccess,
            }}
          />
          {loadingHints && <p className="text-xs text-neutral-400 mt-2">{t("bookPages.checkingAvailability")}</p>}
        </div>
      </div>
      <div className="mt-4">
        <Link
          href={nextHref}
          aria-disabled={!serviceId || !date}
          className={`inline-block px-4 py-2 rounded-md text-white no-underline ${
            !serviceId || !date ? "bg-neutral-400 cursor-not-allowed" : "bg-black hover:bg-neutral-800"
          }`}
        >
          {t("bookPages.continue")}
        </Link>
      </div>
      {toastMessage && (
        <div
          className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white shadow-lg"
          role="status"
          aria-live="polite"
        >
          {toastMessage}
        </div>
      )}
    </main>
  );
}

function BookDateFallback() {
  const { t } = useLanguage();
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">{t("bookPages.selectDate")}</h1>
      <p className="text-neutral-600">{t("bookPages.loading")}</p>
    </main>
  );
}

export default function BookDatePage() {
  return (
    <Suspense fallback={<BookDateFallback />}>
      <BookDateInner />
    </Suspense>
  );
}
