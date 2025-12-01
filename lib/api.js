import { API_BASE_URL, DIRECT_BACKEND_URL } from "./config";
import { buildAppointmentRequestPayload } from "./appointmentPayload";
import { normalizePublicSettings } from "./publicSettings";

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

export async function getPublicSettings() {
  try {
    const res = await fetch("/api/public-settings", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || "Failed to load settings");
    }
    return normalizePublicSettings(data);
  } catch (error) {
    console.error("Error fetching public settings:", error);
    throw error;
  }
}

export async function updatePublicSettings(payload) {
  const res = await fetch("/api/public-settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Failed to update settings");
  }
  return normalizePublicSettings(data);
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
  const requestBody = buildAppointmentRequestPayload(payload);
  if (isDirect) {
    const res = await fetch(`${DIRECT_BACKEND_URL}/api/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
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
    body: JSON.stringify(requestBody),
  });
}

export async function joinWaitingList(payload) {
  const {
    preferredDate,
    preferredTime,
    preferredTimes,
    name,
    phoneNumber,
    serviceId,
    barberId,
  } = payload || {};
  const timesList = Array.isArray(preferredTimes)
    ? preferredTimes
        .map((value) =>
          typeof value === "string" ? value.trim() : ""
        )
        .filter(Boolean)
    : [];
  const fallbackTime = preferredTime && typeof preferredTime === "string" ? preferredTime.trim() : "";
  const normalizedTimes =
    timesList.length > 0
      ? timesList
      : fallbackTime
      ? [fallbackTime]
      : [];
  if (!preferredDate || !normalizedTimes.length || !name || !phoneNumber) {
    throw new Error("Missing required fields");
  }
  const body = JSON.stringify({
    preferredDate,
    preferredTime: normalizedTimes[0],
    preferredTimes: normalizedTimes,
    name,
    phoneNumber,
    serviceId: serviceId || "",
    barberId: barberId || "",
  });

  const proxyCall = async () => {
    const res = await fetch("/api/waiting-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(text || "Failed to join waiting list");
    }
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  };

  const directCall = async (path) => {
    const target = `${DIRECT_BACKEND_URL}${path}`;
    const res = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      const err = new Error(text || "Failed to join waiting list");
      err.responseText = text;
      err.target = target;
      err.status = res.status;
      throw err;
    }
    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? JSON.parse(text) : text;
  };

  if (typeof window !== "undefined" && DIRECT_BACKEND_URL) {
    try {
      return await directCall("/api/waitingList/public");
    } catch (err) {
      console.warn("Direct waiting list call failed, falling back to proxy:", err?.message || err);
      try {
        return await directCall("/api/waiting-list/public");
      } catch (secondary) {
        console.warn("Camel-case endpoint unavailable; using proxy:", secondary?.message || secondary);
        return proxyCall();
      }
    }
  }

  return proxyCall();
}
