import { BACKEND_BASE_URL, DIRECT_BACKEND_URL } from "../../../lib/config";

export async function POST(request) {
  try {
    const body = await request.json();
    const { serviceId, dateTime, name, phone, email, barber } = body || {};
    if (!dateTime || !name || !phone) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const payload = {
      customerName: name,
      phoneNumber: phone,
      appointmentDateTime: dateTime,
      duration: 40,
      type: "appointment",
      barber: barber || "Lemo",
    };
    if (email) payload.email = email;

    const base = DIRECT_BACKEND_URL || BACKEND_BASE_URL || "";
    if (!base) {
      // No backend configured; return a fake id to complete the flow in dev
      return Response.json({ id: "local-dev-appointment" }, { status: 200 });
    }

    const res = await fetch(`${base}/api/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
