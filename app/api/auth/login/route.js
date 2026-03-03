import { NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../../../lib/backend";
import { AUTH_DISABLED } from "../../../../lib/auth";

export async function POST(request) {
  if (AUTH_DISABLED) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  try {
    const body = await request.json();
    const phone = String(body?.phone || body?.phoneNumber || "").trim();
    const username = String(body?.name || body?.username || "").trim();
    const password = String(body?.password || "");
    if ((!phone && !username) || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }
    const base = getBackendBaseUrl();
    if (!base) {
      return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
    }
    const res = await fetch(`${base}/api/public-auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        phoneNumber: phone,
        phone,
        password,
      }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.message || "Failed to login" },
        { status: res.status }
      );
    }
    const userPayload = data.user || { username };
    const response = NextResponse.json({
      user: userPayload,
      requiresDob: Boolean(userPayload?.requiresDob),
    });
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
    return NextResponse.json(
      { error: error.message || "Unable to login" },
      { status: 500 }
    );
  }
}
