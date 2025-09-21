"use client";
import Link from "next/link";
import { useCallback } from "react";

export default function Header() {
  const onBookNow = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-booking"));
    }
  }, []);
  return (
    <header className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-black/40 bg-black/70 border-b border-white/10">
      <div className="container-xl flex h-16 items-center justify-center sm:justify-between">
        <Link href="/" className="font-display text-2xl tracking-wide">
          LEMO
        </Link>
        <nav className="hidden sm:flex items-center gap-6 text-sm">
          <Link href="#services" className="hover:opacity-80">Services</Link>
          <Link href="#hours" className="hover:opacity-80">Hours</Link>
          <Link href="#location" className="hover:opacity-80">Location</Link>
          <Link href="#footer" className="hover:opacity-80">Contact</Link>
        </nav>
        <div className="hidden sm:flex items-center gap-3">
          <button onClick={onBookNow} className="btn btn-primary">Book Now</button>
        </div>
      </div>
    </header>
  );
}
