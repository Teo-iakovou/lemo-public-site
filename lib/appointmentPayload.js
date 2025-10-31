import { normalizeBarberValue } from "./barber";

function toTrimmed(value) {
  if (value == null) return "";
  return String(value).trim();
}

export function buildAppointmentRequestPayload(input = {}) {
  const name = toTrimmed(input.customerName ?? input.name ?? "");
  const phone = toTrimmed(input.phoneNumber ?? input.phone ?? "");
  const appointmentDateTime =
    input.appointmentDateTime ?? input.dateTime ?? input.appointmentDate ?? "";

  const rawDuration = Number.parseInt(
    input.duration ?? input.estimatedDuration ?? "",
    10
  );
  const duration = Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 40;

  const type = input.type && typeof input.type === "string" ? input.type : "appointment";
  const barber = normalizeBarberValue(input.barber);

  const payload = {
    customerName: name,
    phoneNumber: phone,
    appointmentDateTime,
    duration,
    type,
    barber,
  };

  // Preserve original keys for backwards compatibility with existing server routes.
  if (name) payload.name = name;
  if (phone) payload.phone = phone;
  if (appointmentDateTime) payload.dateTime = appointmentDateTime;

  if (input.serviceId) payload.serviceId = input.serviceId;
  if (input.service) payload.service = input.service;
  if (input.price != null) payload.price = input.price;
  if (input.dateOfBirth) payload.dateOfBirth = input.dateOfBirth;
  if (input.email) payload.email = input.email;
  if (input.notes) payload.notes = input.notes;
  if (input.meta) payload.meta = input.meta;
  if (input.createdBy) payload.createdBy = input.createdBy;

  return payload;
}

