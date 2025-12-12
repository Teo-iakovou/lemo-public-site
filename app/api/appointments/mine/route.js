import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../../../lib/backend";
import { AUTH_DISABLED } from "../../../../lib/auth";

export async function GET() {
  if (AUTH_DISABLED) {
    return Response.json({ appointments: [] }, { status: 200 });
  }
  const cookieStore = await cookies();
  const token = cookieStore.get("lemo_auth")?.value || "";
  if (!token) {
    return Response.json({ appointments: [] }, { status: 401 });
  }
  const base = getBackendBaseUrl();
  if (!base) {
    return Response.json({ appointments: [] }, { status: 503 });
  }
  try {
    const res = await fetch(`${base}/api/public-appointments/mine`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const text = await res.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
    if (!res.ok) {
      return Response.json(
        { appointments: [], error: data?.message || "Failed to load appointments" },
        { status: res.status }
      );
    }
    const appointments = Array.isArray(data.appointments) ? data.appointments : [];
    return Response.json({ appointments }, { status: 200 });
  } catch (error) {
    console.error("appointments/mine GET failed:", error);
    return Response.json(
      { appointments: [], error: "Unable to reach scheduling service" },
      { status: 502 }
    );
  }
}

export async function DELETE(request) {
  if (AUTH_DISABLED) {
    return NextResponse.json({ message: "Auth disabled" }, { status: 200 });
  }
  const cookieStore = await cookies();
  const token = cookieStore.get("lemo_auth")?.value || "";
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "Missing appointment id" }, { status: 400 });
  }
  const base = getBackendBaseUrl();
  if (!base) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
  const res = await fetch(`${base}/api/public-appointments/mine/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = {};
  }
  if (!res.ok) {
    return NextResponse.json(
      { error: data?.message || "Failed to cancel appointment" },
      { status: res.status }
    );
  }
  return NextResponse.json({
    message: data?.message || "Appointment cancelled",
  });
}
