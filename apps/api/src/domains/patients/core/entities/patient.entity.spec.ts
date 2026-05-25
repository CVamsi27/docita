import { describe, expect, it } from '@jest/globals';
import { Patient } from './patient.entity';

describe('Patient entity', () => {
  describe('normalizeMrn', () => {
    it('trims whitespace and drops empty strings', () => {
      expect(Patient.normalizeMrn('  MRN-42  ')).toBe('MRN-42');
      expect(Patient.normalizeMrn('   ')).toBeUndefined();
      expect(Patient.normalizeMrn(undefined)).toBeUndefined();
    });
  });

  describe('normalizeTagLabel', () => {
    it('trims tag labels', () => {
      expect(Patient.normalizeTagLabel('  VIP  ')).toBe('VIP');
    });
  });

  describe('isTagLabelValid', () => {
    it('rejects blank tags', () => {
      expect(Patient.isTagLabelValid('')).toBe(false);
      expect(Patient.isTagLabelValid('   ')).toBe(false);
      expect(Patient.isTagLabelValid('Follow-up')).toBe(true);
    });
  });
});
