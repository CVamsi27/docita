import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  PublicBookingTokenService,
  PUBLIC_BOOKING_JWT_PURPOSE,
  type PublicBookingTokenPayload,
} from './public-booking-token.service';
import type { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { JWT_AUDIENCE_PUBLIC_BOOKING } from '@/shared/modules/auth/auth/jwt-audience';

const JWT_SECRET = 'test-public-booking-secret';

const validPayload: PublicBookingTokenPayload = {
  purpose: PUBLIC_BOOKING_JWT_PURPOSE,
  clinicId: 'clinic_1',
  patientId: 'patient_1',
  phoneNumber: '+919812345678',
};

describe('PublicBookingTokenService', () => {
  let service: PublicBookingTokenService;
  let jwt: JwtService;

  beforeEach(() => {
    jwt = new JwtService({});
    const appConfig = {
      getJwtSecret: () => JWT_SECRET,
    } as unknown as AppConfigService;
    service = new PublicBookingTokenService(jwt, appConfig);
  });

  it('signs and verifies a valid booking token round-trip', () => {
    const token = service.sign(validPayload);
    const decoded = service.verify(token);

    expect(decoded.clinicId).toBe('clinic_1');
    expect(decoded.patientId).toBe('patient_1');
    expect(decoded.phoneNumber).toBe('+919812345678');
    expect(decoded.purpose).toBe(PUBLIC_BOOKING_JWT_PURPOSE);
  });

  it('rejects a token signed with a different secret', () => {
    const forged = jwt.sign(
      { ...validPayload },
      { secret: 'attacker-secret', audience: JWT_AUDIENCE_PUBLIC_BOOKING },
    );
    expect(() => service.verify(forged)).toThrow(UnauthorizedException);
  });

  it('rejects a token with the wrong audience', () => {
    const wrongAudience = jwt.sign(
      { ...validPayload },
      { secret: JWT_SECRET, audience: 'some-other-audience' },
    );
    expect(() => service.verify(wrongAudience)).toThrow(UnauthorizedException);
  });

  it('rejects a token whose purpose claim is not public_booking', () => {
    const token = jwt.sign(
      { ...validPayload, purpose: 'password_reset' },
      { secret: JWT_SECRET, audience: JWT_AUDIENCE_PUBLIC_BOOKING },
    );
    expect(() => service.verify(token)).toThrow(UnauthorizedException);
  });

  it('rejects a token missing a required identity claim', () => {
    const token = jwt.sign(
      {
        purpose: PUBLIC_BOOKING_JWT_PURPOSE,
        clinicId: 'clinic_1',
        patientId: 'patient_1',
        // phoneNumber omitted
      },
      { secret: JWT_SECRET, audience: JWT_AUDIENCE_PUBLIC_BOOKING },
    );
    expect(() => service.verify(token)).toThrow(UnauthorizedException);
  });

  it('rejects an expired token', () => {
    const expired = jwt.sign(
      { ...validPayload },
      {
        secret: JWT_SECRET,
        audience: JWT_AUDIENCE_PUBLIC_BOOKING,
        expiresIn: '-1s',
      },
    );
    expect(() => service.verify(expired)).toThrow(UnauthorizedException);
  });

  it('rejects a structurally invalid token', () => {
    expect(() => service.verify('not-a-jwt')).toThrow(UnauthorizedException);
  });
});
