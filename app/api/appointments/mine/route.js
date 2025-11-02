import { cookies } from "next/headers";
import { getBackendBaseUrl } from "../../../../lib/backend";
import { AUTH_DISABLED } from "../../../../lib/auth";

export async function GET() {
  if (AUTH_DISABLED) {
    return Response.json({ appointments: [] }, { status: 200 });
  }
  const token = cookies().get("lemo_auth")?.value || "";
  if (!token) {
    return Response.json({ appointments: [] }, { status: 401 });
  }
  const base = getBackendBaseUrl();
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
