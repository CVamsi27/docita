import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DPDP_NOTICE_VERSION } from '@workspace/types';
import { PublicBookingSubmitService } from './public-booking-submit.service';
import { PublicBookingSlotsService } from './public-booking-slots.service';
import { PUBLIC_BOOKING_JWT_PURPOSE } from './public-booking-token.service';
import {
  PUBLIC_BOOKING_PERSISTENCE_PORT,
  type PublicBookingPersistencePort,
} from '@/domains/public-booking/application/ports/public-booking-persistence.port';
import { PatientService } from '@/domains/patients/application/services/patient.service';
import { AppointmentRequestService } from '@/domains/appointments/application/services/appointment-request.service';
import { PublicBookingTokenService } from './public-booking-token.service';
import { TurnstileVerifyService } from '@/shared/modules/turnstile/turnstile-verify.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { ConsentCommandService } from '@/shared/modules/compliance/consent-command.service';

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

const VALID_TOKEN_PAYLOAD = {
  purpose: PUBLIC_BOOKING_JWT_PURPOSE,
  clinicId: 'clinic-1',
  patientId: 'patient-1',
  phoneNumber: '+919812345678',
};

function baseBody(overrides: Record<string, unknown> = {}) {
  return {
    phoneNumber: '9812345678',
    firstName: 'Asha',
    lastName: 'Kumar',
    dateOfBirth: '1990-01-01',
    email: 'asha@example.com',
    slotCalendarDate: '2026-05-01',
    turnstileToken: 'tok',
    dpdpConsent: {
      accepted: true,
      noticeVersion: DPDP_NOTICE_VERSION,
    },
    ...overrides,
  };
}

type MockFn = jest.Mock<(...args: unknown[]) => Promise<unknown>>;
type SyncMockFn = jest.Mock<(...args: unknown[]) => unknown>;

