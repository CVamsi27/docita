import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingService } from './onboarding.service';
import { OnboardingPaymentService } from './onboarding-payment.service';
import { CLOCK_PORT } from '@/shared/common/ports/clock.port';
import {
  CLINIC_PERSISTENCE_PORT,
  type ClinicPersistencePort,
} from '@/domains/clinics/application/ports/clinic-persistence.port';
import { AuthService } from '@/shared/modules/auth/auth/auth.service';
import { OnboardingDataService } from './onboarding-data.service';
import { OnboardingValidationService } from './onboarding-validation.service';
import { OnboardingWorkflowService } from './onboarding-workflow.service';
import { OnboardingComplianceService } from './onboarding-compliance.service';
import { UploadsService } from '@/domains/documents/application/services/uploads.service';
import { PAYMENT_GATEWAY_TOKEN } from '@/domains/subscriptions/application/ports';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import {
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
  jest,
} from '@jest/globals';
import {
  OnboardingStep,
  ClinicTier,
  BillingCycle,
  CompleteOnboardingDto,
} from '@/domains/clinics/application/dto/onboarding/create-clinic-onboarding.dto';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let prismaService: ClinicPersistencePort;
  let authService: AuthService;
  let dataService: OnboardingDataService;
  let validationService: OnboardingValidationService;
  let workflowService: OnboardingWorkflowService;
  let complianceService: OnboardingComplianceService;

  const mockClinicPersistencePort = {
    runUnrestricted: jest.fn((callback: () => unknown | Promise<unknown>) =>
      callback(),
    ),
    $transaction: jest.fn(
      (callback: (tx: unknown) => unknown | Promise<unknown>) =>
        callback(mockClinicPersistencePort as unknown),
    ),
    clinic: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest
        .fn<() => Promise<Array<{ clinicId: string | null }>>>()
        .mockResolvedValue([]),
      create: jest.fn(),
    },
    subscription: {
      create: jest.fn(),
      findFirst: jest.fn<() => Promise<{ id: string } | null>>(),
    },
    subscriptionPayment: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    mrnSequence: {
      create: jest.fn(),
    },
    reminderSettings: {
      create: jest.fn(),
    },
    uploadSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockAuthService = {
    login: jest.fn(),
  };
  const sessionStore = new Map<string, Record<string, unknown>>();
  const mockDataService = {
    initializeOnboarding: jest.fn(() => {
      const onboardingId = `test_${Date.now()}`;
      sessionStore.set(onboardingId, {});
      return { onboardingId };
    }),
    updateOnboardingData: jest.fn(
      (onboardingId: string, step: string, data: Record<string, unknown>) => {
        if (!sessionStore.has(onboardingId)) {
          throw new BadRequestException('Onboarding session not found');
        }
        const existing = sessionStore.get(onboardingId) || {};
        sessionStore.set(onboardingId, {
          ...existing,
          ...data,
          currentStep: step,
        });
      },
    ),
    getOnboardingProgress: jest.fn((onboardingId: string) => {
      const data = sessionStore.get(onboardingId);
      if (!data) throw new BadRequestException('Onboarding session not found');
      return {
        onboardingId,
        currentStep: OnboardingStep.ADMIN_ACCOUNT,
        completedSteps: [OnboardingStep.CLINIC_DETAILS],
        data,
      };
    }),
    getSessionData: jest.fn((onboardingId: string) =>
      sessionStore.get(onboardingId),
    ),
    clearSession: jest.fn((onboardingId: string) =>
      sessionStore.delete(onboardingId),
    ),
  };
  const mockValidationService = {
    validateOnboardingCompletion: jest.fn(
      (completeData: Record<string, unknown>) => {
        if (!completeData?.clinicDetails) {
          return { valid: false, errors: ['Clinic details are required'] };
        }
        return { valid: true, errors: [] };
      },
    ),
    getTierLimits: jest.fn(() => ({
      includedPatients: 50,
      includedAppointments: 100,
      includedStorageGB: 1,
      includedUsers: 1,
    })),
    getTierPricing: jest.fn(() => 49900),
  };
  const mockWorkflowService = {
    createClinic: jest
      .fn()
      .mockImplementation(async () => ({ id: 'clinic_123' })),
    createAdminUser: jest.fn().mockImplementation(async () => ({
      id: 'user_123',
      email: 'admin@clinic.com',
      role: 'ADMIN',
      name: 'Admin User',
    })),
    createSubscription: jest
      .fn()
      .mockImplementation(async () => ({ id: 'sub_123' })),
    createStaffMembers: jest.fn().mockImplementation(async () => 0),
    initializeClinicSettings: jest
      .fn()
      .mockImplementation(async () => undefined),
    getDefaultClinicWeeklyHoursInput: jest.fn(() => [
      {
        dayOfWeek: 'SUNDAY',
        startTime: '09:00',
        endTime: '17:00',
        slotDuration: 30,
        isActive: false,
      },
      {
        dayOfWeek: 'MONDAY',
        startTime: '09:00',
        endTime: '17:00',
        slotDuration: 30,
        isActive: true,
      },
      {
        dayOfWeek: 'TUESDAY',
        startTime: '09:00',
        endTime: '17:00',
        slotDuration: 30,
        isActive: true,
      },
      {
        dayOfWeek: 'WEDNESDAY',
        startTime: '09:00',
        endTime: '17:00',
        slotDuration: 30,
        isActive: true,
      },
      {
        dayOfWeek: 'THURSDAY',
        startTime: '09:00',
        endTime: '17:00',
        slotDuration: 30,
        isActive: true,
      },
      {
        dayOfWeek: 'FRIDAY',
        startTime: '09:00',
        endTime: '17:00',
        slotDuration: 30,
        isActive: true,
      },
      {
        dayOfWeek: 'SATURDAY',
        startTime: '09:00',
        endTime: '17:00',
        slotDuration: 30,
        isActive: false,
      },
    ]),
    replaceClinicWeeklySchedules: jest
      .fn()
      .mockImplementation(async () => undefined),
  };
  const mockComplianceService = {
    recordSLAAgreement: jest.fn().mockImplementation(async () => undefined),
    configureConsentManagement: jest
      .fn()
      .mockImplementation(async () => undefined),
    logOnboardingEvent: jest.fn().mockImplementation(async () => undefined),
  };
  const mockUploadsService = {
    createSession: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    updateSession: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };
  const mockPaymentService = {
    createCheckout: jest.fn(),
  };
  const mockPaymentGateway = {
    createOrder: jest.fn(),
    verifyPayment:
      jest.fn<
        (
          ...args: unknown[]
        ) => Promise<{ verified: boolean; amountCents: number }>
      >(),
  };
  const mockEventEmitter = {
    emit: jest.fn<(...args: unknown[]) => boolean>().mockReturnValue(true),
  };

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        {
          provide: CLINIC_PERSISTENCE_PORT,
          useValue: mockClinicPersistencePort,
        },
        { provide: AuthService, useValue: mockAuthService },
        { provide: OnboardingDataService, useValue: mockDataService },
        {
          provide: OnboardingValidationService,
          useValue: mockValidationService,
        },
        { provide: OnboardingWorkflowService, useValue: mockWorkflowService },
        {
          provide: OnboardingComplianceService,
          useValue: mockComplianceService,
        },
        { provide: UploadsService, useValue: mockUploadsService },
        { provide: OnboardingPaymentService, useValue: mockPaymentService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: PAYMENT_GATEWAY_TOKEN, useValue: mockPaymentGateway },
        { provide: CLOCK_PORT, useValue: { now: () => new Date() } },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
    prismaService = module.get<ClinicPersistencePort>(CLINIC_PERSISTENCE_PORT);
    authService = module.get<AuthService>(AuthService);
    dataService = module.get<OnboardingDataService>(OnboardingDataService);
    validationService = module.get<OnboardingValidationService>(
      OnboardingValidationService,
    );
    workflowService = module.get<OnboardingWorkflowService>(
      OnboardingWorkflowService,
    );
    complianceService = module.get<OnboardingComplianceService>(
      OnboardingComplianceService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initializeOnboarding', () => {
    it('should create a new onboarding session', async () => {
      const result = await service.initializeOnboarding();
      expect(result).toHaveProperty('onboardingId');
      expect(typeof result.onboardingId).toBe('string');
    });
  });

  describe('getTrialEligibility', () => {
    it('returns false when the authenticated account already has a subscription', async () => {
      const { onboardingId } = await service.initializeOnboarding();
      mockClinicPersistencePort.user.findMany.mockImplementationOnce(
        async () => [{ clinicId: 'clinic_existing' }],
      );
      mockClinicPersistencePort.subscription.findFirst.mockImplementationOnce(
        async () => ({ id: 'sub_existing' }),
      );

      await expect(
        service.getTrialEligibility(onboardingId, 'owner@example.com'),
      ).resolves.toEqual({ eligible: false });
    });
  });

  describe('updateOnboardingStep', () => {
    it('should update step data and progress', async () => {
      const { onboardingId } = await service.initializeOnboarding();
      const clinicData = {
        clinicDetails: {
          name: 'Test Clinic',
          email: 'test@clinic.com',
          phone: '1234567890',
          address: '123 Test St',
          mrnPrefix: 'TST',
        },
      };

      const result = await service.updateOnboardingStep(
        onboardingId,
        OnboardingStep.CLINIC_DETAILS,
        clinicData,
      );

      expect(result.currentStep).toBe(OnboardingStep.ADMIN_ACCOUNT);
      expect(result.completedSteps).toContain(OnboardingStep.CLINIC_DETAILS);
      expect(result.data?.clinicDetails).toEqual(clinicData.clinicDetails);
    });

    it('should throw BadRequestException if session invalid', async () => {
      await expect(
        service.updateOnboardingStep(
          'invalid_id',
          OnboardingStep.CLINIC_DETAILS,
          {},
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('completeOnboarding', () => {
    const completeData: Parameters<OnboardingService['completeOnboarding']>[1] =
      {
        clinicDetails: {
          name: 'Test Clinic',
          email: 'test@clinic.com',
          phone: '1234567890',
          address: '123 Test St',
        },
        adminAccount: {
          name: 'Admin User',
          email: 'admin@clinic.com',
          password: 'Password123',
          phoneNumber: '1234567890',
          role: 'ADMIN',
          qualification: 'MBBS',
          registrationNumber: 'REG123',
          specialization: 'General Physician',
        },
        planSelection: {
          tier: ClinicTier.ESSENTIAL,
          billingCycle: BillingCycle.MONTHLY,
        },
        paymentDetails: {
          skipPayment: true,
        },
        slaAgreement: {
          acceptedSLA: true,
          acceptedDataProcessingTerms: true,
          acceptedPrivacyPolicy: true,
          slaVersion: '1.0',
          acceptedBy: 'Admin User',
          ipAddress: '127.0.0.1',
          signatureSessionId: 'sig-session-test',
        },
        consentManagement: {
          enableWhatsAppCommunication: true,
          patientConsentRequiredBeforeWhatsApp: true,
          enableMarketingCommunications: false,
          logAllConsentChanges: true,
          dataProcessingPurposes: ['TREATMENT'],
        },
      };

    it('should successfully complete onboarding', async () => {
      const { onboardingId } = await service.initializeOnboarding();

      mockClinicPersistencePort.clinic.findFirst.mockImplementation(
        async () => null,
      );
      mockClinicPersistencePort.user.findUnique.mockImplementation(
        async () => null,
      );

      const createdClinic = { id: 'clinic_123' };
      const createdUser = {
        id: 'user_123',
        email: 'admin@clinic.com',
        role: 'ADMIN',
        name: 'Admin User',
      };
      const createdSubscription = { id: 'sub_123' };

      mockClinicPersistencePort.clinic.create.mockImplementation(
        async () => createdClinic,
      );
      mockClinicPersistencePort.user.create.mockImplementation(
        async () => createdUser,
      );
      mockClinicPersistencePort.subscription.create.mockImplementation(
        async () => createdSubscription,
      );
      mockClinicPersistencePort.mrnSequence.create.mockImplementation(
        async () => ({}),
      );
      mockClinicPersistencePort.reminderSettings.create.mockImplementation(
        async () => ({}),
      );

      mockClinicPersistencePort.clinic.findUnique.mockImplementation(
        async () => createdClinic,
      );
      mockClinicPersistencePort.clinic.update.mockImplementation(
        async () => createdClinic,
      );

      mockAuthService.login.mockImplementation(async () => ({
        access_token: 'valid_token',
        user: createdUser,
      }));

      const result = await service.completeOnboarding(
        onboardingId,
        completeData,
        '127.0.0.1',
      );

      expect(result.success).toBe(true);
      expect(result.clinicId).toBe('clinic_123');
      expect(result.access_token).toBe('valid_token');

      expect(complianceService.logOnboardingEvent).toHaveBeenCalledWith(
        'user_123',
        'clinic_123',
        'CLINIC_ONBOARDED',
        expect.any(Object),
      );
    });

    it('should fail if clinic email exists', async () => {
      const { onboardingId } = await service.initializeOnboarding();
      mockWorkflowService.createClinic.mockImplementationOnce(async () =>
        Promise.reject(new Error('Clinic with this email already exists')),
      );

      const result = await service.completeOnboarding(
        onboardingId,
        completeData,
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('failed');
      expect(result.errors?.[0]).toContain(
        'Clinic with this email already exists',
      );
    });

    it('should fail if validation missing', async () => {
      const { onboardingId } = await service.initializeOnboarding();
      const completeOnboardingUnsafe = service.completeOnboarding.bind(
        service,
      ) as (
        onboardingId: string,
        completeData: CompleteOnboardingDto | undefined,
        ipAddress?: string,
      ) => ReturnType<OnboardingService['completeOnboarding']>;

      const result = await completeOnboardingUnsafe(onboardingId, undefined);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Clinic details are required');
    });

    it('syncs clinic fields when onboarding completes on STARTER plan', async () => {
      const { onboardingId } = await service.initializeOnboarding();
      mockPaymentGateway.verifyPayment.mockResolvedValue({
        verified: true,
        amountCents: 49900,
      });
      const starterData = {
        ...completeData,
        clinicDetails: {
          ...completeData.clinicDetails,
          gstin: '22AAAAA0000A1Z5',
        },
        planSelection: {
          ...completeData.planSelection,
          tier: ClinicTier.STARTER,
        },
        paymentDetails: {
          razorpayPaymentId: 'pay_starter',
          razorpayOrderId: 'order_starter',
          razorpaySignature: 'sig_starter',
        },
      };

      mockClinicPersistencePort.clinic.update.mockImplementation(async () => ({
        id: 'clinic_123',
      }));
      mockAuthService.login.mockImplementation(async () => ({
        access_token: 'starter_token',
        user: {
          id: 'user_123',
          email: 'admin@clinic.com',
          role: 'ADMIN',
          name: 'Admin User',
          clinicId: 'clinic_123',
        },
      }));

      const result = await service.completeOnboarding(
        onboardingId,
        starterData,
      );

      expect(result.success).toBe(true);
      expect(mockPaymentGateway.verifyPayment).toHaveBeenCalled();
      expect(workflowService.createSubscription).toHaveBeenCalledWith(
        expect.anything(),
        'clinic_123',
        expect.objectContaining({
          tier: ClinicTier.STARTER,
          billingCycle: BillingCycle.MONTHLY,
        }),
        starterData.paymentDetails,
      );
    });

    it('emits CLINIC_ONBOARDED with the referral payload when planSelection.referralCode is present', async () => {
      const { onboardingId } = await service.initializeOnboarding();
      const dataWithCode = {
        ...completeData,
        planSelection: {
          ...completeData.planSelection,
          referralCode: 'WELCOME10',
        },
      };

      mockAuthService.login.mockImplementation(async () => ({
        access_token: 'token',
        user: {
          id: 'user_123',
          email: 'admin@clinic.com',
          role: 'ADMIN',
          name: 'Admin User',
        },
      }));

      const result = await service.completeOnboarding(
        onboardingId,
        dataWithCode,
        '127.0.0.1',
      );

      expect(result.success).toBe(true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('clinic.onboarded', {
        clinicId: 'clinic_123',
        clinicEmail: 'test@clinic.com',
        referralCode: 'WELCOME10',
      });
    });

    it('trims whitespace from the referral code before emitting', async () => {
      const { onboardingId } = await service.initializeOnboarding();
      const dataWithCode = {
        ...completeData,
        planSelection: {
          ...completeData.planSelection,
          referralCode: '  WELCOME10  ',
        },
      };
      mockAuthService.login.mockImplementation(async () => ({
        access_token: 'token',
        user: {
          id: 'user_123',
          email: 'admin@clinic.com',
          role: 'ADMIN',
          name: 'Admin User',
        },
      }));

      await service.completeOnboarding(onboardingId, dataWithCode, '127.0.0.1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'clinic.onboarded',
        expect.objectContaining({ referralCode: 'WELCOME10' }),
      );
    });

    it('skips the CLINIC_ONBOARDED emit when planSelection.referralCode is missing', async () => {
      const { onboardingId } = await service.initializeOnboarding();
      mockAuthService.login.mockImplementation(async () => ({
        access_token: 'token',
        user: {
          id: 'user_123',
          email: 'admin@clinic.com',
          role: 'ADMIN',
          name: 'Admin User',
        },
      }));

      const result = await service.completeOnboarding(
        onboardingId,
        completeData,
        '127.0.0.1',
      );

      expect(result.success).toBe(true);
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('emits even if no listener is registered (in-process bus, no throw)', async () => {
      // The emit is fire-and-forget from onboarding's POV — if subscriptions
      // isn't loaded (or its listener throws), onboarding must still succeed.
      // The non-fatal guarantee is in the listener (ReferralService wraps
      // captureReferralAtSignup in a try/catch); here we just verify the emit
      // itself doesn't throw.
      const { onboardingId } = await service.initializeOnboarding();
      const dataWithCode = {
        ...completeData,
        planSelection: {
          ...completeData.planSelection,
          referralCode: 'WELCOME10',
        },
      };
      mockAuthService.login.mockImplementation(async () => ({
        access_token: 'token',
        user: {
          id: 'user_123',
          email: 'admin@clinic.com',
          role: 'ADMIN',
          name: 'Admin User',
        },
      }));

      const result = await service.completeOnboarding(
        onboardingId,
        dataWithCode,
        '127.0.0.1',
      );

      expect(result.success).toBe(true);
      expect(result.clinicId).toBe('clinic_123');
      expect(mockEventEmitter.emit).toHaveBeenCalled();
    });

    it('passes a null clinicEmail in the payload when clinic details omit one', async () => {
      const { onboardingId } = await service.initializeOnboarding();
      const dataNoEmail = {
        ...completeData,
        clinicDetails: {
          ...completeData.clinicDetails,
          email: '',
        },
        planSelection: {
          ...completeData.planSelection,
          referralCode: 'WELCOME10',
        },
      };
      mockAuthService.login.mockImplementation(async () => ({
        access_token: 'token',
        user: {
          id: 'user_123',
          email: 'admin@clinic.com',
          role: 'ADMIN',
          name: 'Admin User',
        },
      }));

      await service.completeOnboarding(onboardingId, dataNoEmail, '127.0.0.1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'clinic.onboarded',
        expect.objectContaining({ clinicEmail: null }),
      );
    });
  });

  describe('SLA signature sessions', () => {
    it('createSlaSignatureSession creates a GENERAL upload session', async () => {
      const { onboardingId } = await service.initializeOnboarding();
      const created = {
        id: 'sess_123',
        purpose: 'GENERAL',
        status: 'pending',
        uploadSecret: 'opaque-upload-secret',
      };

      mockUploadsService.createSession.mockResolvedValue(created);

      const result = await service.createSlaSignatureSession(onboardingId);

      expect(result).toEqual(created);
      expect(mockUploadsService.createSession).toHaveBeenCalledWith({
        expiresInMinutes: 20,
        purpose: 'GENERAL',
      });
    });

    it('getSlaSignatureSessionStatus marks uploaded when fileUrl exists', async () => {
      mockClinicPersistencePort.uploadSession.findUnique.mockImplementation(
        async () => ({
          id: 'sess_1',
          purpose: 'GENERAL',
          status: 'pending',
          fileUrl: 'https://cdn.example/signature.png',
        }),
      );

      const result = await service.getSlaSignatureSessionStatus(
        'onb_any',
        'sess_1',
      );

      expect(result).toEqual({
        status: 'pending',
        uploaded: true,
        fileUrl: 'https://cdn.example/signature.png',
      });
    });

    it('getSlaSignatureSessionStatus throws for non-onboarding upload purposes', async () => {
      mockClinicPersistencePort.uploadSession.findUnique.mockImplementation(
        async () => ({
          id: 'sess_2',
          purpose: 'DOCTOR_SIGNATURE',
          status: 'pending',
          fileUrl: null,
        }),
      );

      await expect(
        service.getSlaSignatureSessionStatus('onb_any', 'sess_2'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('uploadSlaSignature marks one-time link as expired after successful upload', async () => {
      mockClinicPersistencePort.uploadSession.findUnique.mockImplementation(
        async () => ({
          id: 'sess_3',
          purpose: 'GENERAL',
          status: 'pending',
          fileUrl: null,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        }),
      );

      mockUploadsService.updateSession.mockImplementation(async () => ({
        id: 'sess_3',
        status: 'uploaded',
        fileUrl: 'https://cdn.example/signature.png',
      }));
      mockClinicPersistencePort.uploadSession.update.mockImplementation(
        async () => ({
          id: 'sess_3',
        }),
      );

      const file = {
        originalname: 'signature.png',
        mimetype: 'image/png',
        buffer: Buffer.from('file-bytes'),
        size: 10,
      } as Express.Multer.File;

      const result = await service.uploadSlaSignature(
        'onb_abc',
        'sess_3',
        file,
        'upload-secret-value',
      );

      expect(result).toEqual(
        expect.objectContaining({
          id: 'sess_3',
          status: 'uploaded',
        }),
      );
      expect(mockUploadsService.updateSession).toHaveBeenCalledWith(
        'sess_3',
        file,
        expect.objectContaining({
          onboardingId: 'onb_abc',
          uploadSecret: 'upload-secret-value',
        }),
      );
      expect(
        mockClinicPersistencePort.uploadSession.update,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sess_3' },
          data: expect.objectContaining({
            expiresAt: expect.any(Date),
          }),
        }),
      );
    });
  });
});
