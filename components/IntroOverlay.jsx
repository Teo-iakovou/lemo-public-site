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
    <div className="fixed inset-0 z-[60] bg-black text-white flex items-center justify-center">
      <div className={`text-center select-none ${sinking ? "intro-sinking" : ""}`}>
        <div aria-label="Lemo Barbershop" className="inline-flex gap-1 sm:gap-2">
          {Array.from(text).map((ch, i) => {
            // Match hero title typography (no gradient): solid white, bold, tracking-tight
            const delayMs = i * 80; // stagger reveal
            return (
              <span
                key={i}
                className="intro-letter font-display font-black tracking-tight text-white text-6xl sm:text-8xl md:text-9xl"
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
