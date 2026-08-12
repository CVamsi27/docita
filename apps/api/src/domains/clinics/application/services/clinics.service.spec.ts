import { Test, TestingModule } from '@nestjs/testing';
import { ClinicsService } from './clinics-facade.service';
import {
  CLINIC_PERSISTENCE_PORT,
  type ClinicPersistencePort,
} from '@/domains/clinics/application/ports/clinic-persistence.port';
import { ClinicFactory } from '@/domains/clinics/core/factories/clinic.factory';
import { SettingsFactory } from '@/domains/clinics/core/factories/settings.factory';
import { ClinicDataService } from './clinic-data.service';
import { ClinicDataCommandService } from './clinic-data-command.service';
import { ClinicDataQueryService } from './clinic-data-query.service';
import { ClinicSettingsService } from './clinic-settings.service';
import { ClinicSettingsQueryService } from './clinic-settings-query.service';
import { ClinicSettingsCommandService } from './clinic-settings-command.service';
import { ClinicDataSubjectRequestService } from './clinic-data-subject-request.service';
import { StaffManagementService } from './staff-management.service';
import { StaffInviteService } from './staff-invite.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';
import { CLINIC_DATA_REPOSITORY_TOKEN } from '@/domains/clinics/core/repositories/clinic-data.repository.interface';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { Role } from '@workspace/db';
import * as bcrypt from 'bcrypt';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

jest.mock('bcrypt');

