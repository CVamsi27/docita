import { Test, TestingModule } from '@nestjs/testing';
import { ClinicsService } from './clinics.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ClinicFactory } from '../../core/factories/clinic.factory';
import { SettingsFactory } from '../../core/factories/settings.factory';
import { ClinicDataService } from './clinic-data.service';
import { ClinicSettingsService } from './clinic-settings.service';
import { StaffManagementService } from './staff-management.service';
import { Role } from '@workspace/db';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('ClinicsService', () => {
  let service: ClinicsService;
  let prismaService: PrismaService;
  let clinicFactory: ClinicFactory;
  let settingsFactory: SettingsFactory;

  const mockClinic = {
    // ... (previous content preserved or re-defined if shorter)
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
    phoneNumber: '9876543210',
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicsService,
        ClinicDataService,
        ClinicSettingsService,
        StaffManagementService,
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
            create: jest.fn().mockImplementation((data) => ({
              ...data,
              phone: data.phone || '',
              address: data.address || '',
              tier: data.tier || 'CORE',
              active: true,
            })),
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
      ],
    }).compile();

    service = module.get<ClinicsService>(ClinicsService);
    prismaService = module.get<PrismaService>(PrismaService);
    clinicFactory = module.get<ClinicFactory>(ClinicFactory);
    settingsFactory = module.get<SettingsFactory>(SettingsFactory);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a clinic with default tier', async () => {
      jest
        .spyOn(prismaService.clinic, 'create')
        .mockResolvedValue(mockClinic as any);

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
        settings: undefined,
      });
      expect(prismaService.clinic.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Clinic',
          tier: 'CORE',
          active: true,
          // settings is included in '...clinicInput' which comes from mocked factory.
          // Since our mocked factory in test setup returns '...data', and we didn't mock settings logic in the SERVICE test's factory mock for `clinicFactory` specifically to be complex,
          // we just expect objectContaining.
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return all active clinics', async () => {
      const mockClinics = [
        { ...mockClinic, _count: { users: 1, patients: 5, appointments: 10 } },
      ];
      jest
        .spyOn(prismaService.clinic, 'findMany')
        .mockResolvedValue(mockClinics as any);

      const result = await service.findAll();

      expect(result).toEqual(mockClinics);
      expect(prismaService.clinic.findMany).toHaveBeenCalledWith({
        where: { active: true },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a clinic by id', async () => {
      const clinicWithUsers = {
        ...mockClinic,
        users: [],
        _count: { patients: 5, appointments: 10 },
        intelligenceAddon: false,
        avgConsultationMinutes: 30,
        lateArrivalGraceMinutes: 5,
        queueBufferMinutes: 10,
        defaultInvoiceCurrency: 'INR',
        invoiceNumberFormat: 'INV-{clinic_id}-{date}-{sequence}',
      } as any;
      jest
        .spyOn(prismaService.clinic, 'findUnique')
        .mockResolvedValue(clinicWithUsers);

      const result = await service.findOne('clinic-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('clinic-123');
      expect(result?.phoneNumber).toBe(mockClinic.phone);
    });

    it('should return null if clinic not found', async () => {
      jest.spyOn(prismaService.clinic, 'findUnique').mockResolvedValue(null);

      const result = await service.findOne('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a clinic', async () => {
      const updatedClinic = { ...mockClinic, name: 'Updated Clinic' };
      jest
        .spyOn(prismaService.clinic, 'update')
        .mockResolvedValue(updatedClinic as any);

      const result = await service.update('clinic-123', {
        name: 'Updated Clinic',
      });

      expect(result.name).toBe('Updated Clinic');
      expect(prismaService.clinic.update).toHaveBeenCalledWith({
        where: { id: 'clinic-123' },
        data: expect.objectContaining({ name: 'Updated Clinic' }),
      });
    });
  });

  describe('delete', () => {
    it('should soft delete a clinic by setting active to false', async () => {
      const deactivatedClinic = { ...mockClinic, active: false };
      jest
        .spyOn(prismaService.clinic, 'update')
        .mockResolvedValue(deactivatedClinic as any);

      const result = await service.delete('clinic-123');

      expect(result.active).toBe(false);
      expect(prismaService.clinic.update).toHaveBeenCalledWith({
        where: { id: 'clinic-123' },
        data: { active: false },
      });
    });
  });

  describe('getClinicStats', () => {
    it('should return clinic statistics', async () => {
      jest.spyOn(prismaService.patient, 'count').mockResolvedValue(10);
      jest
        .spyOn(prismaService.appointment, 'count')
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(5);

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
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      jest
        .spyOn(prismaService.user, 'create')
        .mockResolvedValue(mockUser as any);
      jest
        .spyOn(prismaService.doctorClinic, 'create')
        .mockResolvedValue({} as any);

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
        .mockResolvedValue([mockUser] as any);

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
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      jest
        .spyOn(prismaService.user, 'create')
        .mockResolvedValue(mockReceptionist as any);

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
        .mockResolvedValue([mockReceptionist] as any);

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
