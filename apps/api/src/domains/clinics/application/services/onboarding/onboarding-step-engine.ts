/**
 * Pure deterministic state-machine helpers for clinic onboarding.
 * No @Injectable, no side-effects — only plain functions.
 */
import { randomBytes } from 'crypto';
import { DayOfWeek, Role } from '@workspace/db';
import {
  BillingCycle,
  ClinicTier,
} from '@/domains/clinics/application/dto/onboarding/create-clinic-onboarding.dto';

const REFERRAL_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateReferralCode(clinicName: string): string {
  const prefix = clinicName
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, 'X');
  // Use cryptographic randomness — Math.random produces predictable
  // suffixes that allow referral-code enumeration / fraud.
  const bytes = randomBytes(4);
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += REFERRAL_ALPHABET[bytes[i] % REFERRAL_ALPHABET.length];
  }
  return `${prefix}-${suffix}`;
}

export function toStaffRole(
  role: 'DOCTOR' | 'NURSE' | 'RECEPTIONIST' | 'ADMIN' | 'ADMIN_DOCTOR',
): Role {
  if (role === 'DOCTOR') return Role.DOCTOR;
  if (role === 'NURSE') return Role.NURSE;
  if (role === 'ADMIN') return Role.ADMIN;
  if (role === 'ADMIN_DOCTOR') return Role.ADMIN_DOCTOR;
  return Role.RECEPTIONIST;
}

/**
 * Returns the default Mon–Fri 09:00–17:00 weekly schedule rows when
 * onboarding does not supply explicit rows.
 */
export function getDefaultClinicWeeklyHoursInput(): Array<{
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
}> {
  const weekend = new Set<DayOfWeek>([DayOfWeek.SATURDAY, DayOfWeek.SUNDAY]);
  const allDays: DayOfWeek[] = [
    DayOfWeek.SUNDAY,
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
  ];
  return allDays.map((dayOfWeek) => ({
    dayOfWeek,
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: 30,
    isActive: !weekend.has(dayOfWeek),
  }));
}

export interface PeriodEndInput {
  tier: ClinicTier;
  billingCycle: BillingCycle;
  skipPayment?: boolean;
  trialDays: number;
  now: Date;
}

/**
 * Computes the subscription period end date based on tier / billing cycle.
 */
export function computePeriodEnd({
  billingCycle,
  trialDays,
  now,
}: PeriodEndInput): Date {
  if (billingCycle === BillingCycle.YEARLY) {
    return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  }
  const trialMs = trialDays * 24 * 60 * 60 * 1000;
  return new Date(now.getTime() + trialMs);
}
