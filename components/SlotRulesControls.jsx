"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getPublicSettings, updateSlotRules } from "../lib/api";
import {
  buildDaySlots,
  minToHHMM,
  normalizeSlotRules,
} from "../lib/slotRules";

const BARBERS = [
  ["LEMO", "ΛΕΜΟ"],
  ["FOROU", "ΦΟΡΟΥ"],
  ["KOUSHIS", "ΚΟΥΣΙΗΣ"],
];
const BARBER_LABEL = Object.fromEntries(BARBERS);
const MINUTE_CHOICES = [15, 20, 25, 30, 35, 45, 50, 60];
const AFTER_CHOICES = Array.from({ length: (19 - 9) * 4 + 1 }, (_, i) => minToHHMM(9 * 60 + i * 15));
const WEEKDAY_WINDOW = { open: 9 * 60, close: 19 * 60 + 40 };
const SATURDAY_WINDOW = { open: 9 * 60, close: 18 * 60 + 20 };

const todayYMD = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Athens" });
const fmtDate = (ymd) =>
  ymd
    ? new Date(`${ymd}T12:00:00`).toLocaleDateString("el-GR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
const barbersText = (list) =>
  !list || list.length === 0 ? "ΟΛΟΙ" : list.map((k) => BARBER_LABEL[k] || k).join(", ");

function ruleStatus(rule) {
  const today = todayYMD();
  if (rule.to && rule.to < today) return { text: "Έληξε", cls: "bg-white/10 text-white/50" };
  if (rule.from > today) return { text: "Προγραμματισμένος", cls: "bg-sky-500/20 text-sky-200" };
  return { text: "Ενεργός", cls: "bg-emerald-500/20 text-emerald-300" };
}

const emptyDraft = () => ({
  id: "",
  barbers: [],
  from: todayYMD(),
  to: "",
  after: "13:00",
  minutes: 30,
});

// Settings section: slot-length rules ("from 1 Dec to 31 Dec, after 13:00, 30' for everyone").
// Each change saves straight away through its own endpoint (nothing else in Settings is sent).
export default function SlotRulesControls() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [draft, setDraft] = useState(null); // null = form closed

  useEffect(() => {
    getPublicSettings()
      .then((s) => setRules(normalizeSlotRules(s?.slotRules)))
      .catch(() => setStatus({ type: "error", text: "Αποτυχία φόρτωσης κανόνων." }))
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback(async (next, successText) => {
    setBusy(true);
    setStatus({ type: "", text: "" });
    try {
      const saved = await updateSlotRules(next);
      setRules(normalizeSlotRules(saved.slotRules));
      setStatus({ type: "success", text: successText });
      return true;
    } catch (err) {
      setStatus({ type: "error", text: err.message || "Αποτυχία αποθήκευσης." });
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const draftError = useMemo(() => {
    if (!draft) return "";
    if (!draft.from) return "Διάλεξε ημερομηνία «Από».";
    if (draft.to && draft.to < draft.from) return "Το «Έως» πρέπει να είναι μετά το «Από».";
    return "";
  }, [draft]);

  const preview = useMemo(() => {
    if (!draft) return null;
    const rule = { after: draft.after, minutes: Number(draft.minutes) };
    const fmt = (win) =>
      buildDaySlots({ window: win, rule })
        .map((s) => minToHHMM(s.start))
        .join(" · ");
    return { weekday: fmt(WEEKDAY_WINDOW), saturday: fmt(SATURDAY_WINDOW) };
  }, [draft]);

  const toggleBarber = (key) =>
    setDraft((d) => {
      if (key === "ALL") return { ...d, barbers: [] };
      const set = new Set(d.barbers);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      const list = BARBERS.map(([k]) => k).filter((k) => set.has(k));
      return { ...d, barbers: list.length === BARBERS.length ? [] : list };
    });

  const saveDraft = async () => {
    if (draftError) return;
    const rule = {
      ...draft,
      id: draft.id || `r${Date.now().toString(36)}`,
      minutes: Number(draft.minutes),
    };
    const next = draft.id
      ? rules.map((r) => (r.id === draft.id ? rule : r))
      : [...rules, rule];
    const ok = await persist(next, draft.id ? "Ο κανόνας ενημερώθηκε." : "Ο κανόνας προστέθηκε.");
    if (ok) setDraft(null);
  };

  const removeRule = (id) => {
    if (!window.confirm("Διαγραφή κανόνα; Οι ώρες επιστρέφουν στα 40 λεπτά για αυτές τις μέρες.")) {
      return;
    }
    persist(
      rules.filter((r) => r.id !== id),
      "Ο κανόνας διαγράφηκε."
    );
  };

  const chip = (active) =>
    `rounded-md border px-3 py-1.5 text-sm transition ${
      active
        ? "border-[#8B2FF0] bg-[#8B2FF0]/20 text-white"
        : "border-white/20 text-white/80 hover:bg-white/10"
    }`;
  const field =
    "w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white focus:border-[#8B2FF0] focus:outline-none [color-scheme:dark]";

  return (
    <section className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Διάρκεια ραντεβού</h3>
        {!draft && (
          <button
            type="button"
            onClick={() => setDraft(emptyDraft())}
            disabled={loading || busy}
            className="rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
          >
            + Νέος κανόνας
          </button>
        )}
      </div>
      <p className="text-sm text-white/70">
        Κανονικά κάθε ραντεβού είναι 40 λεπτά. Εδώ αλλάζεις τη διάρκεια από μια ώρα και μετά,
        για συγκεκριμένες μέρες και για όλους ή για κάποιους κουρείς.
      </p>

      {loading ? (
        <p className="text-sm text-white/60">Φόρτωση…</p>
      ) : rules.length === 0 && !draft ? (
        <p className="text-sm text-white/50">Κανένας κανόνας — όλα τα ραντεβού είναι 40 λεπτά.</p>
      ) : (
        <ul className="space-y-2">
          {rules.map((r) => {
            const st = ruleStatus(r);
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2"
              >
                <div className="text-sm">
                  <div className="font-semibold">
                    {fmtDate(r.from)} – {r.to ? fmtDate(r.to) : "χωρίς λήξη"}
                  </div>
                  <div className="text-white/70">
                    Μετά τις {r.after} · <b>{r.minutes}′</b> · {barbersText(r.barbers)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${st.cls}`}>{st.text}</span>
                  <button
                    type="button"
                    onClick={() => setDraft({ ...r })}
                    disabled={busy}
                    className="rounded-md border border-white/20 px-2.5 py-1 text-xs text-white/80 hover:bg-white/10"
                  >
                    Αλλαγή
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRule(r.id)}
                    disabled={busy}
                    className="rounded-md border border-rose-400/40 px-2.5 py-1 text-xs text-rose-200 hover:bg-rose-500/10"
                  >
                    Διαγραφή
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {draft && (
        <div className="space-y-3 rounded-xl border border-[#8B2FF0]/40 bg-black/30 p-3 sm:p-4">
          <div>
            <div className="mb-1 text-xs uppercase tracking-wide text-white/60">Κουρείς</div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={chip(draft.barbers.length === 0)} onClick={() => toggleBarber("ALL")}>
                ΟΛΟΙ
              </button>
              {BARBERS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={chip(draft.barbers.includes(key))}
                  onClick={() => toggleBarber(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-xs uppercase tracking-wide text-white/60">Από</span>
              <input
                type="date"
                value={draft.from}
                onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
                className={field}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs uppercase tracking-wide text-white/60">
                Έως <span className="normal-case text-white/40">(κενό = χωρίς λήξη)</span>
              </span>
              <input
                type="date"
                value={draft.to}
                min={draft.from || undefined}
                onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
                className={field}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs uppercase tracking-wide text-white/60">Μετά τις</span>
              <select
                value={draft.after}
                onChange={(e) => setDraft((d) => ({ ...d, after: e.target.value }))}
                className={field}
              >
                {AFTER_CHOICES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs uppercase tracking-wide text-white/60">Διάρκεια</span>
              <select
                value={draft.minutes}
                onChange={(e) => setDraft((d) => ({ ...d, minutes: Number(e.target.value) }))}
                className={field}
              >
                {MINUTE_CHOICES.map((m) => (
                  <option key={m} value={m}>
                    {m} λεπτά
                  </option>
                ))}
              </select>
            </label>
          </div>

          {preview && (
            <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-white/70">
              <div className="mb-1 font-semibold text-white/90">Έτσι θα φαίνονται οι ώρες:</div>
              <div>
                <span className="text-white/50">Τρίτη–Παρασκευή:</span> {preview.weekday}
              </div>
              <div className="mt-1">
                <span className="text-white/50">Σάββατο:</span> {preview.saturday}
              </div>
            </div>
          )}

          {draftError && <p className="text-xs text-rose-300">{draftError}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveDraft}
              disabled={busy || !!draftError}
              className="rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
            >
              {busy ? "Αποθήκευση…" : draft.id ? "Αποθήκευση αλλαγών" : "Προσθήκη κανόνα"}
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              disabled={busy}
              className="rounded-lg border border-white/20 px-4 py-1.5 text-sm text-white/80 hover:bg-white/10"
            >
              Άκυρο
            </button>
          </div>
        </div>
      )}

      {status.text && (
        <p className={`text-xs ${status.type === "error" ? "text-rose-300" : "text-emerald-300"}`}>
          {status.text}
        </p>
      )}
    </section>
  );
}
