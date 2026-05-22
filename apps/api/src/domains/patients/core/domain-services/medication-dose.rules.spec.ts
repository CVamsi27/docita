import { describe, expect, it } from '@jest/globals';
import { parseDosesPerDay, parseDurationDays } from './medication-dose.rules';

describe('medication-dose.rules', () => {
  describe('parseDosesPerDay', () => {
    it('uses sig code when present', () => {
      expect(parseDosesPerDay('BID', '')).toBe(2);
    });

    it('parses frequency text when sig code is absent', () => {
      expect(parseDosesPerDay(null, 'twice daily')).toBe(2);
    });

    it('returns null for unrecognized frequency', () => {
      expect(parseDosesPerDay(null, 'as needed')).toBeNull();
    });
  });

  describe('parseDurationDays', () => {
    it('converts weeks to days', () => {
      expect(parseDurationDays('2 weeks')).toBe(14);
    });

    it('returns null when duration cannot be parsed', () => {
      expect(parseDurationDays('ongoing')).toBeNull();
    });
  });
});