describe('ClinicsService', () => {
  let service: ClinicsService;
  let prismaService: {
    clinic: {
      create: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
      findMany: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
      findUnique: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
      update: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
    };
    user: {
      create: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
      findMany: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
    };
    patient: {
      count: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
    };
    appointment: {
      count: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
    };
    doctorClinic: {
      findMany: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
      create: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
    };
  };
  let clinicFactory: ClinicFactory;
  let _settingsFactory: SettingsFactory;
  let clinicDataRepository: Record<
    string,
    jest.Mock<(...args: unknown[]) => Promise<unknown>>
  >;
  const storedFileUrlResolver: Pick<
    StoredFileUrlResolverService,
    'resolveWithStoredUrl'
  > = {
    resolveWithStoredUrl: jest
      .fn<StoredFileUrlResolverService['resolveWithStoredUrl']>()
      .mockResolvedValue({
        url: null,
        storedUrl: null,
      }),
  };

  const mockClinic = {
    id: 'clinic-123',
    name: 'Test Clinic',
    address: '123 Test St',
    phone: '1234567890',
    email: 'clinic@test.com',
    logo: null,
    tier: 'CORE',
    settings: null,
    website: null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    type: 'CLINIC',
    timezone: 'Asia/Kolkata',
    locale: 'en-IN',
    currency: 'INR',
    taxId: null,
    billingAddress: null,
    subscriptionStatus: 'ACTIVE',
    branding: null,
    features: null,
    whatsappAutomation: null,
    subscriptionId: null,
    subscriptionStartDate: null,
    subscriptionEndDate: null,
    trialEndsAt: null,
    isTrialUsed: false,
    billingCycle: 'MONTHLY',
    nextBillingDate: null,
    paymentMethodId: null,
    autoRenew: true,
    referralCode: null,
    referredBy: null,
    referralCreditsMonths: 0,
  };

  const mockUser = {
    id: 'user-123',
    name: 'Dr. Test',
    email: 'doctor@test.com',
    password: 'hashedPassword',
    role: Role.DOCTOR,
    clinicId: 'clinic-123',
    phoneNumber: '9876543410',
    specialization: 'GENERAL_PRACTICE',
    qualification: 'MD',
    registrationNumber: 'REG001',
    createdAt: new Date(),
    updatedAt: new Date(),
    signatureUrl: null,
    bio: null,
    consultationFee: null,
    hospitalRole: null,
    licenseExpiry: null,
    licenseNumber: null,
    profilePhotoUrl: null,
    yearsOfExperience: null,
    failedLoginAttempts: 0,
    lastFailedLoginAt: null,
    accountLockedUntil: null,
  };

  beforeEach(async () => {
    clinicDataRepository = {
      findByReferralCode: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue(null),
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findAll: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findById: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      softDelete: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findDoctorClinics: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      getStats: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findUserForJoin: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findClinicByCodeOrEmail:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      joinClinic: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      searchActive: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicsService,
        ClinicDataCommandService,
        ClinicDataQueryService,
        ClinicDataService,
        ClinicSettingsService,
        ClinicSettingsCommandService,
        { provide: ClinicDataSubjectRequestService, useValue: {} },
        StaffManagementService,
        StaffInviteService,
        { provide: ClinicSettingsQueryService, useValue: {} },
        {
          provide: CLINIC_DATA_REPOSITORY_TOKEN,
          useValue: clinicDataRepository,
        },
        {
          provide: CLINIC_PERSISTENCE_PORT,
          useValue: {
            clinic: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            user: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
            patient: {
              count: jest.fn(),
            },
            appointment: {
              count: jest.fn(),
            },
            doctorClinic: {
              findMany: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        {
          provide: ClinicFactory,
          useValue: {
            create: jest.fn().mockImplementation((data: unknown) => {
              const clinicData =
                typeof data === 'object' && data !== null
                  ? (data as Record<string, unknown>)
                  : {};

              return {
                ...clinicData,
                phone:
                  typeof clinicData.phone === 'string' ? clinicData.phone : '',
                address:
                  typeof clinicData.address === 'string'
                    ? clinicData.address
                    : '',
                tier:
                  typeof clinicData.tier === 'string'
                    ? clinicData.tier
                    : 'CORE',
                active: true,
              };
            }),
          },
        },
        {
          provide: SettingsFactory,
          useValue: {
            createDefault: jest.fn().mockReturnValue({}),
            validate: jest.fn().mockImplementation((s) => s),
            partialValidate: jest.fn().mockImplementation((s) => s),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logAction: jest.fn(),
          },
        },
        {
          provide: AppConfigService,
          useValue: {
            getConfig: jest.fn().mockReturnValue({}),
            getAppUrl: jest.fn().mockReturnValue('http://localhost:3000'),
            getEnvironment: jest.fn().mockReturnValue('test'),
            isProduction: jest.fn().mockReturnValue(false),
          },
        },
        {
          provide: StoredFileUrlResolverService,
          useValue: storedFileUrlResolver,
        },
      ],
    }).compile();

    service = module.get<ClinicsService>(ClinicsService);
    prismaService = module.get<ClinicPersistencePort>(
      CLINIC_PERSISTENCE_PORT,
    ) as unknown as typeof prismaService;
    clinicFactory = module.get<ClinicFactory>(ClinicFactory);
    _settingsFactory = module.get<SettingsFactory>(SettingsFactory);

    jest.clearAllMocks();
    clinicDataRepository.findByReferralCode.mockResolvedValue(null);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a clinic with default tier', async () => {
      clinicDataRepository.create.mockResolvedValue(mockClinic);

      const result = await service.create({
        name: 'Test Clinic',
        address: '123 Test St',
        phone: '1234567890',
        email: 'clinic@test.com',
      });

      expect(result).toEqual(mockClinic);
      expect(clinicFactory.create).toHaveBeenCalledWith({
        name: 'Test Clinic',
        address: '123 Test St',
        phone: '1234567890',
        email: 'clinic@test.com',
        tier: undefined,
        settings: {},
      });
      expect(clinicDataRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Clinic',
          tier: 'CORE',
          active: true,
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all active clinics', async () => {
      const mockClinics = [
        { ...mockClinic, _count: { users: 1, patients: 5, appointments: 10 } },
      ];
      clinicDataRepository.findAll.mockResolvedValue(mockClinics);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'clinic-123',
          name: 'Test Clinic',
          phoneNumber: mockClinic.phone,
          active: true,
        }),
      );
      expect(clinicDataRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a clinic by id', async () => {
      const clinicWithUsers = {
        ...mockClinic,
        users: [],
        settings: null,
        _count: { patients: 5, appointments: 10 },
      };
      clinicDataRepository.findById.mockResolvedValue(clinicWithUsers);

      const result = await service.findOne('clinic-123');

      const clinicResult = result as Record<string, unknown>;
      expect(clinicResult).toBeDefined();
      expect(clinicResult?.id).toBe('clinic-123');
      expect(clinicResult?.phoneNumber).toBe(mockClinic.phone);
    });

    it('should return null if clinic not found', async () => {
      clinicDataRepository.findById.mockResolvedValue(null);

      const result = await service.findOne('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a clinic', async () => {
      const updatedClinic = { ...mockClinic, name: 'Updated Clinic' };
      clinicDataRepository.update.mockResolvedValue(updatedClinic);

      const result = await service.update('clinic-123', {
        name: 'Updated Clinic',
      });

      expect((result as Record<string, unknown>).name).toBe('Updated Clinic');
      expect(clinicDataRepository.update).toHaveBeenCalledWith(
        'clinic-123',
        expect.objectContaining({ name: 'Updated Clinic' }),
      );
    });
  });

  describe('delete', () => {
    it('should soft delete a clinic by setting active to false', async () => {
      const deactivatedClinic = { ...mockClinic, active: false };
      clinicDataRepository.softDelete.mockResolvedValue(deactivatedClinic);

      const result = await service.delete('clinic-123');

      expect((result as Record<string, unknown>).active).toBe(false);
      expect(clinicDataRepository.softDelete).toHaveBeenCalledWith(
        'clinic-123',
      );
    });
  });

  describe('getClinicStats', () => {
    it('should return clinic statistics', async () => {
      clinicDataRepository.getStats.mockResolvedValue({
        totalPatients: 10,
        totalAppointments: 50,
        todayAppointments: 5,
      });

      const result = await service.getClinicStats('clinic-123');

      expect(result).toEqual({
        totalPatients: 10,
        totalAppointments: 50,
        todayAppointments: 5,
      });
    });
  });

  describe('createDoctor', () => {
    it('should create a doctor and associate with clinic', async () => {
      jest.mocked(bcrypt.hash).mockImplementation(async () => 'hashedPassword');
      prismaService.user.create.mockResolvedValue(mockUser);
      prismaService.doctorClinic.create.mockResolvedValue({
        id: 'doctor-clinic-1',
        doctorId: mockUser.id,
        clinicId: 'clinic-123',
        role: 'doctor',
        active: true,
        createdAt: new Date(),
      });

      const result = await service.createDoctor('clinic-123', {
        name: 'Dr. Test',
        email: 'doctor@test.com',
        password: 'password123',
        specialization: 'General',
      });

      expect(result).toEqual(mockUser);
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(prismaService.doctorClinic.create).toHaveBeenCalledWith({
        data: {
          doctorId: mockUser.id,
          clinicId: 'clinic-123',
        },
      });
    });
  });

  describe('getDoctors', () => {
    it('should return doctors for a clinic', async () => {
      prismaService.user.findMany.mockResolvedValue([mockUser]);

      const result = await service.getDoctors('clinic-123');

      expect(result).toEqual([mockUser]);
      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: { clinicId: 'clinic-123', role: 'DOCTOR' },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('createReceptionist', () => {
    it('should create a receptionist', async () => {
      const mockReceptionist = { ...mockUser, role: Role.RECEPTIONIST };
      jest.mocked(bcrypt.hash).mockImplementation(async () => 'hashedPassword');
      prismaService.user.create.mockResolvedValue(mockReceptionist);

      const result = await service.createReceptionist('clinic-123', {
        name: 'Receptionist',
        email: 'receptionist@test.com',
        password: 'password123',
      });

      expect(result.role).toBe('RECEPTIONIST');
    });
  });

  describe('getReceptionists', () => {
    it('should return receptionists for a clinic', async () => {
      const mockReceptionist = { ...mockUser, role: Role.RECEPTIONIST };
      prismaService.user.findMany.mockResolvedValue([mockReceptionist]);

      const result = await service.getReceptionists('clinic-123');

      expect(result[0].role).toBe('RECEPTIONIST');
      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: { clinicId: 'clinic-123', role: 'RECEPTIONIST' },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
