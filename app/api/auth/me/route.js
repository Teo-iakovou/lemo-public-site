import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../../../lib/backend";
import { AUTH_DISABLED } from "../../../../lib/auth";

export async function GET() {
  if (AUTH_DISABLED) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  const token = cookies().get("lemo_auth")?.value || "";
  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  const base = getBackendBaseUrl();
  if (!base) {
    return NextResponse.json({ user: null }, { status: 503 });
  }
  const res = await fetch(`${base}/api/public-auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const response = NextResponse.json(
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
  return NextResponse.json({ user: data.user });
}
