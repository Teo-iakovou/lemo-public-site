"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LANG, normalizeLang, translate } from "../lib/i18n";

const STORAGE_KEY = "lemo_public_lang";

const LanguageContext = createContext(null);

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}

export default function LanguageProvider({ children }) {
  const [lang, setLang] = useState(DEFAULT_LANG);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setLang(normalizeLang(saved));
      return;
    }
    const browser = (navigator.language || "").toLowerCase();
    if (browser.startsWith("en")) {
      setLang("en");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const value = useMemo(() => {
    const locale = lang === "en" ? "en-GB" : "el-GR";
    const t = (key, params) => translate(lang, key, params);
    const formatDate = (dateValue, options) => {
      if (!dateValue) return "";
      const dt = dateValue instanceof Date ? dateValue : new Date(dateValue);
      if (Number.isNaN(dt.getTime())) return "";
      return dt.toLocaleDateString(locale, options);
    };
    return {
      lang,
      setLang: (next) => setLang(normalizeLang(next)),
      t,
      locale,
      formatDate,
    };
  }, [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
