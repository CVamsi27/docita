import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingService } from './onboarding.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { OnboardingDataService } from './onboarding-data.service';
import { OnboardingValidationService } from './onboarding-validation.service';
import { OnboardingWorkflowService } from './onboarding-workflow.service';
import { OnboardingComplianceService } from './onboarding-compliance.service';
import { BadRequestException } from '@nestjs/common';
import {
  OnboardingStep,
  ClinicTier,
  BillingCycle,
} from './dto/create-clinic-onboarding.dto';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let prismaService: PrismaService;
  let authService: AuthService;
  let dataService: OnboardingDataService;
  let validationService: OnboardingValidationService;
  let workflowService: OnboardingWorkflowService;
  let complianceService: OnboardingComplianceService;

  const mockPrismaService = {
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
    clinic: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    subscription: {
      create: jest.fn(),
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
  };

  const mockAuthService = {
    login: jest.fn(),
  };
  const sessionStore = new Map<string, any>();
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
    validateOnboardingCompletion: jest.fn((completeData: Record<string, unknown>) => {
      if (!completeData?.clinicDetails) {
        return { valid: false, errors: ['Clinic details are required'] };
      }
      return { valid: true, errors: [] };
    }),
  };
  const mockWorkflowService = {
    createClinic: jest.fn().mockResolvedValue({ id: 'clinic_123' }),
    createAdminUser: jest.fn().mockResolvedValue({
      id: 'user_123',
      email: 'admin@clinic.com',
      role: 'ADMIN',
      name: 'Admin User',
    }),
    createSubscription: jest.fn().mockResolvedValue({ id: 'sub_123' }),
    createStaffMembers: jest.fn().mockResolvedValue(0),
    initializeClinicSettings: jest.fn().mockResolvedValue(undefined),
  };
  const mockComplianceService = {
    recordSLAAgreement: jest.fn().mockResolvedValue(undefined),
    configureConsentManagement: jest.fn().mockResolvedValue(undefined),
    logOnboardingEvent: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: PrismaService, useValue: mockPrismaService },
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
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
    prismaService = module.get<PrismaService>(PrismaService);
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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initializeOnboarding', () => {
    it('should create a new onboarding session', () => {
      const result = service.initializeOnboarding();
      expect(result).toHaveProperty('onboardingId');
      expect(typeof result.onboardingId).toBe('string');
      // Verify session is stored (implicitly via update check later or we can access private map if we really wanted to, but focusing on public API)
    });
  });

  describe('updateOnboardingStep', () => {
    it('should update step data and progress', () => {
      const { onboardingId } = service.initializeOnboarding();
      const clinicData = {
        clinicDetails: {
          name: 'Test Clinic',
          email: 'test@clinic.com',
          phone: '1234567890',
          address: '123 Test St',
          mrnPrefix: 'TST',
        },
      };

      const result = service.updateOnboardingStep(
        onboardingId,
        OnboardingStep.CLINIC_DETAILS,
        clinicData,
      );

      expect(result.currentStep).toBe(OnboardingStep.ADMIN_ACCOUNT);
      expect(result.completedSteps).toContain(OnboardingStep.CLINIC_DETAILS);
      expect(result.data?.clinicDetails).toEqual(clinicData.clinicDetails);
    });

    it('should throw BadRequestException if session invalid', () => {
      expect(() =>
        service.updateOnboardingStep(
          'invalid_id',
          OnboardingStep.CLINIC_DETAILS,
          {},
        ),
      ).toThrow(BadRequestException);
    });
  });

  describe('completeOnboarding', () => {
    const completeData: any = {
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
        tier: ClinicTier.CORE,
        billingCycle: BillingCycle.MONTHLY,
      },
      slaAgreement: {
        acceptedSLA: true,
        acceptedDataProcessingTerms: true,
        acceptedPrivacyPolicy: true,
        slaVersion: '1.0',
        acceptedBy: 'Admin User',
        ipAddress: '127.0.0.1',
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
      const { onboardingId } = service.initializeOnboarding();

      // Mock successful DB operations
      mockPrismaService.clinic.findFirst.mockResolvedValue(null); // No existing clinic
      mockPrismaService.user.findUnique.mockResolvedValue(null); // No existing user

      const createdClinic = { id: 'clinic_123' };
      const createdUser = {
        id: 'user_123',
        email: 'admin@clinic.com',
        role: 'ADMIN',
        name: 'Admin User',
      };
      const createdSubscription = { id: 'sub_123' };

      mockPrismaService.clinic.create.mockResolvedValue(createdClinic);
      mockPrismaService.user.create.mockResolvedValue(createdUser);
      mockPrismaService.subscription.create.mockResolvedValue(
        createdSubscription,
      );
      mockPrismaService.mrnSequence.create.mockResolvedValue({});
      mockPrismaService.reminderSettings.create.mockResolvedValue({});

      // Mock SLA update (finding clinic then updating)
      mockPrismaService.clinic.findUnique.mockResolvedValue(createdClinic);
      mockPrismaService.clinic.update.mockResolvedValue(createdClinic);

      // Mock Login
      mockAuthService.login.mockResolvedValue({
        access_token: 'valid_token',
        user: createdUser,
      });

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
      const { onboardingId } = service.initializeOnboarding();
      mockWorkflowService.createClinic.mockRejectedValueOnce(
        new Error('Clinic with this email already exists'),
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
      const { onboardingId } = service.initializeOnboarding();
      const incompleteData = { ...completeData, clinicDetails: undefined };

      const result = await service.completeOnboarding(
        onboardingId,
        incompleteData,
      );

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Clinic details are required');
    });
  });
});
