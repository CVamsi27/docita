import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { PatientPortalAuthService } from './patient-portal-auth.service';
import { PatientPortalAuthCommandService } from './patient-portal-auth-command.service';
import { PATIENT_PORTAL_REPOSITORY_TOKEN } from '@/domains/patient-portal/core/repositories/patient-portal.repository.interface';
import { WHATSAPP_CLIENT_TOKEN } from '@/domains/whatsapp/application/ports/whatsapp-client.port';
import { AuthService } from '@/shared/modules/auth/auth/auth.service';
import { clockPortTestProvider } from '@/test-utils';
import * as bcrypt from 'bcrypt';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockImplementation(async () => 'hashed'),
  compare: jest.fn(),
}));

jest.mock('nanoid', () => ({
  nanoid: jest.fn().mockReturnValue('nanoid123'),
}));

jest.mock('crypto', () => ({
  ...(jest.requireActual('crypto') as Record<string, unknown>),
  randomInt: jest.fn().mockReturnValue(123456),
}));

describe('PatientPortalAuthService', () => {
  let service: PatientPortalAuthService;
  let repository: Record<
    string,
    jest.Mock<(...args: unknown[]) => Promise<unknown>>
  >;

  beforeEach(async () => {
    jest.mocked(bcrypt.compare).mockReset();

    repository = {
      findPatientByUserId: jest.fn(),
      findPatientByPhone: jest.fn(),
      findPatientWithUserByPhone: jest.fn(),
      getPatientSummary: jest.fn(),
      getPatientProfile: jest.fn(),
      updatePatient: jest.fn(),
      getUpcomingAppointments: jest.fn(),
      getAppointments: jest.fn(),
      getAppointmentById: jest.fn(),
      getPrescriptions: jest.fn(),
      getPrescriptionById: jest.fn(),
      getInvoices: jest.fn(),
      getActivePrescriptions: jest.fn(),
      getOutstandingInvoices: jest.fn(),
      invalidateOtps: jest.fn(),
      createOtp: jest.fn(),
      findActiveOtp: jest.fn(),
      tryConsumeOtpAttempt: jest.fn(),
      tryMarkOtpUsed: jest.fn(),
      createPortalUser: jest.fn(),
      linkUserToPatient: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientPortalAuthService,
        PatientPortalAuthCommandService,
        {
          provide: PATIENT_PORTAL_REPOSITORY_TOKEN,
          useValue: repository,
        },
        {
          provide: WHATSAPP_CLIENT_TOKEN,
          useValue: { sendMessage: jest.fn() },
        },
        clockPortTestProvider({
          now: () => new Date('2026-05-19T12:00:00.000Z'),
        }),
        {
          provide: AuthService,
          useValue: {
            login: jest
              .fn()
              .mockImplementation(async () => ({ access_token: 'jwt-token' })),
          },
        },
      ],
    }).compile();

    service = module.get<PatientPortalAuthService>(PatientPortalAuthService);
  });

  describe('requestOtp', () => {
    it('returns a generic success message regardless of patient existence', async () => {
      repository.findPatientByPhone.mockResolvedValue(null);

      const result = await service.requestOtp('+919876543210');

      expect(result.message).toBeTruthy();
      expect(result.expiresInSeconds).toBe(600);
    });

    it('creates an OTP record when patient exists', async () => {
      repository.findPatientByPhone.mockResolvedValue({
        id: 'patient-1',
        phoneNumber: '+919876543210',
      });
      repository.invalidateOtps.mockResolvedValue(undefined);
      repository.createOtp.mockResolvedValue({});

      await service.requestOtp('+919876543210');

      expect(repository.createOtp).toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    it('throws UnauthorizedException when OTP record not found', async () => {
      repository.findActiveOtp.mockResolvedValue(null);

      await expect(
        service.verifyOtp('+919876543210', '123456'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when max attempts exceeded', async () => {
      repository.findActiveOtp.mockResolvedValue({
        id: 'otp-1',
        attempts: 3,
        otpHash: 'hashed',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        usedAt: null,
      });
      // Atomic consume returns false once the row is at-or-over the cap,
      // even if the in-memory OTP record was loaded before the cap was hit.
      repository.tryConsumeOtpAttempt.mockResolvedValue(false);

      await expect(
        service.verifyOtp('+919876543210', '123456'),
      ).rejects.toThrow(UnauthorizedException);
    });

    const activeOtp = {
      id: 'otp-1',
      attempts: 0,
      otpHash: 'hashed',
      expiresAt: new Date('2026-05-19T12:10:00.000Z'),
      usedAt: null,
    };

    const portalUser = {
      id: 'user-1',
      email: 'portal@test.com',
      password: 'hashed',
      role: 'PATIENT' as const,
      name: 'Test Patient',
    };

    it('issues a session when the single-use OTP claim wins', async () => {
      repository.findActiveOtp.mockResolvedValue({ ...activeOtp });
      repository.tryConsumeOtpAttempt.mockResolvedValue(true);
      jest.mocked(bcrypt.compare).mockImplementation(async () => true);
      repository.tryMarkOtpUsed.mockResolvedValue(true);
      repository.findPatientWithUserByPhone.mockResolvedValue({
        id: 'patient-1',
        user: portalUser,
      });

      const result = await service.verifyOtp('+919876543210', '123456');

      expect(repository.tryMarkOtpUsed).toHaveBeenCalledWith('otp-1');
      expect(result).toEqual({ access_token: 'jwt-token' });
    });

    it('rejects the loser of a concurrent valid OTP claim without issuing a session', async () => {
      repository.findActiveOtp.mockResolvedValue({ ...activeOtp });
      repository.tryConsumeOtpAttempt.mockResolvedValue(true);
      jest.mocked(bcrypt.compare).mockImplementation(async () => true);
      repository.tryMarkOtpUsed.mockResolvedValue(false);

      await expect(
        service.verifyOtp('+919876543210', '123456'),
      ).rejects.toThrow(UnauthorizedException);

      expect(repository.tryMarkOtpUsed).toHaveBeenCalledWith('otp-1');
      expect(repository.findPatientWithUserByPhone).not.toHaveBeenCalled();
    });

    it('throws when the cap has not been hit yet but the atomic consume refuses', async () => {
      // Simulates a concurrent caller that incremented the row between
      // our findActiveOtp and our consume. The pre-fix implementation
      // would still have allowed bcrypt.compare to run; the new flow
      // refuses atomically.
      repository.findActiveOtp.mockResolvedValue({
        id: 'otp-1',
        attempts: 2,
        otpHash: 'hashed',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        usedAt: null,
      });
      repository.tryConsumeOtpAttempt.mockResolvedValue(false);

      await expect(
        service.verifyOtp('+919876543210', '123456'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
