import { API_BASE_URL, DIRECT_BACKEND_URL } from "./config";

async function http(path, options = {}) {
  // Allow direct backend for all endpoints when configured
  const base = ((typeof window !== 'undefined' && DIRECT_BACKEND_URL) ? DIRECT_BACKEND_URL : API_BASE_URL);

  const url = `${base}${path}`;

  // Avoid preflights: only set Content-Type for non-GET
  const headers = { ...(options.headers || {}) };
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET' && headers['Content-Type'] == null) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

export async function getServices() {
  return http("/api/services");
}

export async function getAvailability({ serviceId, date, barberId }) {
  const params = new URLSearchParams({ serviceId, date });
  if (barberId) params.set("barberId", barberId);
  return http(`/api/availability?${params.toString()}`);
}

export async function getHorizonAvailability({ start, days, barberId, include }) {
  const params = new URLSearchParams();
  if (start) params.set("start", start);
  if (days) params.set("days", String(days));
  if (barberId) params.set("barberId", barberId);
  if (include) params.set("include", include);
  return http(`/api/availability/horizon?${params.toString()}`);
}

export async function createAppointment(payload) {
  const isDirect = (typeof window !== 'undefined' && DIRECT_BACKEND_URL);
  if (isDirect) {
    const body = {
      customerName: payload.name,
      phoneNumber: payload.phone,
      appointmentDateTime: payload.dateTime,
      duration: 40,
      type: "appointment",
      barber: payload.barber || "Lemo",
    };
    const res = await fetch(`${DIRECT_BACKEND_URL}/api/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Request failed: ${res.status}`);
    }
    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json() : res.text();
  }
  return http("/api/appointments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
