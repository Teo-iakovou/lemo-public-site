import { BACKEND_BASE_URL, DIRECT_BACKEND_URL } from "../../../../lib/config";
import { AUTH_DISABLED } from "../../../../lib/auth";

function getBackendBase() {
  return DIRECT_BACKEND_URL || BACKEND_BASE_URL || "";
}

export async function POST(request) {
  if (AUTH_DISABLED) {
    return Response.json({ user: null }, { status: 200 });
  }
  try {
    const body = await request.json();
    const username = String(body?.name || body?.username || "").trim();
    const password = String(body?.password || "");
    if (!username || !password) {
      return Response.json({ error: "Missing credentials" }, { status: 400 });
    }
    const base = getBackendBase();
    if (!base) {
      return Response.json({ error: "Backend unavailable" }, { status: 503 });
    }
    const res = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return Response.json(
        { error: data?.message || "Failed to login" },
        { status: res.status }
      );
    }
    const response = Response.json({ user: data.user || { username } });
    if (data.token) {
      response.cookies.set({
        name: "lemo_auth",
        value: data.token,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60, // 1 hour
      });
    }
    return response;
  } catch (error) {
    return Response.json(
      { error: error.message || "Unable to login" },
      { status: 500 }
    );
  }
}
