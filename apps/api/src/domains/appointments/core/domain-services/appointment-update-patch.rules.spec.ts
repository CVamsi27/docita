import { describe, expect, it } from '@jest/globals';
import { AppointmentStatus as PrismaAppointmentStatus } from '@workspace/db';
import {
  coerceAppointmentDate,
  toPrismaAppointmentUpdate,
} from './appointment-update-patch.rules';

describe('appointment-update-patch.rules', () => {
  describe('coerceAppointmentDate', () => {
    const fallback = new Date('2026-05-19T10:00:00.000Z');

    it('returns fallback when candidate is nullish', () => {
      expect(coerceAppointmentDate(null, fallback).toISOString()).toBe(
        fallback.toISOString(),
      );
    });

    it('parses ISO strings', () => {
      const parsed = coerceAppointmentDate(
        '2026-06-01T08:30:00.000Z',
        fallback,
      );
      expect(parsed.toISOString()).toBe('2026-06-01T08:30:00.000Z');
    });

    it('returns fallback for invalid strings', () => {
      expect(coerceAppointmentDate('not-a-date', fallback).toISOString()).toBe(
        fallback.toISOString(),
      );
    });
  });

  describe('toPrismaAppointmentUpdate', () => {
    it('maps domain status values to Prisma enums', () => {
      expect(
        toPrismaAppointmentUpdate({ status: 'completed' }).status,
      ).toBe(PrismaAppointmentStatus.COMPLETED);
      expect(
        toPrismaAppointmentUpdate({ status: 'checked-in' }).status,
      ).toBe(PrismaAppointmentStatus.CONFIRMED);
    });

    it('omits status when not provided', () => {
      expect(toPrismaAppointmentUpdate({ notes: 'Follow up' }).status).toBe(
        undefined,
      );
    });
  });
});
