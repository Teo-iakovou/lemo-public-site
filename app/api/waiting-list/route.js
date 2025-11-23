import { getBackendBaseUrl } from "../../../lib/backend";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      preferredDate,
      preferredTime,
      name,
      phoneNumber,
      serviceId,
      barberId,
    } = body;

    if (!preferredDate || !preferredTime || !name || !phoneNumber) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const base = getBackendBaseUrl();
    if (!base) {
      return Response.json(
        {
          status: "queued",
          message: "No backend configured; mocked success.",
        },
        { status: 200 }
      );
    }

    const payload = JSON.stringify({
      preferredDate,
      preferredTime,
      name,
      phoneNumber,
      serviceId,
      barberId,
    });

    async function callBackend(path) {
      const target = `${base}${path}`;
      const res = await fetch(target, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
      const text = await res.text().catch(() => "");
      if (!res.ok) {
        throw Object.assign(new Error(text || `Failed: ${res.status}`), { responseText: text, status: res.status, target });
      }
      return text;
    }

    let text;
    try {
      text = await callBackend("/api/waitingList/public");
    } catch (primaryError) {
      try {
        text = await callBackend("/api/waiting-list/public");
      } catch (secondaryError) {
        console.error("Both waiting list endpoints failed", {
          primary: primaryError?.responseText || primaryError?.message,
          secondary: secondaryError?.responseText || secondaryError?.message,
        });
        throw secondaryError;
      }
    }

    try {
      return Response.json(JSON.parse(text), { status: 200 });
    } catch {
      return Response.json({ raw: text }, { status: 200 });
    }
  } catch (error) {
    return Response.json(
      { error: error.message || "Bad request" },
      { status: 400 }
    );
  }
}
