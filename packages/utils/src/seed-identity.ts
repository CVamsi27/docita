/**
 * Seed demo identity helpers (extracted 2026-08-08 so the demo phone
 * catalog is shared between the API seed layer (`apps/api/src/seed`) and the
 * frontend Playwright specs (`apps/app/e2e`) instead of being re-typed per
 * app). Pure functions — no React, no Prisma, no clock.
 */

/**
 * Distinct, obviously-fake demo phone number per seeded patient.
 *
 * Numbers are valid Indian mobiles (must start 6-9, 10 digits) so patient
 * forms/validation never reject them, but the 9000000xxx pattern makes it
 * clear at a glance that this is demo data — safe to show on camera, never
 * a real number.
 */
export function seedPatientPhone(index: number): string {
  return `90000${String(index + 1).padStart(5, '0')}`;
}

/** Portal patient (seeded patient index 0) login number, E.164 display form. */
export const SEED_PATIENT_PHONE_NUMBER_E164 = '+91 9000000001';
