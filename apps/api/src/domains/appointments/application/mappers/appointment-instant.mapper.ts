import { BadRequestException } from '@nestjs/common';
import { normalizeAppointmentInstant } from '@workspace/types';

/** Coerce API appointment instants using clinic wall timezone when needed. */
export function coerceAppointmentBoundaryInstant(
  value: string | Date,
  clinicTimezone: string,
  fieldLabel: string,
): Date {
  const parsed = normalizeAppointmentInstant(value, clinicTimezone);
  if (!parsed || Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`Enter a valid ${fieldLabel}.`);
  }
  return parsed;
}