describe('PublicBookingSubmitService', () => {
  let service: PublicBookingSubmitService;
  let persistence: Record<string, Record<string, MockFn>>;
  let patientService: {
    findByClinicIdAndPhoneNumber: MockFn;
    updatePatient: MockFn;
    createPatient: MockFn;
  };
  let appointmentRequestService: { createPatientRequest: MockFn };
  let bookingTokenService: { verify: SyncMockFn };
  let turnstile: { verifyToken: MockFn };
  let appConfig: { isTurnstileEnforced: SyncMockFn };
  let consentCompliance: { recordDpdpNoticeConsent: MockFn };
  let slotsService: { assertRequestedSlotIsPubliclyBookable: MockFn };

  beforeEach(async () => {
    persistence = {
      clinic: {
        findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      },
    };
    patientService = {
      findByClinicIdAndPhoneNumber:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      updatePatient: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      createPatient: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    };
    appointmentRequestService = {
      createPatientRequest: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    };
    bookingTokenService = {
      verify: jest.fn<(...args: unknown[]) => unknown>(),
    };
    turnstile = {
      verifyToken: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    };
    appConfig = {
      isTurnstileEnforced: jest.fn<(...args: unknown[]) => unknown>(),
    };
    consentCompliance = {
      recordDpdpNoticeConsent:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    };
    slotsService = {
      assertRequestedSlotIsPubliclyBookable:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicBookingSubmitService,
        {
          provide: PUBLIC_BOOKING_PERSISTENCE_PORT,
          useValue: persistence as unknown as PublicBookingPersistencePort,
        },
        { provide: PatientService, useValue: patientService },
        {
          provide: AppointmentRequestService,
          useValue: appointmentRequestService,
        },
        { provide: PublicBookingTokenService, useValue: bookingTokenService },
        { provide: TurnstileVerifyService, useValue: turnstile },
        { provide: AppConfigService, useValue: appConfig },
        { provide: ConsentCommandService, useValue: consentCompliance },
        { provide: PublicBookingSlotsService, useValue: slotsService },
      ],
    }).compile();

    service = module.get<PublicBookingSubmitService>(
      PublicBookingSubmitService,
    );
    persistence.clinic.findFirst.mockResolvedValue(CLINIC);
    turnstile.verifyToken.mockResolvedValue(true);
    appConfig.isTurnstileEnforced.mockReturnValue(false);
    patientService.findByClinicIdAndPhoneNumber.mockResolvedValue(null);
    patientService.createPatient.mockResolvedValue({ id: 'patient-new' });
    appointmentRequestService.createPatientRequest.mockResolvedValue({
      id: 'request-1',
    });
    slotsService.assertRequestedSlotIsPubliclyBookable.mockResolvedValue(
      undefined,
    );
  });

  it('throws UnauthorizedException when turnstile is enforced and verification fails', async () => {
    appConfig.isTurnstileEnforced.mockReturnValue(true);
    turnstile.verifyToken.mockResolvedValue(false);

    await expect(
      service.submitRequest('docita1', baseBody(), undefined),
    ).rejects.toThrow(UnauthorizedException);
  });

  describe('new patient registration', () => {
    it('creates the patient with normalized phone, records DPDP consent, and creates the request', async () => {
      const result = await service.submitRequest(
        'docita1',
        baseBody(),
        undefined,
      );

      expect(patientService.createPatient).toHaveBeenCalledWith(
        expect.objectContaining({
          clinicId: 'clinic-1',
          firstName: 'Asha',
          lastName: 'Kumar',
          phoneNumber: '+919812345678',
          gender: 'PREFER_NOT_TO_SAY',
          email: 'asha@example.com',
          dateOfBirth: expect.any(Date),
        }),
      );
      expect(consentCompliance.recordDpdpNoticeConsent).toHaveBeenCalledWith({
        patientId: 'patient-new',
        clinicId: 'clinic-1',
        noticeVersion: DPDP_NOTICE_VERSION,
        givenByName: 'Asha Kumar',
        givenByRelation: 'SELF',
        createdBy: undefined,
        ipAddress: undefined,
        userAgent: undefined,
        notes: 'Collected by patient via public /book page',
      });
      expect(
        appointmentRequestService.createPatientRequest,
      ).toHaveBeenCalledWith(
        'patient-new',
        'clinic-1',
        expect.objectContaining({
          preferredDoctorId: undefined,
          preferredDate: '2026-05-01',
          reason: 'Online booking request',
          notes: undefined,
        }),
      );
      expect(result).toEqual({
        requestId: 'request-1',
        message:
          'Your request has been received. The clinic will confirm your appointment.',
      });
    });

    it('requires a date of birth for a new patient', async () => {
      const { dateOfBirth: _dropped, ...withoutDob } = baseBody();
      await expect(
        service.submitRequest('docita1', withoutDob, undefined),
      ).rejects.toThrow(
        'Date of birth is required when this phone number is not already on file at this clinic',
      );
    });

    // Note: `dpdpConsent.accepted` is enforced at the schema boundary
    // (z.literal(true) in dpdpConsentPayloadSchema), so the service's
    // `accepted !== true` runtime check is defensive-only — a schema-valid
    // request always carries accepted: true. The regression-worthy consent
    // branch is the stale-notice-version rejection below.
    it('rejects a stale privacy notice version', async () => {
      await expect(
        service.submitRequest(
          'docita1',
          baseBody({
            dpdpConsent: { accepted: true, noticeVersion: 'stale-v1' },
          }),
          undefined,
        ),
      ).rejects.toThrow('The privacy notice has been updated');
    });

    it('rejects an unexpected booking verification token for a new patient', async () => {
      await expect(
        service.submitRequest(
          'docita1',
          baseBody({ bookingVerificationToken: 'some-token' }),
          undefined,
        ),
      ).rejects.toThrow('Unexpected booking verification token');
    });

    it('falls back to the consent-giver name when givenByName is absent and forwards a short reason', async () => {
      await service.submitRequest(
        'docita1',
        baseBody({
          dpdpConsent: {
            accepted: true,
            noticeVersion: DPDP_NOTICE_VERSION,
            relation: 'GUARDIAN',
          },
          reason: 'x',
        }),
        undefined,
      );

      expect(consentCompliance.recordDpdpNoticeConsent).toHaveBeenCalledWith(
        expect.objectContaining({
          givenByName: 'Asha Kumar',
          givenByRelation: 'GUARDIAN',
        }),
      );
      expect(
        appointmentRequestService.createPatientRequest,
      ).toHaveBeenCalledWith(
        'patient-new',
        'clinic-1',
        expect.objectContaining({ reason: 'Online booking request' }),
      );
    });
  });

  describe('existing patient verification', () => {
    it('updates the existing patient and skips consent when the token matches', async () => {
      patientService.findByClinicIdAndPhoneNumber.mockResolvedValue({
        id: 'patient-1',
      });
      bookingTokenService.verify.mockReturnValue(VALID_TOKEN_PAYLOAD);

      const result = await service.submitRequest(
        'docita1',
        baseBody(),
        'Bearer valid-token',
      );

      expect(patientService.updatePatient).toHaveBeenCalledWith(
        'patient-1',
        expect.objectContaining({
          firstName: 'Asha',
          lastName: 'Kumar',
          email: 'asha@example.com',
          phoneNumber: '+919812345678',
        }),
        'clinic-1',
      );
      expect(patientService.createPatient).not.toHaveBeenCalled();
      expect(consentCompliance.recordDpdpNoticeConsent).not.toHaveBeenCalled();
      expect(
        appointmentRequestService.createPatientRequest,
      ).toHaveBeenCalledWith('patient-1', 'clinic-1', expect.any(Object));
      expect(result.requestId).toBe('request-1');
    });

    it('accepts the verification token from the body when the header is absent', async () => {
      patientService.findByClinicIdAndPhoneNumber.mockResolvedValue({
        id: 'patient-1',
      });
      bookingTokenService.verify.mockReturnValue(VALID_TOKEN_PAYLOAD);

      await service.submitRequest(
        'docita1',
        baseBody({ bookingVerificationToken: 'body-token' }),
        undefined,
      );

      expect(bookingTokenService.verify).toHaveBeenCalledWith('body-token');
    });

    it('requires verification for an existing patient', async () => {
      patientService.findByClinicIdAndPhoneNumber.mockResolvedValue({
        id: 'patient-1',
      });

      await expect(
        service.submitRequest('docita1', baseBody(), undefined),
      ).rejects.toThrow(
        'Booking verification is required for this phone number',
      );
    });

    it('rejects a token whose clinic does not match the resolved clinic', async () => {
      patientService.findByClinicIdAndPhoneNumber.mockResolvedValue({
        id: 'patient-1',
      });
      bookingTokenService.verify.mockReturnValue({
        ...VALID_TOKEN_PAYLOAD,
        clinicId: 'clinic-other',
      });

      await expect(
        service.submitRequest('docita1', baseBody(), 'Bearer tok'),
      ).rejects.toThrow('Invalid booking verification');
    });

    it('rejects a token whose patient or phone does not match', async () => {
      patientService.findByClinicIdAndPhoneNumber.mockResolvedValue({
        id: 'patient-1',
      });
      bookingTokenService.verify.mockReturnValue({
        ...VALID_TOKEN_PAYLOAD,
        phoneNumber: '+919800000000',
      });

      await expect(
        service.submitRequest('docita1', baseBody(), 'Bearer tok'),
      ).rejects.toThrow('Invalid booking verification');
    });
  });

  describe('requested slot validation', () => {
    it('rejects a requested slot with only a start time', async () => {
      await expect(
        service.submitRequest(
          'docita1',
          baseBody({
            requestedSlotStart: '2026-05-01T04:30:00.000Z',
            preferredDoctorId: 'doc-1',
          }),
          undefined,
        ),
      ).rejects.toThrow('Invalid requested slot');
    });

    it('rejects a requested slot whose end is not after its start', async () => {
      await expect(
        service.submitRequest(
          'docita1',
          baseBody({
            requestedSlotStart: '2026-05-01T04:30:00.000Z',
            requestedSlotEnd: '2026-05-01T04:30:00.000Z',
            preferredDoctorId: 'doc-1',
          }),
          undefined,
        ),
      ).rejects.toThrow('Invalid requested slot');
    });

    it('requires preferredDoctorId when a slot window is provided', async () => {
      await expect(
        service.submitRequest(
          'docita1',
          baseBody({
            requestedSlotStart: '2026-05-01T04:30:00.000Z',
            requestedSlotEnd: '2026-05-01T05:00:00.000Z',
          }),
          undefined,
        ),
      ).rejects.toThrow(
        'preferredDoctorId is required when selecting a time slot',
      );
    });

    it('asserts the requested slot is publicly bookable before registering', async () => {
      await service.submitRequest(
        'docita1',
        baseBody({
          preferredDoctorId: 'doc-1',
          requestedSlotStart: '2026-05-01T04:30:00.000Z',
          requestedSlotEnd: '2026-05-01T05:00:00.000Z',
        }),
        undefined,
      );

      expect(
        slotsService.assertRequestedSlotIsPubliclyBookable,
      ).toHaveBeenCalledWith(
        'clinic-1',
        'doc-1',
        '2026-05-01',
        new Date('2026-05-01T04:30:00.000Z'),
        new Date('2026-05-01T05:00:00.000Z'),
        'Asia/Kolkata',
      );
    });
  });
});
