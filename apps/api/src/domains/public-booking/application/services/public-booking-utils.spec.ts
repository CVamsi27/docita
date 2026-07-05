import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  normalizePhone,
  extractBearerToken,
  resolveClinicByReferralCode,
} from './public-booking-utils';
import type { PublicBookingPersistencePort } from '@/domains/public-booking/application/ports/public-booking-persistence.port';

describe('normalizePhone', () => {
  it('prefixes a bare 10-digit Indian number with +91', () => {
    expect(normalizePhone('9812345678')).toBe('+919812345678');
  });

  it('strips punctuation from a 10-digit number before prefixing', () => {
    expect(normalizePhone('(98123) 45678')).toBe('+919812345678');
  });

  it('adds a + to a 12-digit 91-prefixed number', () => {
    expect(normalizePhone('919812345678')).toBe('+919812345678');
  });

  it('keeps an already-E.164 number that starts with +', () => {
    expect(normalizePhone('+14155550123')).toBe('+14155550123');
  });

  it('falls back to +<digits> for other lengths without a leading +', () => {
    expect(normalizePhone('12345')).toBe('+12345');
  });
});

describe('extractBearerToken', () => {
  it('extracts the token from a well-formed Authorization header', () => {
    expect(extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
  });

  it('is case-insensitive on the scheme and trims surrounding space', () => {
    expect(extractBearerToken('  bearer   tok123  ')).toBe('tok123');
  });

  it('returns null for an undefined header', () => {
    expect(extractBearerToken(undefined)).toBeNull();
  });

  it('returns null for a non-Bearer scheme', () => {
    expect(extractBearerToken('Basic dXNlcjpwYXNz')).toBeNull();
  });
});

describe('resolveClinicByReferralCode', () => {
  const findFirst = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const persistence = {
    clinic: { findFirst },
  } as unknown as PublicBookingPersistencePort;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes the referral code to trimmed uppercase in the lookup', async () => {
    findFirst.mockResolvedValue({
      id: 'clinic_1',
      name: 'Docita Clinic',
      referralCode: 'DOCITA1',
      timezone: 'Asia/Kolkata',
      address: '1 St',
      phone: '+919812345678',
      email: 'c@x.test',
      website: null,
      facilityType: 'CLINIC',
      settings: {},
    });

    await resolveClinicByReferralCode(persistence, '  docita1 ');

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          referralCode: 'DOCITA1',
          active: true,
        }),
      }),
    );
  });

  it('throws NotFoundException when no active clinic matches', async () => {
    findFirst.mockResolvedValue(null);
    await expect(
      resolveClinicByReferralCode(persistence, 'MISSING'),
    ).rejects.toThrow(NotFoundException);
  });

  it('maps a null website to undefined and derives the facility label', async () => {
    findFirst.mockResolvedValue({
      id: 'clinic_2',
      name: 'No Site Clinic',
      referralCode: 'NOSITE',
      timezone: 'Asia/Kolkata',
      address: '2 St',
      phone: '+919800000000',
      email: 'n@x.test',
      website: null,
      facilityType: 'HOSPITAL',
      settings: {},
    });

    const clinic = await resolveClinicByReferralCode(persistence, 'NOSITE');
    expect(clinic.website).toBeUndefined();
    expect(clinic.facilityLabel).toBe('HOSPITAL');
  });
});
