import { describe, expect, it } from 'vitest';
import { SEED_PATIENT_PHONE_NUMBER_E164, seedPatientPhone } from './seed-identity.js';

describe('seedPatientPhone', () => {
  it('produces distinct, plausible 10-digit Indian mobiles', () => {
    const phones = new Set<string>();
    for (let i = 0; i < 500; i += 1) {
      const phone = seedPatientPhone(i);
      expect(phone).toMatch(/^[6-9]\d{9}$/);
      expect(phones.has(phone)).toBe(false);
      phones.add(phone);
    }
  });

  it('keeps index 0 at the documented portal-patient number', () => {
    expect(seedPatientPhone(0)).toBe('9000000001');
  });
});

describe('SEED_PATIENT_PHONE_NUMBER_E164', () => {
  it('stays in lockstep with index 0', () => {
    expect(SEED_PATIENT_PHONE_NUMBER_E164).toBe(`+91 ${seedPatientPhone(0)}`);
  });

  it('carries the +91 country code and the national number', () => {
    expect(SEED_PATIENT_PHONE_NUMBER_E164).toMatch(/^\+91 \d{10}$/);
    expect(SEED_PATIENT_PHONE_NUMBER_E164.replace(/\D/g, '')).toBe(
      `91${seedPatientPhone(0)}`,
    );
  });
});
