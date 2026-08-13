import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PublicBookingCreationService } from './public-booking-creation.service';
import { PUBLIC_BOOKING_JWT_PURPOSE } from './public-booking-token.service';
import {
  PUBLIC_BOOKING_PERSISTENCE_PORT,
  type PublicBookingPersistencePort,
} from '@/domains/public-booking/application/ports/public-booking-persistence.port';
import { PatientService } from '@/domains/patients/application/services/patient.service';
import {
  WHATSAPP_CLIENT_TOKEN,
  type IWhatsAppClient,
} from '@/domains/whatsapp/application/ports/whatsapp-client.port';
import { PublicBookingTokenService } from './public-booking-token.service';
import { TurnstileVerifyService } from '@/shared/modules/turnstile/turnstile-verify.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { CLOCK_PORT } from '@/shared/common/ports/clock.port';

const CLINIC = {
  id: 'clinic-1',
  name: 'Docita Clinic',
  referralCode: 'DOCITA1',
  timezone: 'Asia/Kolkata',
  address: '1 St',
  phone: '+919812345678',
  email: 'c@x.test',
  website: null,
  facilityType: 'CLINIC',
  settings: {},
};

const FIXED_NOW = new Date('2026-05-01T00:00:00.000Z');

type MockFn = jest.Mock<(...args: unknown[]) => Promise<unknown>>;
type SyncMockFn = jest.Mock<(...args: unknown[]) => unknown>;

