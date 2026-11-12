// Slot-duration rules set in Settings (settings.slotRules). A rule changes the slot length
// from a given time of day onwards, for a date range and for all or some barbers:
//   { id, barbers: [] | ["LEMO","FOROU","KOUSHIS"], from: "YYYY-MM-DD", to: "YYYY-MM-DD"|"",
//     after: "HH:MM", minutes: 10..120 }
// barbers [] = everyone. Before `after` the normal 40' grid runs (last slot that ENDS by
// `after`); from `after` slots are `minutes` long, back to back, until closing.
// MUST stay identical to barber-backend/services/bookingRules.js (LemoAPP).

export const DEFAULT_SLOT_MINUTES = 40;
export const SLOT_RULE_MIN_MINUTES = 10;
export const SLOT_RULE_MAX_MINUTES = 120;
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const RULE_BARBER_KEYS = ["LEMO", "FOROU", "KOUSHIS"];

export function hhmmToMin(value) {
  const m = HHMM_RE.exec(String(value || "").trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export function minToHHMM(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function normalizeSlotRules(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  value.forEach((r, i) => {
    if (!r || typeof r !== "object") return;
    const from = String(r.from || "").trim();
    const to = String(r.to || "").trim();
    const after = String(r.after || "").trim();
    const minutes = Math.round(Number(r.minutes));
    if (!YMD_RE.test(from) || !HHMM_RE.test(after)) return;
    if (to && (!YMD_RE.test(to) || to < from)) return;
    if (!Number.isFinite(minutes) || minutes < SLOT_RULE_MIN_MINUTES || minutes > SLOT_RULE_MAX_MINUTES) return;
    const barbers = Array.isArray(r.barbers)
      ? Array.from(new Set(r.barbers.filter((b) => RULE_BARBER_KEYS.includes(b))))
      : [];
    out.push({
      id: String(r.id || `rule-${i}-${from}`).slice(0, 64),
      barbers: barbers.length === RULE_BARBER_KEYS.length ? [] : barbers,
      from,
      to,
      after,
      minutes,
    });
  });
  return out;
}

// A rule naming the barber beats an "everyone" rule; among equals the one added last wins.
export function activeSlotRule(rules, ds, barberKey) {
  let best = null;
  let bestSpecific = false;
  (Array.isArray(rules) ? rules : []).forEach((r) => {
    if (ds < r.from || (r.to && ds > r.to)) return;
    const everyone = !r.barbers || r.barbers.length === 0;
    if (!everyone && !r.barbers.includes(barberKey)) return;
    const specific = !everyone;
    if (!best || specific || !bestSpecific) {
      best = r;
      bestSpecific = specific;
    }
  });
  return best;
}

// Day plan: [{ start, duration }] in minutes from midnight.
export function buildDaySlots({ window, rule }) {
  if (!window) return [];
  const out = [];
  const after = rule ? hhmmToMin(rule.after) : null;
  let t = window.open;
  for (let guard = 0; guard < 200; guard += 1) {
    if (rule && t >= after) {
      if (t + rule.minutes > window.close) break;
      out.push({ start: t, duration: rule.minutes });
      t += rule.minutes;
    } else if (t + DEFAULT_SLOT_MINUTES <= (rule ? Math.min(after, window.close) : window.close)) {
      out.push({ start: t, duration: DEFAULT_SLOT_MINUTES });
      t += DEFAULT_SLOT_MINUTES;
    } else if (rule && after < window.close) {
      t = Math.max(t, after);
    } else {
      break;
    }
  }
  return out;
}

// Length of a slot starting at `startMin` for this barber (settings key: LEMO|FOROU|KOUSHIS).
export function slotDurationFor(settings, ds, startMin, barberKey) {
  const rule = activeSlotRule(normalizeSlotRules(settings?.slotRules), ds, barberKey);
  if (rule && startMin != null && startMin >= hhmmToMin(rule.after)) return rule.minutes;
  return DEFAULT_SLOT_MINUTES;
}
