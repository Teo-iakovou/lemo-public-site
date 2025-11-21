import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../../lib/backend";
import { AUTH_DISABLED } from "../../../lib/auth";
import { normalizePublicSettings, DEFAULT_PUBLIC_SETTINGS } from "../../../lib/publicSettings";

const emptySettings = {
  closedMonths: [],
  blockedDates: [],
  allowedDates: [],
  specialDayHours: {},
  extraDaySlots: {},
};

const fallbackStore = (() => {
  const globalStore = globalThis;
  if (!globalStore.__PUBLIC_SETTINGS_FALLBACK) {
    globalStore.__PUBLIC_SETTINGS_FALLBACK = {
      settings: DEFAULT_PUBLIC_SETTINGS,
      updatedAt: Date.now(),
    };
  }
  return globalStore.__PUBLIC_SETTINGS_FALLBACK;
})();

function readFallbackSettings() {
  return fallbackStore.settings || DEFAULT_PUBLIC_SETTINGS;
}

function writeFallbackSettings(settings) {
  fallbackStore.settings = normalizePublicSettings({ settings }) || DEFAULT_PUBLIC_SETTINGS;
  fallbackStore.updatedAt = Date.now();
  return fallbackStore.settings;
}

export async function GET() {
  if (AUTH_DISABLED) {
    return NextResponse.json({ settings: emptySettings }, { status: 200 });
  }
  const base = getBackendBaseUrl();
  if (!base) {
    return NextResponse.json({ settings: readFallbackSettings(), fallback: true }, { status: 200 });
  }
  const res = await fetch(`${base}/api/public-settings`, {
    method: "GET",
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fallback = readFallbackSettings();
    return NextResponse.json({ settings: fallback, error: data?.message || "Failed to load settings", fallback: true }, { status: 200 });
  }
  const normalized = normalizePublicSettings(data);
  writeFallbackSettings(normalized);
  return NextResponse.json({
    settings: normalized,
  });
}

export async function PUT(request) {
  if (AUTH_DISABLED) {
    return NextResponse.json({ error: "Auth disabled" }, { status: 503 });
  }
  const cookieStore = await cookies();
  const token = cookieStore.get("lemo_auth")?.value || "";
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const base = getBackendBaseUrl();
  let payload = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }
  if (!base) {
    const fallback = writeFallbackSettings(payload?.settings || payload || {});
    return NextResponse.json({ settings: fallback, fallback: true }, { status: 200 });
  }
  const res = await fetch(`${base}/api/public-settings`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fallback = writeFallbackSettings(payload?.settings || payload || {});
    return NextResponse.json(
      { error: data?.message || "Failed to update settings", settings: fallback, fallback: true },
      { status: 200 }
    );
  }
  const normalized = normalizePublicSettings(data);
  writeFallbackSettings(normalized);
  return NextResponse.json({
    settings: normalized,
  });
}
