"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLanguage } from "../../components/LanguageProvider";

function SuccessContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const isUpdate = mode === "updated";
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowBanner(false), 6000);
    return () => clearTimeout(t);
  }, []);

  const bannerText = useMemo(() => {
    return isUpdate
      ? t("success.updated")
      : t("success.created");
  }, [isUpdate, t]);

  return (
    <main className="max-w-3xl mx-auto p-6">
      {showBanner && (
        <div className="sticky top-2 z-40">
          <div className="flex items-start gap-3 rounded-md border border-green-500/40 bg-green-600/15 px-4 py-3 text-green-200 backdrop-blur-sm shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 flex-shrink-0">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 1 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4Z" clipRule="evenodd" />
            </svg>
            <div className="text-sm leading-6">
              <div className="font-medium text-green-300">
                {isUpdate ? t("success.updatedTitle") : t("success.createdTitle")}
              </div>
              <div className="opacity-90">{bannerText}</div>
            </div>
            <button
              type="button"
              onClick={() => setShowBanner(false)}
              className="ml-auto -mr-1 h-6 w-6 inline-flex items-center justify-center rounded hover:bg-white/10"
              aria-label={t("success.dismiss")}
              title={t("success.dismissShort")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414Z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-semibold mt-6">
        {isUpdate ? t("success.updatedTitle") : t("success.createdTitle")}
      </h1>
      <p className="text-neutral-300 mt-1">{bannerText}</p>

      <div className="mt-6 flex gap-3">
        <button
          className="btn btn-primary"
          onClick={() => router.push("/")}
        >
          {t("success.backHome")}
        </button>
        <a
          className="btn btn-outline"
          href="https://www.instagram.com/lemobarbershop?igsh=enh6M2J4OHdlaGg3"
          target="_blank" rel="noopener noreferrer"
        >
          {t("success.contactUs")}
        </a>
      </div>
    </main>
  );
}

export default function SuccessPage() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={<main className="max-w-3xl mx-auto p-6 text-white/70">{t("success.loading")}</main>}>
      <SuccessContent />
    </Suspense>
  );
}
