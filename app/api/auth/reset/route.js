import { NextResponse } from "next/server";
import { BACKEND_BASE_URL, DIRECT_BACKEND_URL } from "../../../../lib/config";
import { AUTH_DISABLED } from "../../../../lib/auth";

function getBackendBase() {
  return DIRECT_BACKEND_URL || BACKEND_BASE_URL || "";
}

export async function POST(request) {
  if (AUTH_DISABLED) {
    return NextResponse.json({ message: "Auth disabled" }, { status: 200 });
  }
  try {
    const body = await request.json();
    const phone = String(body?.phone || body?.phoneNumber || "").trim();
    const otp = String(body?.otp || body?.code || "").trim();
    const password = String(body?.password || body?.newPassword || "");
    if (!phone || !otp || !password) {
      return NextResponse.json({ error: "Missing phone, OTP, or password" }, { status: 400 });
    }
    const base = getBackendBase();
    if (!base) {
      return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
    }
    const res = await fetch(`${base}/api/public-auth/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: phone, otp, password }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.message || "Failed to reset password" },
        { status: res.status }
      );
    }
    return NextResponse.json({ message: data?.message || "Password updated" });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to reset password" },
      { status: 500 }
    );
  }
}
