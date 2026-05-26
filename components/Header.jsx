"use client";
import Link from "next/link";
import { useCallback, useMemo } from "react";
import { useAuth } from "./AuthProvider";
import { useLanguage } from "./LanguageProvider";

export default function Header() {
  const { user, openAuthModal, openProfile, openSettings } = useAuth();
  const { lang, setLang, t } = useLanguage();

  const canManageSettings = useMemo(() => {
    if (!user) return false;
    const role = (user.role || "customer").toLowerCase();
    return role === "barber" || role === "admin";
  }, [user]);

  const onProfileClick = useCallback(() => {
    if (user) openProfile();
    else openAuthModal("login");
  }, [user, openProfile, openAuthModal]);

  return (
    <header className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-black/40 bg-black/70 border-b border-white/10">
      <div className="container-xl flex items-center h-16 gap-4 relative">
        <div className="hidden sm:flex items-center gap-6 flex-1">
          <Link
            href="/"
            className="font-display font-graffiti text-2xl tracking-wide"
            aria-label="LEMO"
          >
            {Array.from("LEMO").map((ch, i) => (
              <span key={i} className="text-white">
                {ch}
              </span>
            ))}
          </Link>
        </div>

        <nav className="hidden sm:flex items-center justify-center gap-6 text-sm flex-1">
            <Link href="#services" className="hover:opacity-80">{t("nav.services")}</Link>
            <Link href="#booking-hours" className="hover:opacity-80">{t("nav.hours")}</Link>
            <Link href="#location" className="hover:opacity-80">{t("nav.location")}</Link>
            <Link href="#footer" className="hover:opacity-80">{t("nav.contact")}</Link>
        </nav>

        <Link
          href="/"
          className="sm:hidden font-display font-graffiti text-2xl tracking-wide mr-auto"
          aria-label="LEMO"
        >
          {Array.from("LEMO").map((ch, i) => (
            <span key={i} className="text-white">
              {ch}
            </span>
          ))}
        </Link>

        <div className="flex justify-end sm:flex-none sm:relative gap-2">
          <div className="inline-flex items-center rounded-full border border-white/15 bg-white/5 p-0.5">
            <button
              type="button"
              onClick={() => setLang("el")}
              className={`h-7 rounded-full px-2 text-[11px] font-semibold transition ${
                lang === "el" ? "bg-white text-black" : "text-white/80 hover:text-white"
              }`}
              aria-label="Greek"
            >
              ΕΛ
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`h-7 rounded-full px-2 text-[11px] font-semibold transition ${
                lang === "en" ? "bg-white text-black" : "text-white/80 hover:text-white"
              }`}
              aria-label="English"
            >
              EN
            </button>
          </div>
          {canManageSettings && (
            <button
              onClick={openSettings}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-white/15 bg-white/5 text-xs sm:text-sm font-semibold text-white flex items-center justify-center hover:bg-white/10 transition"
              aria-label={t("nav.settings")}
              type="button"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 sm:h-5 sm:w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.07a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.07a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.07a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}
          <button
            onClick={onProfileClick}
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-white/15 bg-white/5 text-xs sm:text-sm font-semibold text-white flex items-center justify-center hover:bg-white/10 transition"
            aria-label={
              user
                ? t("nav.profileOf", { username: user.username })
                : t("nav.login")
            }
            type="button"
          >
            {user ? (
              (user.username || t("nav.profileFallback")).trim().slice(0, 1).toUpperCase()
            ) : (
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 sm:h-5 sm:w-5 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z" />
                <path d="M4 22c0-4.418 3.582-8 8-8s8 3.582 8 8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
