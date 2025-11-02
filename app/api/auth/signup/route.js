import { NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../../../lib/backend";
import { AUTH_DISABLED } from "../../../../lib/auth";

export async function POST(request) {
  if (AUTH_DISABLED) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  try {
    const body = await request.json();
    const username = String(body?.name || body?.username || "").trim();
    const password = String(body?.password || "");
    const rawPhone = String(body?.phone || body?.phoneNumber || "").trim();
    const phoneNumber = rawPhone.replace(/\s+/g, "");
    if (!username || !password || !phoneNumber) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }
    const base = getBackendBaseUrl();
    if (!base) {
      return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
    }
    const signupRes = await fetch(`${base}/api/public-auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, phoneNumber }),
      cache: "no-store",
    });
    const signupData = await signupRes.json().catch(() => ({}));
    if (!signupRes.ok) {
      return NextResponse.json(
        { error: signupData?.message || "Failed to sign up" },
        { status: signupRes.status }
      );
    }

    let token = signupData.token;
    let userPayload = signupData.user || { username };

    if (!token) {
      const loginRes = await fetch(`${base}/api/public-auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        cache: "no-store",
      });
      const loginData = await loginRes.json().catch(() => ({}));
      if (!loginRes.ok) {
        return NextResponse.json(
          { error: loginData?.message || "Failed to login" },
          { status: loginRes.status }
        );
      }
      token = loginData.token;
      userPayload = loginData.user || userPayload;
    }

    const response = NextResponse.json({ user: userPayload });
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
    return NextResponse.json(
      { error: error.message || "Unable to sign up" },
      { status: 500 }
    );
  }
}
