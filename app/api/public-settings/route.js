import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../../lib/backend";
import { AUTH_DISABLED } from "../../../lib/auth";

const emptySettings = {
  closedMonths: [],
  blockedDates: [],
  allowedDates: [],
  specialDayHours: {},
};

export async function GET() {
  if (AUTH_DISABLED) {
    return NextResponse.json({ settings: emptySettings }, { status: 200 });
  }
  const base = getBackendBaseUrl();
  if (!base) {
    return NextResponse.json(
      { settings: emptySettings, error: "Backend unavailable" },
      { status: 503 }
    );
  }
  const res = await fetch(`${base}/api/public-settings`, {
    method: "GET",
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { settings: emptySettings, error: data?.message || "Failed to load settings" },
      { status: res.status }
    );
  }
  return NextResponse.json({
    settings: data?.settings || emptySettings,
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
  if (!base) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
  let payload = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
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
    return NextResponse.json(
      { error: data?.message || "Failed to update settings" },
      { status: res.status }
    );
  }
  return NextResponse.json({
    settings: data?.settings || emptySettings,
  });
}
