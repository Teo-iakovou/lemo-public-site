import { API_BASE_URL, DIRECT_BACKEND_URL } from "./config";

async function http(path, options = {}) {
  // Certain endpoints must go through our Next.js API to avoid CORS
  // and to preserve server-side logic (field mapping, auth, etc.).
  const forceSameOrigin =
    path.startsWith('/api/services') ||
    path.startsWith('/api/appointments') ||
    path.startsWith('/api/availability'); // include horizon and per-day

  const base = forceSameOrigin
    ? ''
    : ((typeof window !== 'undefined' && DIRECT_BACKEND_URL) ? DIRECT_BACKEND_URL : API_BASE_URL);

  const url = `${base}${path}`;

  // Avoid setting Content-Type for GET requests to prevent CORS preflight
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
  return http("/api/appointments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
