"use client";

import { useCallback, useEffect, useState } from "react";
import { getPublicSettings, updateAnnouncement } from "../lib/api";
import { ANNOUNCEMENT_MAX_LENGTH, normalizeAnnouncement } from "../lib/publicSettings";

// Settings panel for the site-wide announcement banner. Saves on its own (only the
// announcement), so it never touches the availability settings below it.
export default function AnnouncementControls() {
  const [saved, setSaved] = useState(normalizeAnnouncement(null));
  const [text, setText] = useState("");
  const [tone, setTone] = useState("info");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });

  const apply = useCallback((a) => {
    const n = normalizeAnnouncement(a);
    setSaved(n);
    setText(n.text);
    setTone(n.tone);
  }, []);

  useEffect(() => {
    getPublicSettings()
      .then((s) => apply(s?.announcement))
      .catch(() => setStatus({ type: "error", text: "Αποτυχία φόρτωσης ανακοίνωσης." }))
      .finally(() => setLoading(false));
  }, [apply]);

  const save = useCallback(
    async (next, successText) => {
      setBusy(true);
      setStatus({ type: "", text: "" });
      try {
        const res = await updateAnnouncement(next);
        apply(res.announcement);
        setStatus({ type: "success", text: successText });
      } catch (err) {
        setStatus({ type: "error", text: err.message || "Αποτυχία αποθήκευσης." });
      } finally {
        setBusy(false);
      }
    },
    [apply]
  );

  const trimmed = text.trim();
  const dirty = trimmed !== saved.text || tone !== saved.tone;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Ανακοίνωση στο site</h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            saved.enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/60"
          }`}
        >
          {saved.enabled ? "Εμφανίζεται" : "Κρυφή"}
        </span>
      </div>
      <p className="text-sm text-white/70">
        Γράψτε ένα μήνυμα που θα φαίνεται στην κορυφή της σελίδας σε όλους τους πελάτες
        (π.χ. αλλαγή ωραρίου, αργίες).
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, ANNOUNCEMENT_MAX_LENGTH))}
        rows={3}
        disabled={loading || busy}
        placeholder="π.χ. Το κατάστημα θα είναι κλειστό 28 Οκτωβρίου."
        className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[#8B2FF0] focus:outline-none"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/50">
        <div className="flex gap-2">
          {[
            ["info", "Πληροφορία"],
            ["warning", "Προσοχή"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTone(value)}
              disabled={loading || busy}
              className={`rounded-md border px-3 py-1 text-sm ${
                tone === value
                  ? value === "warning"
                    ? "border-amber-400 bg-amber-500/20 text-amber-100"
                    : "border-[#8B2FF0] bg-[#8B2FF0]/20 text-white"
                  : "border-white/20 text-white/80 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span>
          {text.length}/{ANNOUNCEMENT_MAX_LENGTH}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() =>
            save({ enabled: true, text: trimmed, tone }, "Η ανακοίνωση δημοσιεύτηκε.")
          }
          disabled={loading || busy || !trimmed || (saved.enabled && !dirty)}
          className="rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Αποθήκευση…" : saved.enabled ? "Ενημέρωση" : "Δημοσίευση"}
        </button>
        {saved.enabled && (
          <button
            type="button"
            onClick={() =>
              save({ enabled: false, text: saved.text, tone: saved.tone }, "Η ανακοίνωση κρύφτηκε.")
            }
            disabled={busy}
            className="rounded-lg border border-white/20 px-4 py-1.5 text-sm text-white/80 hover:bg-white/10 disabled:opacity-50"
          >
            Απόκρυψη
          </button>
        )}
        {(saved.text || text) && (
          <button
            type="button"
            onClick={() => save({ enabled: false, text: "", tone: "info" }, "Η ανακοίνωση διαγράφηκε.")}
            disabled={busy}
            className="rounded-lg border border-rose-400/40 px-4 py-1.5 text-sm text-rose-200 hover:bg-rose-500/10 disabled:opacity-50"
          >
            Διαγραφή
          </button>
        )}
        {status.text && (
          <span
            className={`text-xs ${status.type === "error" ? "text-rose-300" : "text-emerald-300"}`}
          >
            {status.text}
          </span>
        )}
      </div>
    </section>
  );
}
