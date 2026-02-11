import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingService } from './onboarding.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { SubscriptionBillingService } from '../subscription/subscription-billing.service';
import { BadRequestException } from '@nestjs/common';
import {
  OnboardingStep,
  ClinicTier,
  BillingCycle,
} from './dto/create-clinic-onboarding.dto';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let prismaService: PrismaService;
  let auditService: AuditService;
  let authService: AuthService;
  let subscriptionBillingService: SubscriptionBillingService;

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

  const mockAuditService = {
    logAction: jest.fn(),
  };

  const mockAuthService = {
    login: jest.fn(),
  };

  const mockSubscriptionBillingService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: SubscriptionBillingService,
          useValue: mockSubscriptionBillingService,
        },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
    prismaService = module.get<PrismaService>(PrismaService);
    auditService = module.get<AuditService>(AuditService);
    authService = module.get<AuthService>(AuthService);
    subscriptionBillingService = module.get<SubscriptionBillingService>(
      SubscriptionBillingService,
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

      // Verify audit log was called
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'CLINIC_ONBOARDED',
          clinicId: 'clinic_123',
        }),
        true,
      );
    });

    it('should fail if clinic email exists', async () => {
      const { onboardingId } = service.initializeOnboarding();

      mockPrismaService.clinic.findFirst.mockResolvedValue({
        id: 'existing_clinic',
      });

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
