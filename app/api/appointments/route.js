import { cookies } from "next/headers";
import { BACKEND_BASE_URL, DIRECT_BACKEND_URL } from "../../../lib/config";
import { buildAppointmentRequestPayload } from "../../../lib/appointmentPayload";
import { AUTH_DISABLED } from "../../../lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();
    const payload = buildAppointmentRequestPayload(body);

    const { appointmentDateTime, customerName, phoneNumber } = payload;
    if (!appointmentDateTime || !customerName || !phoneNumber) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const base = DIRECT_BACKEND_URL || BACKEND_BASE_URL || "";
    if (!base) {
      // No backend configured; return a fake id to complete the flow in dev
      return Response.json({ id: "local-dev-appointment" }, { status: 200 });
    }

    const headers = { "Content-Type": "application/json" };
    if (!AUTH_DISABLED) {
      const token = cookies().get("lemo_auth")?.value || "";
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${base}/api/appointments`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!res.ok) {
      return new Response(text || "Failed to create", { status: res.status });
    }

    // Try to parse JSON; if not JSON, wrap as text
    try {
      const data = JSON.parse(text);
      return Response.json(data, { status: 200 });
    } catch {
      return Response.json({ id: undefined, raw: text }, { status: 200 });
    }
  } catch (e) {
    return Response.json({ error: e.message || "Bad request" }, { status: 400 });
  }
}
