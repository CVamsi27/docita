import { describe, expect, it } from '@jest/globals';
import {
  RAJESH_APPOINTMENT_ID,
  RAJESH_INVOICE_ID,
  RAJESH_PRESCRIPTION_ID,
  SEED_PATIENT_PHONE_NUMBER_E164,
  seedPatientPhone,
} from './seed-constants';

/**
 * Seed-constant parity guard (repo survey 2026-08-07): the seed layer
 * (14 files / ~5,000 lines) has no other automated verification, so pin the
 * shared constants here. `seedPatientPhone` must always produce a plausible
 * 10-digit Indian mobile (starts 6-9) and the E164 display constant must stay
 * in lockstep with index 0 — the portal patient login number is used in
 * onboarding screens and e2e fixtures.
 */
describe('seed patient phone constants', () => {
  it('seedPatientPhone produces distinct, plausible 10-digit Indian mobiles', () => {
    const phones = new Set<string>();
    for (let i = 0; i < 500; i += 1) {
      const phone = seedPatientPhone(i);
      expect(phone).toMatch(/^[6-9]\d{9}$/);
      expect(phones.has(phone)).toBe(false);
      phones.add(phone);
    }
  });

  it('the E164 portal-patient constant stays in lockstep with index 0', () => {
    expect(SEED_PATIENT_PHONE_NUMBER_E164).toBe(`+91 ${seedPatientPhone(0)}`);
  });

  it('the E164 constant carries the +91 country code and the national number', () => {
    expect(SEED_PATIENT_PHONE_NUMBER_E164).toMatch(/^\+91 \d{10}$/);
    expect(SEED_PATIENT_PHONE_NUMBER_E164.replace(/\D/g, '')).toBe(
      `91${seedPatientPhone(0)}`,
    );
  });
});

describe('seed identity contract (cross-app)', () => {
  it('pins the Rajesh trio ids', () => {
    expect(RAJESH_APPOINTMENT_ID).toBe('seed-apt-rajesh-completed');
    expect(RAJESH_PRESCRIPTION_ID).toBe('seed-prescription-rajesh');
    expect(RAJESH_INVOICE_ID).toBe('seed-invoice-rajesh');
  });

  it('pins the portal patient identity', () => {
    expect(seedPatientPhone(0)).toBe('9000000001');
    expect(SEED_PATIENT_PHONE_NUMBER_E164).toBe('+91 9000000001');
  });
});
