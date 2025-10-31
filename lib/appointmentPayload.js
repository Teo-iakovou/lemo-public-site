import { normalizeBarberValue } from "./barber";

const ATHENS_TIME_ZONE = "Europe/Athens";
const BARE_LDT_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?$/;

function toTrimmed(value) {
  if (value == null) return "";
  return String(value).trim();
}

function getFormatter(timeZone) {
  if (!getFormatter.cache) {
    getFormatter.cache = new Map();
  }
  if (!getFormatter.cache.has(timeZone)) {
    getFormatter.cache.set(
      timeZone,
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    );
  }
  return getFormatter.cache.get(timeZone);
}

function toUtcIsoFromLocalComponents({
  year,
  month,
  day,
  hour,
  minute,
  second = 0,
  timeZone,
}) {
  try {
    const baseUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    const baseDate = new Date(baseUtc);
    const formatter = getFormatter(timeZone);
    const parts = formatter.formatToParts(baseDate);
    const values = {};
    for (const part of parts) {
      if (part.type !== "literal") {
        values[part.type] = part.value;
      }
    }
    const zoneUtc = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second || 0)
    );
    const offset = zoneUtc - baseUtc;
    return new Date(baseUtc - offset).toISOString();
  } catch {
    return null;
  }
}

function normalizeAppointmentDateTime(raw, { timeZone = ATHENS_TIME_ZONE, date, time } = {}) {
  const trimmed = toTrimmed(raw);
  if (trimmed) {
    if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const match = BARE_LDT_REGEX.exec(trimmed);
    if (match) {
      const [, y, m, d, h, min, s] = match;
      const iso = toUtcIsoFromLocalComponents({
        year: Number(y),
        month: Number(m),
        day: Number(d),
        hour: Number(h),
        minute: Number(min),
        second: Number(s || 0),
        timeZone,
      });
      if (iso) return iso;
    }
  }

  const trimmedDate = toTrimmed(date);
  const trimmedTime = toTrimmed(time);
  if (trimmedDate && trimmedTime) {
    const match = BARE_LDT_REGEX.exec(`${trimmedDate}T${trimmedTime}`);
    if (match) {
      const [, y, m, d, h, min, s] = match;
      const iso = toUtcIsoFromLocalComponents({
        year: Number(y),
        month: Number(m),
        day: Number(d),
        hour: Number(h),
        minute: Number(min),
        second: Number(s || 0),
        timeZone,
      });
      if (iso) return iso;
    }
  }

  return trimmed;
}

export function buildAppointmentRequestPayload(input = {}) {
  const name = toTrimmed(input.customerName ?? input.name ?? "");
  const phone = toTrimmed(input.phoneNumber ?? input.phone ?? "");

  const rawDateTime =
    input.appointmentDateTime ??
    input.dateTime ??
    input.appointmentDate ??
    (input.date && input.time ? `${input.date}T${input.time}` : "");

  const resolvedDateTime = normalizeAppointmentDateTime(rawDateTime, {
    timeZone: toTrimmed(input.timeZone) || ATHENS_TIME_ZONE,
    date: input.date,
    time: input.time,
  });

  const rawDuration = Number.parseInt(
    input.duration ?? input.estimatedDuration ?? "",
    10
  );
  const duration =
    Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 40;

  const type =
    input.type && typeof input.type === "string"
      ? input.type
      : "appointment";
  const barber = normalizeBarberValue(input.barber);

  const payload = {
    customerName: name,
    phoneNumber: phone,
    appointmentDateTime: resolvedDateTime,
    duration,
    type,
    barber,
  };

  // Preserve original keys for backwards compatibility with existing server routes.
  if (name) payload.name = name;
  if (phone) payload.phone = phone;
  if (resolvedDateTime) payload.dateTime = resolvedDateTime;

  if (input.serviceId) payload.serviceId = input.serviceId;
  if (input.service) payload.service = input.service;
  if (input.price != null) payload.price = input.price;
  if (input.dateOfBirth) payload.dateOfBirth = input.dateOfBirth;
  if (input.email) payload.email = input.email;
  if (input.notes) payload.notes = input.notes;
  if (input.createdBy) payload.createdBy = input.createdBy;

  const meta = input.meta ? { ...input.meta } : undefined;
  const trimmedRaw = toTrimmed(rawDateTime);
  if (trimmedRaw && trimmedRaw !== resolvedDateTime) {
    if (meta) {
      meta.originalDateTime = trimmedRaw;
    } else {
      payload.meta = { originalDateTime: trimmedRaw };
    }
  }
  if (!payload.meta && meta) {
    payload.meta = meta;
  }

  return payload;
}
