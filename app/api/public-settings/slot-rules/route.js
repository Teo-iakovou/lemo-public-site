import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../../../lib/backend";
import { AUTH_DISABLED } from "../../../../lib/auth";
import { normalizePublicSettings } from "../../../../lib/publicSettings";

// Saves ONLY the slot-duration rules (backend: PUT /api/public-settings/slot-rules).
// Kept separate from the main settings PUT so it never overwrites other settings.
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
  const res = await fetch(`${base}/api/public-settings/slot-rules`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ slotRules: payload?.slotRules }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { error: data?.message || data?.error || "Αποτυχία αποθήκευσης κανόνων." },
      { status: res.status }
    );
  }
  return NextResponse.json({ settings: normalizePublicSettings(data) });
}
