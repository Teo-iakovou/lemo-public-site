const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const DEFAULT_PUBLIC_SETTINGS = Object.freeze({
  closedMonths: [11],
  blockedDates: [],
  allowedDates: [],
  specialDayHours: {},
  extraDaySlots: {},
});

function normalizeMonthList(list) {
  if (!Array.isArray(list)) {
    return DEFAULT_PUBLIC_SETTINGS.closedMonths.slice();
  }
  const values = Array.from(
    new Set(
      list
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n >= 0 && n <= 11)
    )
  ).sort((a, b) => a - b);
  return values;
}

function normalizeDateList(list) {
  if (!Array.isArray(list)) return [];
  return Array.from(
    new Set(
      list
        .map((d) => String(d || "").trim())
        .filter((d) => d && ISO_DATE_RE.test(d))
    )
  ).sort();
}

export function normalizeTimeList(value) {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
    ? value.split(/[, ]+/)
    : [];
  const sanitized = Array.from(
    new Set(
      raw
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .filter((v) => v && HHMM_RE.test(v))
    )
  ).sort();
  return sanitized;
}

function normalizeTimeMap(map) {
  if (!map || typeof map !== "object") return {};
  const out = {};
  Object.entries(map).forEach(([key, value]) => {
    const dateKey = String(key || "").trim();
    if (!ISO_DATE_RE.test(dateKey)) return;
    const times = normalizeTimeList(value);
    if (times.length) {
      out[dateKey] = times;
    }
  });
  return out;
}

export function normalizePublicSettings(payload = {}) {
  const data = payload?.settings || payload || {};
  return {
    closedMonths: normalizeMonthList(data.closedMonths),
    blockedDates: normalizeDateList(data.blockedDates),
    allowedDates: normalizeDateList(data.allowedDates),
    specialDayHours: normalizeTimeMap(data.specialDayHours || data.specialHours),
    extraDaySlots: normalizeTimeMap(data.extraDaySlots || data.extraSlots),
  };
}
