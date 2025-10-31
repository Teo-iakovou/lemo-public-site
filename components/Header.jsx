"use client";
import Link from "next/link";
import { useCallback } from "react";
import { useAuth } from "./AuthProvider";

export default function Header() {
  const { user, openAuthModal, openProfile } = useAuth();
  const onBookNow = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-booking"));
    }
  }, []);
  const onProfileClick = useCallback(() => {
    if (user) openProfile();
    else openAuthModal("login");
  }, [user, openProfile, openAuthModal]);
  const initials = (user?.username || "").trim().slice(0, 1).toUpperCase() || "?";
  return (
    <header className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-black/40 bg-black/70 border-b border-white/10">
      <div className="container-xl flex h-16 items-center justify-between">
        <Link href="/" className="font-display font-graffiti text-2xl tracking-wide" aria-label="LEMO">
          {Array.from("LEMO").map((ch, i) => (
            <span key={i} className="text-white">
              {ch}
            </span>
          ))}
        </Link>
        <nav className="hidden sm:flex items-center gap-6 text-sm">
          <Link href="#services" className="hover:opacity-80">Υπηρεσίες</Link>
          <Link href="#booking-hours" className="hover:opacity-80">Ώρες</Link>
          <Link href="#location" className="hover:opacity-80">Τοποθεσία</Link>
          <Link href="#footer" className="hover:opacity-80">Επικοινωνία</Link>
        </nav>
        <div className="flex items-center gap-3">
          <button onClick={onBookNow} className="hidden sm:inline-flex btn btn-primary btn-gang font-display tracking-tight whitespace-nowrap">ΚΛΕΙΣΤΕ ΡΑΝΤΕΒΟΥ</button>
          <button
            onClick={onProfileClick}
            className="h-9 w-9 rounded-full border border-white/15 bg-white/5 text-sm font-semibold text-white flex items-center justify-center hover:bg-white/10"
            aria-label={user ? `Προφίλ του ${user.username}` : "Σύνδεση"}
          >
            {initials}
          </button>
        </div>
      </div>
    </header>
  );
}
