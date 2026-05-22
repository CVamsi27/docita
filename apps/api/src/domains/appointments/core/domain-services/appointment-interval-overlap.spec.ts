import { describe, expect, it } from '@jest/globals';
import {
  findFirstSchedulingConflict,
  intervalsOverlap,
} from './appointment-interval-overlap';

describe('appointment-interval-overlap', () => {
  describe('intervalsOverlap', () => {
    it('detects overlapping ranges', () => {
      const aStart = new Date('2026-05-19T10:00:00.000Z');
      const aEnd = new Date('2026-05-19T11:00:00.000Z');
      const bStart = new Date('2026-05-19T10:30:00.000Z');
      const bEnd = new Date('2026-05-19T11:30:00.000Z');
      expect(intervalsOverlap(aStart, aEnd, bStart, bEnd)).toBe(true);
    });

    it('returns false for adjacent non-overlapping ranges', () => {
      const aStart = new Date('2026-05-19T10:00:00.000Z');
      const aEnd = new Date('2026-05-19T11:00:00.000Z');
      const bStart = new Date('2026-05-19T11:00:00.000Z');
      const bEnd = new Date('2026-05-19T12:00:00.000Z');
      expect(intervalsOverlap(aStart, aEnd, bStart, bEnd)).toBe(false);
    });
  });

  describe('findFirstSchedulingConflict', () => {
    const existing = [
      {
        id: 'appt-1',
        startTime: new Date('2026-05-19T10:00:00.000Z'),
        endTime: new Date('2026-05-19T11:00:00.000Z'),
      },
      {
        id: 'appt-2',
        startTime: new Date('2026-05-19T14:00:00.000Z'),
        endTime: new Date('2026-05-19T15:00:00.000Z'),
      },
    ];

    it('returns the first conflicting slot', () => {
      const conflict = findFirstSchedulingConflict(
        new Date('2026-05-19T10:30:00.000Z'),
        new Date('2026-05-19T11:30:00.000Z'),
        existing,
      );
      expect(conflict?.id).toBe('appt-1');
    });

    it('skips the excluded appointment id', () => {
      const conflict = findFirstSchedulingConflict(
        new Date('2026-05-19T10:15:00.000Z'),
        new Date('2026-05-19T10:45:00.000Z'),
        existing,
        'appt-1',
      );
      expect(conflict).toBeUndefined();
    });
  });
});
