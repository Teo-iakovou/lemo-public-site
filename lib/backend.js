import { BACKEND_BASE_URL, DIRECT_BACKEND_URL } from "./config";

function normalizeBase(input = "") {
  if (!input) return "";
  let base = input.trim();
  if (!base) return "";
  // Remove trailing slash
  base = base.replace(/\/+$/, "");
  // Strip trailing /api if present
  base = base.replace(/\/api$/i, "");
  return base;
}

export function getBackendBaseUrl() {
  const raw = DIRECT_BACKEND_URL || BACKEND_BASE_URL || "";
  return normalizeBase(raw);
}
