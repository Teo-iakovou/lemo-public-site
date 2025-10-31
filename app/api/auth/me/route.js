import { cookies } from "next/headers";
import { BACKEND_BASE_URL, DIRECT_BACKEND_URL } from "../../../../lib/config";
import { AUTH_DISABLED } from "../../../../lib/auth";

function getBackendBase() {
  return DIRECT_BACKEND_URL || BACKEND_BASE_URL || "";
}

export async function GET() {
  if (AUTH_DISABLED) {
    return Response.json({ user: null }, { status: 200 });
  }
  const token = cookies().get("lemo_auth")?.value || "";
  if (!token) {
    return Response.json({ user: null }, { status: 401 });
  }
  const base = getBackendBase();
  if (!base) {
    return Response.json({ user: null }, { status: 503 });
  }
  const res = await fetch(`${base}/api/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const response = Response.json(
      { user: null, error: data?.message || "Unauthorized" },
      { status: res.status }
    );
    response.cookies.set({
      name: "lemo_auth",
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return response;
  }
  return Response.json({ user: data.user });
}
