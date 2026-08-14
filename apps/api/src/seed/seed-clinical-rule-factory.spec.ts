import { describe, expect, it } from '@jest/globals';
import {
  CHIEF_COMPLAINTS,
  CLINICAL_IMPRESSIONS,
  CONSULTATION_NOTES,
  DIAGNOSIS_NOTES,
  FOLLOW_UP_REASONS,
  HPI_TEMPLATES,
  MEDICATION_TEMPLATES,
  SEED_ICD_CODES,
  TREATMENT_PLANS,
  buildSeedVitals,
} from './seed-clinical-rule-factory';

describe('seed clinical-rule factory', () => {
  it('exposes the clinical narrative templates with expected cardinality', () => {
    expect(CHIEF_COMPLAINTS).toHaveLength(10);
    expect(CONSULTATION_NOTES).toHaveLength(5);
    expect(TREATMENT_PLANS).toHaveLength(5);
    expect(CLINICAL_IMPRESSIONS).toHaveLength(5);
    expect(HPI_TEMPLATES).toHaveLength(5);
    expect(DIAGNOSIS_NOTES).toHaveLength(6);
    expect(FOLLOW_UP_REASONS).toHaveLength(6);
  });

  it('keeps every template array non-empty with unique entries', () => {
    for (const list of [
      CHIEF_COMPLAINTS,
      CONSULTATION_NOTES,
      TREATMENT_PLANS,
      CLINICAL_IMPRESSIONS,
      HPI_TEMPLATES,
      DIAGNOSIS_NOTES,
      FOLLOW_UP_REASONS,
    ]) {
      expect(list.length).toBeGreaterThan(0);
      expect(new Set(list).size).toBe(list.length);
    }
  });

  it('exposes 10 medication templates with unique names and valid sig fields', () => {
    expect(MEDICATION_TEMPLATES).toHaveLength(10);
    const names = MEDICATION_TEMPLATES.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
    for (const med of MEDICATION_TEMPLATES) {
      expect(med.dosage).toBeTruthy();
      expect(med.frequency).toBeTruthy();
      expect(med.duration).toMatch(/^\d+ (days?|months?)$/);
      expect(med.quantity).toBeGreaterThan(0);
      expect(med.refillsAllowed).toBeGreaterThanOrEqual(0);
      expect(['TABLET', 'CAPSULE', 'INHALER']).toContain(med.dosageForm);
    }
  });

  it('exposes the 12-entry ICD-10 catalogue with unique codes and categories', () => {
    expect(SEED_ICD_CODES).toHaveLength(12);
    const codes = SEED_ICD_CODES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    const categories = SEED_ICD_CODES.map((c) => c.category);
    // Categories drive the analytics distribution donut — more than one
    // body system must be represented.
    expect(new Set(categories).size).toBeGreaterThanOrEqual(3);
    for (const entry of SEED_ICD_CODES) {
      expect(entry.description).toBeTruthy();
      expect(entry.category).toBeTruthy();
    }
  });

  it('builds deterministic vitals within clinical ranges for any index', () => {
    for (let i = 0; i < 60; i += 1) {
      const v = buildSeedVitals(i);
      expect(v.height).toBeGreaterThanOrEqual(160);
      expect(v.height).toBeLessThan(185);
      expect(v.weight).toBeGreaterThanOrEqual(55);
      expect(v.weight).toBeLessThan(85);
      expect(v.bloodPressure).toMatch(/^\d{3}\/\d{2}$/);
      expect(v.pulse).toBeGreaterThanOrEqual(70);
      expect(v.pulse).toBeLessThan(85);
      expect(v.temperature).toBeGreaterThanOrEqual(98.2);
      expect(v.temperature).toBeLessThan(99);
      expect(v.spo2).toBeGreaterThanOrEqual(96);
      expect(v.spo2).toBeLessThan(100);
    }
  });
});
