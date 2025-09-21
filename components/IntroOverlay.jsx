"use client";

import { useEffect, useState } from "react";
import { prefetchBookingData } from "../lib/prefetch";

export default function IntroOverlay({ onDone }) {
  const [visible, setVisible] = useState(false);
  const [sinking, setSinking] = useState(false);

  useEffect(() => {
    setVisible(true);
    // Kick off data warming in the background (non-blocking)
    prefetchBookingData(14).catch(() => {});

    // After all letters finish revealing, start a slow sink (vacuum) and then unmount
    const text = "LEMOBARBERSHOP";
    const DELAY_PER_LETTER = 80; // ms, matches reveal stagger
    const REVEAL_MS = 420; // ms, matches .intro-letter animation
    const SINK_MS = 1400; // slow vacuum duration
    const totalReveal = (text.length - 1) * DELAY_PER_LETTER + REVEAL_MS;

    const t1 = setTimeout(() => setSinking(true), totalReveal);
    const t2 = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, totalReveal + SINK_MS);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const text = "LEMOBARBERSHOP";

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black text-white flex items-center justify-center px-4"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      {/* Skip button (mobile friendly) */}
      <button
        type="button"
        onClick={() => { setVisible(false); onDone?.(); }}
        className="absolute top-3 right-3 text-xs px-2 py-1 rounded border border-white/20 bg-white/5 hover:bg-white/10"
      >
        Skip
      </button>

      <div className={`text-center select-none ${sinking ? "intro-sinking" : ""}`}>
        <div
          aria-label="Lemo Barbershop"
          className="inline-flex flex-wrap justify-center max-w-[94vw] gap-0.5 sm:gap-2 leading-[0.9]"
        >
          {Array.from(text).map((ch, i) => {
            // Solid white, bold, tracking-tight; scale with viewport on mobile
            const delayMs = i * 80; // stagger reveal
            return (
              <span
                key={i}
                className="intro-letter font-display font-black tracking-tight text-white text-[12vw] xs:text-6xl sm:text-7xl md:text-8xl lg:text-9xl"
                style={{ animationDelay: `${delayMs}ms` }}
              >
                {ch}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
