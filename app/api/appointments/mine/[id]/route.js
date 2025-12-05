import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../../../../lib/backend";
import { AUTH_DISABLED } from "../../../../../lib/auth";

export async function DELETE(request, { params }) {
  if (AUTH_DISABLED) {
    return NextResponse.json({ message: "Auth disabled" }, { status: 200 });
  }

  const token = cookies().get("lemo_auth")?.value || "";
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const base = getBackendBaseUrl();
  if (!base) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }

  const id = params?.id || "";
  if (!id) {
    return NextResponse.json({ error: "Missing appointment id" }, { status: 400 });
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

export async function PUT(request, { params }) {
  if (AUTH_DISABLED) {
    return NextResponse.json({ message: "Auth disabled" }, { status: 503 });
  }

  const token = cookies().get("lemo_auth")?.value || "";
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const base = getBackendBaseUrl();
  if (!base) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }

  const id = params?.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "Missing appointment id" }, { status: 400 });
  }

  let payload = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const res = await fetch(`${base}/api/public-appointments/mine/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    body: JSON.stringify(payload),
  });
  const text = await res.text().catch(() => "");
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = {};
  }
  if (!res.ok) {
    return NextResponse.json(
      { error: data?.message || "Failed to update appointment" },
      { status: res.status }
    );
  }
  return NextResponse.json(data, { status: 200 });
}
