import { getBackendBaseUrl } from "./backend";
import {
  DEFAULT_PUBLIC_SETTINGS,
  normalizePublicSettings,
} from "./publicSettings";

const CACHE = {
  value: DEFAULT_PUBLIC_SETTINGS,
  ts: 0,
};
const SETTINGS_TTL_MS = 5000; // short-lived to reflect dashboard changes quickly

export async function fetchPublicSettingsServer() {
  const now = Date.now();
  if (CACHE.value && now - CACHE.ts < SETTINGS_TTL_MS) {
    return CACHE.value;
  }

  const base = getBackendBaseUrl();
  if (!base) {
    CACHE.value = DEFAULT_PUBLIC_SETTINGS;
    CACHE.ts = now;
    return CACHE.value;
  }

  try {
    const res = await fetch(`${base}/api/public-settings`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to load public settings");
    const data = await res.json().catch(() => ({}));
    const normalized = normalizePublicSettings(data);
    CACHE.value = normalized;
    CACHE.ts = now;
    return normalized;
  } catch {
    CACHE.ts = now;
    return CACHE.value || DEFAULT_PUBLIC_SETTINGS;
  }
}
