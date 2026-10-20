"use client";

import { useEffect, useState } from "react";
import { getPublicSettings } from "../lib/api";
import { normalizeAnnouncement } from "../lib/publicSettings";

const DISMISS_KEY = "lemo_announcement_dismissed";

const TONE_CLASSES = {
  info: "border-[#8B2FF0]/40 bg-[#8B2FF0]/15 text-white",
  warning: "border-amber-400/40 bg-amber-500/15 text-amber-100",
};

function readDismissed() {
  try {
    return window.localStorage.getItem(DISMISS_KEY) || "";
  } catch {
    return "";
  }
}

function writeDismissed(text) {
  try {
    window.localStorage.setItem(DISMISS_KEY, text);
  } catch {
    /* storage unavailable — dismiss only for this view */
  }
}

// Site-wide announcement set by the shop from Settings. Hidden when off or empty.
// A visitor can close it; it comes back only if the text changes.
export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState(null);
  const [dismissedText, setDismissedText] = useState("");

  useEffect(() => {
    setDismissedText(readDismissed());
    let alive = true;
    getPublicSettings()
      .then((s) => {
        if (alive) setAnnouncement(normalizeAnnouncement(s?.announcement));
      })
      .catch(() => {});
    // Admin saves from Settings show up immediately, without a reload.
    const onUpdate = (e) => setAnnouncement(normalizeAnnouncement(e?.detail?.announcement));
    window.addEventListener("public-settings-updated", onUpdate);
    return () => {
      alive = false;
      window.removeEventListener("public-settings-updated", onUpdate);
    };
  }, []);

  if (!announcement?.enabled || !announcement.text) return null;
  if (dismissedText && dismissedText === announcement.text) return null;

  const tone = TONE_CLASSES[announcement.tone] || TONE_CLASSES.info;

  return (
    <div role="status" className={`border-b ${tone}`}>
      <div className="container-xl flex items-start gap-3 py-2.5 text-sm sm:items-center">
        <span aria-hidden className="mt-0.5 sm:mt-0">
          {announcement.tone === "warning" ? "⚠️" : "📢"}
        </span>
        <p className="flex-1 whitespace-pre-line leading-snug">{announcement.text}</p>
        <button
          type="button"
          onClick={() => {
            writeDismissed(announcement.text);
            setDismissedText(announcement.text);
          }}
          className="shrink-0 rounded-full px-2 text-lg leading-none text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="Κλείσιμο ανακοίνωσης"
        >
          ×
        </button>
      </div>
    </div>
  );
}
