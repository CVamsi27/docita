import { Test, TestingModule } from '@nestjs/testing';
import { ClinicsService } from './clinics.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ClinicFactory } from '@/domains/clinics/core/factories/clinic.factory';
import { SettingsFactory } from '@/domains/clinics/core/factories/settings.factory';
import { ClinicDataService } from './clinic-data.service';
import { ClinicSettingsService } from './clinic-settings.service';
import { StaffManagementService } from './staff-management.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { CLINIC_DATA_REPOSITORY_TOKEN } from '@/domains/clinics/core/repositories/clinic-data.repository.interface';
import { Role } from '@workspace/db';
import * as bcrypt from 'bcrypt';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

jest.mock('bcrypt');

describe('ClinicsService', () => {
  let service: ClinicsService;
  let prismaService: PrismaService;
  let clinicFactory: ClinicFactory;
  let _settingsFactory: SettingsFactory;
  let clinicDataRepository: Record<string, jest.Mock>;

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
      findByReferralCode: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findDoctorClinics: jest.fn(),
      getStats: jest.fn(),
      findUserForJoin: jest.fn(),
      findClinicByCodeOrEmail: jest.fn(),
      joinClinic: jest.fn(),
      searchActive: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicsService,
        ClinicDataService,
        ClinicSettingsService,
        StaffManagementService,
        {
          provide: CLINIC_DATA_REPOSITORY_TOKEN,
          useValue: clinicDataRepository,
        },
        {
          provide: PrismaService,
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
          provide: AppConfigService,
          useValue: {
            getConfig: jest.fn().mockReturnValue({}),
            getAppUrl: jest.fn().mockReturnValue('http://localhost:3000'),
            getEnvironment: jest.fn().mockReturnValue('test'),
            isProduction: jest.fn().mockReturnValue(false),
          },
        },
      ],
    }).compile();

    service = module.get<ClinicsService>(ClinicsService);
    prismaService = module.get<PrismaService>(PrismaService);
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

      expect(result).toEqual(mockClinics);
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

      expect(result).toBeDefined();
      expect(result?.id).toBe('clinic-123');
      expect(result?.phoneNumber).toBe(mockClinic.phone);
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

      expect(result.name).toBe('Updated Clinic');
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

      expect(result.active).toBe(false);
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
      jest
        .spyOn(prismaService.user, 'create')
        .mockResolvedValue(mockUser as never);
      jest
        .spyOn(prismaService.doctorClinic, 'create')
        .mockResolvedValue({} as never);

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
      jest
        .spyOn(prismaService.user, 'findMany')
        .mockResolvedValue([mockUser] as never);

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
      const mockReceptionist = { ...mockUser, role: 'RECEPTIONIST' };
      jest.mocked(bcrypt.hash).mockImplementation(async () => 'hashedPassword');
      jest
        .spyOn(prismaService.user, 'create')
        .mockResolvedValue(mockReceptionist as never);

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
      const mockReceptionist = { ...mockUser, role: 'RECEPTIONIST' };
      jest
        .spyOn(prismaService.user, 'findMany')
        .mockResolvedValue([mockReceptionist] as never);

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
