"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import Reveal from "./Reveal";
import { useLanguage } from "./LanguageProvider";
import styles from "./TeamShowcase.module.css";

// Roster — display copy lives in lib/i18n.js (team.members.<key>).
// Photos blend into the page because they are shot on a black backdrop.
const MEMBERS = [
  { key: "lemo", src: "/team/lemo-2.jpg" },
  { key: "forou", src: "/team/forou-2.jpg" },
  { key: "koushis", src: "/team/koushis-2.jpg" },
];

function Panel({ memberKey, src, index, active, onActivate, eager }) {
  const { t } = useLanguage();
  const name = t(`team.members.${memberKey}.name`); // Greeklish (Latin), uppercase — same EL/EN
  const displayName = t(`team.members.${memberKey}.displayName`);
  const realName = t(`team.members.${memberKey}.realName`);
  const role = t(`team.members.${memberKey}.role`);
  const number = String(index + 1).padStart(2, "0");

  return (
    <button
      type="button"
      onMouseEnter={onActivate}
      onFocus={onActivate}
      onClick={onActivate}
      aria-expanded={active}
      aria-label={t("team.ariaToggle", { name: displayName })}
      className={
        "group relative block w-full overflow-hidden rounded-lg border border-white/10 " +
        "bg-black text-left outline-none focus-visible:ring-2 focus-visible:ring-purple-500 " +
        // Desktop: grow the active panel (flex) — collapsed stay narrow.
        // Mobile: control height instead (short when collapsed, tall when active).
        "lg:h-full " +
        (active ? "h-[var(--active-h,68vh)] lg:flex-[4]" : "h-24 lg:flex-[1]") +
        " " +
        styles.panel
      }
    >
      {/* Portrait — grayscale + dimmed when collapsed, full colour when active.
          The image lives in a CONSTANT-size wrapper (styles.photoWrap) so it never
          rescales while the panel resizes: the growing panel simply reveals more of
          a fixed-size image (a wipe), instead of object-cover refitting it (a zoom). */}
      <div className={styles.photoWrap}>
        <Image
          src={src}
          alt={displayName}
          width={4016}
          height={6016}
          priority={eager}
          sizes="(min-width: 1024px) 480px, 70vw"
          // Sized by HEIGHT only → natural aspect, constant subject size. No cover,
          // no scale. Inline styles win over any next/image defaults.
          style={{
            height: "100%",
            width: "auto",
            maxWidth: "none",
            objectFit: "contain",
            objectPosition: "bottom center",
            transform: "none",
          }}
          className={
            "block " +
            (active
              ? "grayscale-0 brightness-100"
              : "grayscale brightness-[.55]") +
            " " +
            styles.photo
          }
        />
      </div>

      {/* Bottom gradient veil — strengthens when active for legibility. */}
      <div
        aria-hidden
        className={
          "pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent " +
          (active ? "opacity-95" : "opacity-60") +
          " " +
          styles.veil
        }
      />

      {/* Collapsed label — vertical on desktop, horizontal on mobile. Hidden when active. */}
      <span
        aria-hidden
        className={
          "absolute z-10 font-display uppercase tracking-wide text-white/90 " +
          // Mobile: horizontal, bottom-left.
          "bottom-4 left-4 text-2xl " +
          // Desktop: rotated vertical, anchored bottom-centre, reading upward.
          "lg:bottom-6 lg:left-1/2 lg:-translate-x-1/2 lg:text-3xl " +
          "lg:[writing-mode:vertical-rl] lg:rotate-180 " +
          (active ? "opacity-0" : "opacity-100") +
          " " +
          styles.label
        }
      >
        {name}
      </span>

      {/* Active info block — fades up from the bottom-left. */}
      <div
        className={
          "absolute bottom-0 left-0 z-10 w-full p-6 sm:p-8 " +
          (active
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none") +
          " " +
          styles.info
        }
      >
        <span className="font-mono text-sm font-semibold tabular-nums text-purple-500">
          {number}
        </span>
        <h3 className="font-display text-5xl sm:text-6xl leading-[0.9] uppercase tracking-tight text-white mt-1">
          {name}
        </h3>
        <p className="mt-2 text-xs uppercase tracking-[0.22em] text-purple-400">
          {role}
        </p>
        <p className="mt-1 text-sm text-white/80">{realName}</p>
      </div>
    </button>
  );
}

const MOBILE_QUERY = "(max-width: 1023.98px)";

export default function TeamShowcase({ members = MEMBERS }) {
  const { t } = useLanguage();
  // Default: first panel (Lemo) active. Desktop: hover/focus/tap switches the active one.
  // Mobile: scrolling drives it — see the effect below.
  const [active, setActive] = useState(0);
  const activate = useCallback((i) => setActive(i), []);
  const trackRef = useRef(null);
  const stackRef = useRef(null);

  // Mobile scroll-driven reveal. The stack is sticky inside a taller "track"; how far the
  // page has scrolled through the track picks the open photo (equal share per barber). The
  // track's geometry never depends on which panel is open, so opening one can't shift the
  // scroll position and flip it back — no jitter, and no tapping needed.
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mq = window.matchMedia(MOBILE_QUERY);

    // Runs straight in the scroll handler (one rect read + a no-op setState when nothing
    // changed) so the open photo always matches the current scroll position.
    const update = () => {
      if (!mq.matches) return;
      const track = trackRef.current;
      const stack = stackRef.current;
      if (!track || !stack) return;
      const rect = track.getBoundingClientRect();
      const stickyTop = parseFloat(getComputedStyle(stack).top) || 0;
      const travel = rect.height - stack.offsetHeight;
      if (travel <= 0) return;
      const progress = Math.min(1, Math.max(0, (stickyTop - rect.top) / travel));
      const next = Math.min(members.length - 1, Math.floor(progress * members.length));
      setActive((prev) => (prev === next ? prev : next));
    };
    const onScroll = update;

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    mq.addEventListener?.("change", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      mq.removeEventListener?.("change", onScroll);
    };
  }, [members.length]);

  return (
    <section id="team" className="section scroll-mt-20">
      <div className="container-xl">
        <Reveal as="div">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-purple-500">
            {t("team.eyebrow")}
          </p>
          <h2 className="mt-3 font-sans font-light text-4xl sm:text-5xl tracking-tight text-white">
            {t("team.heading")}
          </h2>
        </Reveal>

        {/* The accordion band. Column on mobile (sticky, scroll-driven), row on lg+ (hover). */}
        <div ref={trackRef} className={`mt-10 sm:mt-14 ${styles.track}`}>
        <div
          ref={stackRef}
          className={`flex flex-col gap-2 lg:h-[80vh] lg:flex-row ${styles.sticky}`}
        >
          {members.map((m, i) => (
            <Panel
              key={m.key}
              memberKey={m.key}
              src={m.src}
              index={i}
              active={active === i}
              onActivate={() => activate(i)}
              eager={i === 0}
            />
          ))}
        </div>
        </div>
      </div>
    </section>
  );
}
