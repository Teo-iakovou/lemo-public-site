"use client";

import { useLanguage } from "../../components/LanguageProvider";

export default function ErrorPage({ searchParams }) {
  const { t } = useLanguage();
  const message = (searchParams && searchParams.message) || t("errorPage.generic");
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">{t("errorPage.title")}</h1>
      <p className="text-red-600">{message}</p>
    </main>
  );
}
