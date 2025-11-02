import { cookies } from "next/headers";
import { BACKEND_BASE_URL, DIRECT_BACKEND_URL } from "../../../../lib/config";
import { AUTH_DISABLED } from "../../../../lib/auth";

function getBackendBase() {
  return DIRECT_BACKEND_URL || BACKEND_BASE_URL || "";
}

export async function GET() {
  if (AUTH_DISABLED) {
    return Response.json({ appointments: [] }, { status: 200 });
  }
  const token = cookies().get("lemo_auth")?.value || "";
  if (!token) {
    return Response.json({ appointments: [] }, { status: 401 });
  }
  const base = getBackendBase();
  if (!base) {
    return Response.json({ appointments: [] }, { status: 503 });
  }
  const res = await fetch(`${base}/api/public-appointments/mine`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return Response.json(
      { appointments: [], error: data?.message || "Failed to load appointments" },
      { status: res.status }
    );
  }
  return Response.json({ appointments: data.appointments || [] });
}
