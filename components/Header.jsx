"use client";
import Link from "next/link";
import { useCallback, useMemo } from "react";
import { useAuth } from "./AuthProvider";

export default function Header() {
  const { user, openAuthModal, openProfile, openSettings } = useAuth();

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
            <Link href="#services" className="hover:opacity-80">Υπηρεσίες</Link>
            <Link href="#booking-hours" className="hover:opacity-80">Ώρες</Link>
            <Link href="#location" className="hover:opacity-80">Τοποθεσία</Link>
            <Link href="#footer" className="hover:opacity-80">Επικοινωνία</Link>
        </nav>

        <Link
          href="/"
          className="sm:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display font-graffiti text-2xl tracking-wide"
          aria-label="LEMO"
        >
          {Array.from("LEMO").map((ch, i) => (
            <span key={i} className="text-white">
              {ch}
            </span>
          ))}
        </Link>

        <div className="flex justify-end flex-1 sm:flex-none sm:relative gap-2">
          {canManageSettings && (
            <button
              onClick={openSettings}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-white/15 bg-white/5 text-xs sm:text-sm font-semibold text-white flex items-center justify-center hover:bg-white/10 transition"
              aria-label="Ρυθμίσεις"
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
            aria-label={user ? `Προφίλ του ${user.username}` : "Σύνδεση"}
            type="button"
          >
            {user ? (
              (user.username || "Προφίλ").trim().slice(0, 1).toUpperCase()
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
