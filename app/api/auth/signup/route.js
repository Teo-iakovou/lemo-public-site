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
    const signupRes = await fetch(`${base}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });
    const signupData = await signupRes.json().catch(() => ({}));
    if (!signupRes.ok) {
      return Response.json(
        { error: signupData?.message || "Failed to sign up" },
        { status: signupRes.status }
      );
    }

    let token = signupData.token;
    let userPayload = signupData.user || { username };

    if (!token) {
      const loginRes = await fetch(`${base}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        cache: "no-store",
      });
      const loginData = await loginRes.json().catch(() => ({}));
      if (!loginRes.ok) {
        return Response.json(
          { error: loginData?.message || "Failed to login" },
          { status: loginRes.status }
        );
      }
      token = loginData.token;
      userPayload = loginData.user || userPayload;
    }

    const response = Response.json({ user: userPayload });
    if (token) {
      response.cookies.set({
        name: "lemo_auth",
        value: token,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60,
      });
    }
    return response;
  } catch (error) {
    return Response.json(
      { error: error.message || "Unable to sign up" },
      { status: 500 }
    );
  }
}
