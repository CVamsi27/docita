import { describe, expect, it } from '@jest/globals';
import {
  SEED_PATIENT_PHONE_NUMBER_E164,
  seedPatientPhone,
} from './seed-constants';
import { SEEDED_PATIENTS, getSeedDocumentPlans } from './seed-patient-factory';

describe('seed patient factory', () => {
  it('exposes the full 25-patient catalog with unique ids', () => {
    expect(SEEDED_PATIENTS).toHaveLength(25);
    const ids = SEEDED_PATIENTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps patient index 0 (Rajesh) as the portal patient in lockstep with seed-constants', () => {
    const [portal] = SEEDED_PATIENTS;
    expect(portal.firstName).toBe('Rajesh');
    expect(portal.lastName).toBe('Kumar');
    expect(SEED_PATIENT_PHONE_NUMBER_E164).toBe(`+91 ${seedPatientPhone(0)}`);
  });

  it('uses only valid genders and plausible demo emails', () => {
    for (const p of SEEDED_PATIENTS) {
      expect(['MALE', 'FEMALE']).toContain(p.gender);
      expect(p.email).toMatch(/^[a-z]+\.[a-z]+@docita\.work$/);
      expect(p.medicalHistory).toBeInstanceOf(Array);
    }
  });

  it('builds 8 document plans with unique ids referencing the passed patients', () => {
    const patients = SEEDED_PATIENTS.map((p) => ({ id: p.id }));
    const docs = getSeedDocumentPlans(patients);
    expect(docs).toHaveLength(8);
    const ids = docs.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const doc of docs) {
      expect(doc.patientId).toMatch(/^seed-patient-/);
      expect(doc.url).toMatch(/^\/uploads\/seed\/documents\//);
    }
  });
});