describe('PublicBookingCreationService', () => {
  let service: PublicBookingCreationService;
  let persistence: Record<string, Record<string, MockFn>>;
  let patientService: { findByClinicIdAndPhoneNumber: MockFn };
  let whatsappClient: { sendMessage: MockFn };
  let bookingTokenService: { sign: SyncMockFn; verify: SyncMockFn };
  let turnstile: { verifyToken: MockFn };
  let appConfig: { isTurnstileEnforced: SyncMockFn };
  let clock: { now: SyncMockFn };

  beforeEach(async () => {
    persistence = {
      clinic: {
        findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      },
      publicBookingOtp: {
        deleteMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        updateMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      },
      appointment: {
        findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      },
      patient: {
        findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      },
    };
    patientService = {
      findByClinicIdAndPhoneNumber:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    };
    whatsappClient = {
      sendMessage: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    };
    bookingTokenService = {
      sign: jest.fn<(...args: unknown[]) => unknown>(),
      verify: jest.fn<(...args: unknown[]) => unknown>(),
    };
    turnstile = {
      verifyToken: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    };
    appConfig = {
      isTurnstileEnforced: jest.fn<(...args: unknown[]) => unknown>(),
    };
    clock = {
      now: jest.fn<(...args: unknown[]) => unknown>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicBookingCreationService,
        {
          provide: PUBLIC_BOOKING_PERSISTENCE_PORT,
          useValue: persistence as unknown as PublicBookingPersistencePort,
        },
        { provide: PatientService, useValue: patientService },
        {
          provide: WHATSAPP_CLIENT_TOKEN,
          useValue: whatsappClient as unknown as IWhatsAppClient,
        },
        { provide: PublicBookingTokenService, useValue: bookingTokenService },
        { provide: TurnstileVerifyService, useValue: turnstile },
        { provide: AppConfigService, useValue: appConfig },
        { provide: CLOCK_PORT, useValue: clock },
      ],
    }).compile();

    service = module.get<PublicBookingCreationService>(
      PublicBookingCreationService,
    );
    persistence.clinic.findFirst.mockResolvedValue(CLINIC);
    turnstile.verifyToken.mockResolvedValue(true);
    appConfig.isTurnstileEnforced.mockReturnValue(false);
    clock.now.mockReturnValue(FIXED_NOW);
    whatsappClient.sendMessage.mockResolvedValue({ ok: true });
  });

  describe('checkPhoneStatus', () => {
    it('throws UnauthorizedException when turnstile is enforced and verification fails', async () => {
      appConfig.isTurnstileEnforced.mockReturnValue(true);
      turnstile.verifyToken.mockResolvedValue(false);

      await expect(
        service.checkPhoneStatus('docita1', {
          phoneNumber: '9812345678',
          turnstileToken: 'bad-token',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('looks up the patient with the normalized E.164 phone number', async () => {
      patientService.findByClinicIdAndPhoneNumber.mockResolvedValue(null);

      const result = await service.checkPhoneStatus('docita1', {
        phoneNumber: '(98123) 45678',
      });

      expect(patientService.findByClinicIdAndPhoneNumber).toHaveBeenCalledWith(
        'clinic-1',
        '+919812345678',
      );
      expect(result).toEqual({ requiresOtp: false });
    });

    it('reports requiresOtp when the phone is on file at the clinic', async () => {
      patientService.findByClinicIdAndPhoneNumber.mockResolvedValue({
        id: 'patient-1',
      });

      const result = await service.checkPhoneStatus('docita1', {
        phoneNumber: '9812345678',
      });
      expect(result).toEqual({ requiresOtp: true });
    });
  });

  describe('requestOtp', () => {
    it('never issues an OTP for a number not on file (privacy-preserving)', async () => {
      patientService.findByClinicIdAndPhoneNumber.mockResolvedValue(null);

      const result = await service.requestOtp('docita1', {
        phoneNumber: '9999999999',
      });

      expect(result).toEqual({
        message:
          'If this number is registered at this clinic, a verification code has been sent.',
        expiresInSeconds: 600,
      });
      expect(persistence.publicBookingOtp.create).not.toHaveBeenCalled();
      expect(whatsappClient.sendMessage).not.toHaveBeenCalled();
    });

    it('clears stale OTPs, stores a hashed 10-minute OTP, and sends it via WhatsApp', async () => {
      patientService.findByClinicIdAndPhoneNumber.mockResolvedValue({
        id: 'patient-1',
      });

      const result = await service.requestOtp('docita1', {
        phoneNumber: '9812345678',
      });

      expect(persistence.publicBookingOtp.deleteMany).toHaveBeenCalledWith({
        where: {
          clinicId: 'clinic-1',
          phoneNumber: '+919812345678',
          usedAt: null,
        },
      });
      expect(persistence.publicBookingOtp.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clinicId: 'clinic-1',
          phoneNumber: '+919812345678',
          expiresAt: new Date(FIXED_NOW.getTime() + 10 * 60 * 1000),
        }),
      });
      const createCall = (persistence.publicBookingOtp.create as MockFn).mock
        .calls[0]?.[0] as {
        data: { otpHash: string };
      };
      expect(createCall.data.otpHash).toMatch(/^\$2/);
      expect(createCall.data.otpHash).not.toBe('123456');

      expect(whatsappClient.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+919812345678',
          templateName: 'patient_login_otp',
          languageCode: 'en',
        }),
      );
      expect(result.expiresInSeconds).toBe(600);
    });

    it('still returns the generic message when the WhatsApp send fails', async () => {
      patientService.findByClinicIdAndPhoneNumber.mockResolvedValue({
        id: 'patient-1',
      });
      whatsappClient.sendMessage.mockRejectedValue(new Error('network down'));

      const result = await service.requestOtp('docita1', {
        phoneNumber: '9812345678',
      });
      expect(result.message).toContain('verification code has been sent');
    });
  });

  describe('verifyOtp', () => {
    const otpRecord = {
      id: 'otp-1',
      clinicId: 'clinic-1',
      phoneNumber: '+919812345678',
      otpHash: '',
      expiresAt: new Date(FIXED_NOW.getTime() + 60_000),
      usedAt: null,
      createdAt: FIXED_NOW,
    };

    it('rejects a missing or expired OTP record', async () => {
      persistence.publicBookingOtp.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyOtp('docita1', {
          phoneNumber: '9812345678',
          otp: '123456',
        }),
      ).rejects.toThrow('Invalid or expired code');
      expect(persistence.publicBookingOtp.findFirst).toHaveBeenCalledWith({
        where: {
          clinicId: 'clinic-1',
          phoneNumber: '+919812345678',
          expiresAt: { gt: FIXED_NOW },
          usedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('rejects when the atomic attempt cap has been reached', async () => {
      persistence.publicBookingOtp.findFirst.mockResolvedValue(otpRecord);
      persistence.publicBookingOtp.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.verifyOtp('docita1', {
          phoneNumber: '9812345678',
          otp: '123456',
        }),
      ).rejects.toThrow('Too many attempts. Please request a new code.');
      expect(persistence.publicBookingOtp.updateMany).toHaveBeenCalledWith({
        where: { id: 'otp-1', attempts: { lt: 3 } },
        data: { attempts: { increment: 1 } },
      });
    });

    it('rejects an incorrect code', async () => {
      persistence.publicBookingOtp.findFirst.mockResolvedValue(otpRecord);
      persistence.publicBookingOtp.updateMany.mockResolvedValue({ count: 1 });
      persistence.publicBookingOtp.findUnique.mockResolvedValue({
        ...otpRecord,
        otpHash: await bcrypt.hash('654321', 4),
      });

      await expect(
        service.verifyOtp('docita1', {
          phoneNumber: '9812345678',
          otp: '123456',
        }),
      ).rejects.toThrow('Invalid code');
    });

    it('marks the OTP used and returns a signed booking token for a valid code', async () => {
      const otpHash = await bcrypt.hash('123456', 4);
      persistence.publicBookingOtp.findFirst.mockResolvedValue(otpRecord);
      persistence.publicBookingOtp.updateMany.mockResolvedValue({ count: 1 });
      persistence.publicBookingOtp.findUnique.mockResolvedValue({
        ...otpRecord,
        otpHash,
      });
      patientService.findByClinicIdAndPhoneNumber.mockResolvedValue({
        id: 'patient-1',
        toPlain: () => ({
          firstName: 'Asha',
          lastName: 'Kumar',
          email: 'asha@example.com',
        }),
      });
      bookingTokenService.sign.mockReturnValue('signed-token');

      const result = await service.verifyOtp('docita1', {
        phoneNumber: '9812345678',
        otp: '123456',
      });

      expect(persistence.publicBookingOtp.update).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
        data: { usedAt: FIXED_NOW },
      });
      expect(bookingTokenService.sign).toHaveBeenCalledWith({
        purpose: PUBLIC_BOOKING_JWT_PURPOSE,
        clinicId: 'clinic-1',
        patientId: 'patient-1',
        phoneNumber: '+919812345678',
      });
      expect(result).toEqual({
        bookingVerificationToken: 'signed-token',
        patient: {
          firstName: 'Asha',
          lastName: 'Kumar',
          email: 'asha@example.com',
        },
      });
    });

    it('rejects a valid code when the patient is no longer on file', async () => {
      const otpHash = await bcrypt.hash('123456', 4);
      persistence.publicBookingOtp.findFirst.mockResolvedValue(otpRecord);
      persistence.publicBookingOtp.updateMany.mockResolvedValue({ count: 1 });
      persistence.publicBookingOtp.findUnique.mockResolvedValue({
        ...otpRecord,
        otpHash,
      });
      patientService.findByClinicIdAndPhoneNumber.mockResolvedValue(null);

      await expect(
        service.verifyOtp('docita1', {
          phoneNumber: '9812345678',
          otp: '123456',
        }),
      ).rejects.toThrow('Patient not found');
    });
  });

  describe('getBookingContext', () => {
    it('rejects a missing Authorization header', async () => {
      await expect(
        service.getBookingContext('docita1', undefined),
      ).rejects.toThrow('Verification required');
    });

    it('rejects a token issued for a different clinic', async () => {
      bookingTokenService.verify.mockReturnValue({
        purpose: PUBLIC_BOOKING_JWT_PURPOSE,
        clinicId: 'clinic-other',
        patientId: 'patient-1',
        phoneNumber: '+919812345678',
      });

      await expect(
        service.getBookingContext('docita1', 'Bearer tok'),
      ).rejects.toThrow('Invalid verification context');
    });

    it('maps the recent appointments with status normalization and patientSince', async () => {
      bookingTokenService.verify.mockReturnValue({
        purpose: PUBLIC_BOOKING_JWT_PURPOSE,
        clinicId: 'clinic-1',
        patientId: 'patient-1',
        phoneNumber: '+919812345678',
      });
      persistence.appointment.findMany.mockResolvedValue([
        {
          id: 'appt-1',
          startTime: new Date('2026-04-30T10:00:00.000Z'),
          endTime: new Date('2026-04-30T10:30:00.000Z'),
          status: 'RESCHEDULING',
          doctor: { name: 'Dr Asha' },
        },
        {
          id: 'appt-2',
          startTime: new Date('2026-04-01T10:00:00.000Z'),
          endTime: new Date('2026-04-01T10:30:00.000Z'),
          status: 'BOOKED',
          doctor: { name: 'Dr Ram' },
        },
      ]);
      persistence.patient.findFirst.mockResolvedValue({
        id: 'patient-1',
        clinicId: 'clinic-1',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      });

      const result = await service.getBookingContext('docita1', 'Bearer tok');

      expect(persistence.appointment.findMany).toHaveBeenCalledWith({
        where: { clinicId: 'clinic-1', patientId: 'patient-1' },
        orderBy: { startTime: 'desc' },
        take: 5,
        select: {
          id: true,
          startTime: true,
          endTime: true,
          status: true,
          doctor: { select: { name: true } },
        },
      });
      expect(result).toEqual({
        appointments: [
          {
            id: 'appt-1',
            startTime: '2026-04-30T10:00:00.000Z',
            endTime: '2026-04-30T10:30:00.000Z',
            doctorName: 'Dr Asha',
            status: 'confirmed',
          },
          {
            id: 'appt-2',
            startTime: '2026-04-01T10:00:00.000Z',
            endTime: '2026-04-01T10:30:00.000Z',
            doctorName: 'Dr Ram',
            status: 'booked',
          },
        ],
        patientSince: '2025-01-01T00:00:00.000Z',
      });
    });
  });
});
