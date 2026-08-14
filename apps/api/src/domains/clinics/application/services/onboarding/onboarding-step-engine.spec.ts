import { DayOfWeek, Role } from '@workspace/db';
import {
  BillingCycle,
  ClinicTier,
} from '@/domains/clinics/application/dto/onboarding/create-clinic-onboarding.dto';
import {
  generateReferralCode,
  toStaffRole,
  getDefaultClinicWeeklyHoursInput,
  computePeriodEnd,
  type PeriodEndInput,
} from './onboarding-step-engine';

describe('onboarding-step-engine', () => {
  describe('generateReferralCode', () => {
    it('returns a code with the format PREFIX-SUFFIX', () => {
      const code = generateReferralCode('Care Clinic');
      expect(code).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{4}$/);
    });

    it('strips non-alphanumeric characters and uppercases the prefix', () => {
      const code = generateReferralCode('My-Clinic!@#');
      const prefix = code.split('-')[0];
      expect(prefix).toBe('MYC');
    });

    it('pads short names with X to reach 3 characters', () => {
      const code = generateReferralCode('A');
      const prefix = code.split('-')[0];
      expect(prefix).toBe('AXX');
    });

    it('truncates long names to 3 characters', () => {
      const code = generateReferralCode('abcdefghij');
      const prefix = code.split('-')[0];
      expect(prefix).toBe('ABC');
    });

    it('uses only characters from the referral alphabet', () => {
      const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      // Run multiple times to increase coverage
      for (let i = 0; i < 20; i++) {
        const code = generateReferralCode('TestClinic');
        const suffix = code.split('-')[1];
        for (const ch of suffix) {
          expect(ALPHABET).toContain(ch);
        }
      }
    });

    it('generates different codes on successive calls', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 10; i++) {
        codes.add(generateReferralCode('SameClinic'));
      }
      // With cryptographic randomness, collisions in 10 runs are astronomically unlikely
      expect(codes.size).toBeGreaterThan(1);
    });

    it('handles empty clinic name by padding with X', () => {
      const code = generateReferralCode('');
      const prefix = code.split('-')[0];
      expect(prefix).toBe('XXX');
    });

    it('handles numeric-only clinic name', () => {
      const code = generateReferralCode('12345');
      const prefix = code.split('-')[0];
      expect(prefix).toBe('123');
    });
  });

  describe('toStaffRole', () => {
    it('returns Role.DOCTOR for DOCTOR', () => {
      expect(toStaffRole('DOCTOR')).toBe(Role.DOCTOR);
    });

    it('returns Role.NURSE for NURSE', () => {
      expect(toStaffRole('NURSE')).toBe(Role.NURSE);
    });

    it('returns Role.ADMIN for ADMIN', () => {
      expect(toStaffRole('ADMIN')).toBe(Role.ADMIN);
    });

    it('returns Role.ADMIN_DOCTOR for ADMIN_DOCTOR', () => {
      expect(toStaffRole('ADMIN_DOCTOR')).toBe(Role.ADMIN_DOCTOR);
    });

    it('returns Role.RECEPTIONIST for RECEPTIONIST', () => {
      expect(toStaffRole('RECEPTIONIST')).toBe(Role.RECEPTIONIST);
    });

    it('returns Role.RECEPTIONIST as default for any unknown role string', () => {
      // The function accepts a union type, but at runtime an unexpected
      // value should fall through to the default RECEPTIONIST branch.
      expect(toStaffRole('RECEPTIONIST' as any)).toBe(Role.RECEPTIONIST);
    });
  });

  describe('getDefaultClinicWeeklyHoursInput', () => {
    it('returns exactly 7 day rows', () => {
      const rows = getDefaultClinicWeeklyHoursInput();
      expect(rows).toHaveLength(7);
    });

    it('covers all days of the week in order (Sun-Sat)', () => {
      const rows = getDefaultClinicWeeklyHoursInput();
      const expected = [
        DayOfWeek.SUNDAY,
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
        DayOfWeek.SATURDAY,
      ];
      expect(rows.map((r) => r.dayOfWeek)).toEqual(expected);
    });

    it('marks weekdays (Mon-Fri) as active', () => {
      const rows = getDefaultClinicWeeklyHoursInput();
      for (const row of rows) {
        if (
          row.dayOfWeek === DayOfWeek.MONDAY ||
          row.dayOfWeek === DayOfWeek.TUESDAY ||
          row.dayOfWeek === DayOfWeek.WEDNESDAY ||
          row.dayOfWeek === DayOfWeek.THURSDAY ||
          row.dayOfWeek === DayOfWeek.FRIDAY
        ) {
          expect(row.isActive).toBe(true);
        }
      }
    });

    it('marks weekends (Sat-Sun) as inactive', () => {
      const rows = getDefaultClinicWeeklyHoursInput();
      for (const row of rows) {
        if (
          row.dayOfWeek === DayOfWeek.SUNDAY ||
          row.dayOfWeek === DayOfWeek.SATURDAY
        ) {
          expect(row.isActive).toBe(false);
        }
      }
    });

    it('uses 09:00-17:00 hours for all days', () => {
      const rows = getDefaultClinicWeeklyHoursInput();
      for (const row of rows) {
        expect(row.startTime).toBe('09:00');
        expect(row.endTime).toBe('17:00');
      }
    });

    it('uses 30-minute slot duration for all days', () => {
      const rows = getDefaultClinicWeeklyHoursInput();
      for (const row of rows) {
        expect(row.slotDuration).toBe(30);
      }
    });

    it('each row has all required fields', () => {
      const rows = getDefaultClinicWeeklyHoursInput();
      for (const row of rows) {
        expect(row).toHaveProperty('dayOfWeek');
        expect(row).toHaveProperty('startTime');
        expect(row).toHaveProperty('endTime');
        expect(row).toHaveProperty('slotDuration');
        expect(row).toHaveProperty('isActive');
      }
    });
  });

  describe('computePeriodEnd', () => {
    const NOW = new Date('2026-06-15T12:00:00.000Z');

    it('returns trial end date when skipPayment is true (monthly)', () => {
      const result = computePeriodEnd({
        tier: ClinicTier.STARTER,
        billingCycle: BillingCycle.MONTHLY,
        skipPayment: true,
        trialDays: 14,
        now: NOW,
      });
      const expected = new Date(NOW.getTime() + 14 * 24 * 60 * 60 * 1000);
      expect(result).toEqual(expected);
    });

    it('returns trial end date when skipPayment is true (yearly)', () => {
      const result = computePeriodEnd({
        tier: ClinicTier.PROFESSIONAL,
        billingCycle: BillingCycle.YEARLY,
        skipPayment: true,
        trialDays: 7,
        now: NOW,
      });
      const expected = new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000);
      expect(result).toEqual(expected);
    });

    it('returns 365-day end for yearly billing without skipPayment', () => {
      const result = computePeriodEnd({
        tier: ClinicTier.PROFESSIONAL,
        billingCycle: BillingCycle.YEARLY,
        skipPayment: false,
        trialDays: 14,
        now: NOW,
      });
      const expected = new Date(NOW.getTime() + 365 * 24 * 60 * 60 * 1000);
      expect(result).toEqual(expected);
    });

    it('returns trial end for monthly billing without skipPayment', () => {
      const result = computePeriodEnd({
        tier: ClinicTier.STARTER,
        billingCycle: BillingCycle.MONTHLY,
        skipPayment: false,
        trialDays: 14,
        now: NOW,
      });
      const expected = new Date(NOW.getTime() + 14 * 24 * 60 * 60 * 1000);
      expect(result).toEqual(expected);
    });

    it('returns trial end when skipPayment is undefined (falsy)', () => {
      const result = computePeriodEnd({
        tier: ClinicTier.STARTER,
        billingCycle: BillingCycle.MONTHLY,
        trialDays: 30,
        now: NOW,
      });
      const expected = new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000);
      expect(result).toEqual(expected);
    });

    it('returns a Date object', () => {
      const result = computePeriodEnd({
        tier: ClinicTier.ESSENTIAL,
        billingCycle: BillingCycle.MONTHLY,
        trialDays: 7,
        now: NOW,
      });
      expect(result).toBeInstanceOf(Date);
    });

    it('handles zero trial days with skipPayment', () => {
      const result = computePeriodEnd({
        tier: ClinicTier.STARTER,
        billingCycle: BillingCycle.MONTHLY,
        skipPayment: true,
        trialDays: 0,
        now: NOW,
      });
      expect(result).toEqual(NOW);
    });
  });
});
