const BARBER_FALLBACK = "ΛΕΜΟ";

const BARBER_MAP = {
  lemo: "ΛΕΜΟ",
  "λεμο": "ΛΕΜΟ",
  forou: "ΦΟΡΟΥ",
  "φορου": "ΦΟΡΟΥ",
  koushis: "ΚΟΥΣΙΗΣ",
  "κουσιης": "ΚΟΥΣΙΗΣ",
  "κούσιης": "ΚΟΥΣΙΗΣ",
};

export function normalizeBarberValue(input) {
  const raw = (input ?? "").toString().trim();
  if (!raw) return BARBER_FALLBACK;
  const mapped = BARBER_MAP[raw.toLowerCase()];
  return mapped || raw;
}

export { BARBER_FALLBACK };
