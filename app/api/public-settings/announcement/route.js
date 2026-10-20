import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../../../lib/backend";
import { AUTH_DISABLED } from "../../../../lib/auth";
import { normalizePublicSettings } from "../../../../lib/publicSettings";

// Saves ONLY the announcement banner (backend: PUT /api/public-settings/announcement).
// Kept separate from the main settings PUT so it can never overwrite availability settings.
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
    return NextResponse.json({ error: "Backend not configured" }, { status: 503 });
  }
  let payload = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }
  const res = await fetch(`${base}/api/public-settings/announcement`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ announcement: payload?.announcement }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { error: data?.message || data?.error || "Αποτυχία αποθήκευσης ανακοίνωσης." },
      { status: res.status }
    );
  }
  return NextResponse.json({ settings: normalizePublicSettings(data) });
}
