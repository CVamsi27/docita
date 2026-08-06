import { Test, TestingModule } from '@nestjs/testing';
import { DoctorsService } from './doctors.service';
import { DoctorProfileService } from './doctor-profile.service';
import {
  DOCTOR_PERSISTENCE_PORT,
  type DoctorPersistencePort,
} from '@/domains/doctors/application/ports/doctor-persistence.port';
import { DoctorVerificationService } from './doctor-verification.service';
import { SignatureUploadService } from './signature-upload.service';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';
import { StorageProvider } from '@/domains/documents/application/ports/storage-provider.port';
import { NotFoundException } from '@nestjs/common';
import { Role, Specialization } from '@workspace/db';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { clockPortTestProvider } from '@/test-utils';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import {
  DOCTOR_REPOSITORY_TOKEN,
  IDoctorRepository,
} from '@/domains/doctors/core/repositories/doctor.repository.interface';

describe('DoctorsService', () => {
  let service: DoctorsService;
  let prisma: DoctorPersistencePort;

  const mockDoctor = {
    id: 'doctor-123',
    email: 'doctor@example.com',
    name: 'Dr. John Smith',
    role: 'DOCTOR',
    specialization: 'CARDIOLOGY',
    hospitalRole: 'CONSULTANT',
    qualification: 'MBBS, MD',
    registrationNumber: 'REG123',
    phoneNumber: '1234567890',
    signatureUrl: 'https://example.com/signature.png',
    signatureStoredUrl: 'https://example.com/signature.png',
    clinicId: 'clinic-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEducation = {
    id: 'edu-123',
    doctorId: 'doctor-123',
    degree: 'MBBS',
    institution: 'Medical College',
    startYear: 2010,
    endYear: 2015,
  };

  const mockCertification = {
    id: 'cert-123',
    doctorId: 'doctor-123',
    name: 'Board Certification',
    issuingBody: 'Medical Board',
    issueDate: new Date(),
  };

  const mockDoctorPersistencePort = {
    user: {
      findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      updateMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      deleteMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    doctorClinic: {
      findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      updateMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      deleteMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    doctorEducation: {
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      delete: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      deleteMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    doctorCertification: {
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      delete: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      deleteMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    doctorSpecialization: {
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      deleteMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    $transaction: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const mockDoctorVerificationService = {
    verifyAndPersistDoctorVerification:
      jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const mockSignatureUploadService = {
    generateUploadToken: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const mockStoredFileUrlResolver = {
    resolveWithStoredUrl: jest
      .fn<
        (url: string | null | undefined) => Promise<{
          url: string | null;
          storedUrl: string | null;
        }>
      >()
      .mockImplementation(async (url) => ({
        url: url ?? null,
        storedUrl: url ?? null,
      })),
  };

  const mockStorageProvider = {
    supportsSignedUrls: true,
    upload: jest.fn<(...args: unknown[]) => Promise<string>>(),
    delete: jest.fn<(...args: unknown[]) => Promise<void>>(),
    uploadBuffer: jest.fn<(...args: unknown[]) => Promise<string>>(),
    generateSignedUrl: jest.fn<(...args: unknown[]) => Promise<string>>(),
  };

  const mockDoctorRepository = {
    createDoctorWithClinic: jest.fn<
      IDoctorRepository['createDoctorWithClinic']
    >(async (user, link, primarySpecialization) => {
      const created = await mockDoctorPersistencePort.user.create({
        data: {
          ...user,
          password: user.hashedPassword,
        },
      });
      await mockDoctorPersistencePort.doctorClinic.create({
        data: link,
      });
      if (primarySpecialization) {
        await mockDoctorPersistencePort.doctorSpecialization.create({
          data: {
            doctorId: (created as { id: string }).id,
            specialization: primarySpecialization,
          },
        });
      }
      return created as never;
    }),
    updateDoctorProfile: jest.fn<IDoctorRepository['updateDoctorProfile']>(
      async (id, patch) => {
        const result = await mockDoctorPersistencePort.user.updateMany({
          where: { id },
          data: patch,
        });
        return (result as { count: number }).count;
      },
    ),
    findDoctorForResponse: jest.fn<IDoctorRepository['findDoctorForResponse']>(
      async (id) =>
        (await mockDoctorPersistencePort.user.findFirst({
          where: { id },
          select: expect.any(Object) as never,
        })) as never,
    ),
    updateDoctorClinicRole: jest.fn<
      IDoctorRepository['updateDoctorClinicRole']
    >(async (doctorId, role) => {
      await mockDoctorPersistencePort.doctorClinic.updateMany({
        where: { doctorId },
        data: { role },
      });
    }),
    deleteDoctorCascading: jest.fn<IDoctorRepository['deleteDoctorCascading']>(
      async (id) => {
        await mockDoctorPersistencePort.doctorEducation.deleteMany({
          where: { doctorId: id },
        });
        await mockDoctorPersistencePort.doctorCertification.deleteMany({
          where: { doctorId: id },
        });
        await mockDoctorPersistencePort.doctorSpecialization.deleteMany({
          where: { doctorId: id },
        });
        await mockDoctorPersistencePort.doctorClinic.deleteMany({
          where: { doctorId: id },
        });
        const result = await mockDoctorPersistencePort.user.deleteMany({
          where: { id },
        });
        return (result as { count: number }).count;
      },
    ),
  } satisfies IDoctorRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorsService,
        DoctorProfileService,
        {
          provide: DOCTOR_PERSISTENCE_PORT,
          useValue: mockDoctorPersistencePort,
        },
        {
          provide: DoctorVerificationService,
          useValue: mockDoctorVerificationService,
        },
        {
          provide: SignatureUploadService,
          useValue: mockSignatureUploadService,
        },
        {
          provide: StoredFileUrlResolverService,
          useValue: mockStoredFileUrlResolver,
        },
        {
          provide: StorageProvider,
          useValue: mockStorageProvider,
        },
        {
          provide: DOCTOR_REPOSITORY_TOKEN,
          useValue: mockDoctorRepository,
        },
        {
          provide: AuditService,
          useValue: { logAction: jest.fn(async () => undefined) },
        },
        clockPortTestProvider(),
      ],
    }).compile();

    service = module.get<DoctorsService>(DoctorsService);
    prisma = module.get<DoctorPersistencePort>(DOCTOR_PERSISTENCE_PORT);

    jest.clearAllMocks();
    mockDoctorVerificationService.verifyAndPersistDoctorVerification.mockResolvedValue(
      mockDoctor,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all doctors for a clinic', async () => {
      mockDoctorPersistencePort.doctorClinic.findMany.mockResolvedValue([
        { doctor: mockDoctor },
      ]);
      mockDoctorPersistencePort.user.findMany.mockResolvedValue([]);

      const result = await service.findAll('clinic-123');

      expect(result).toBeDefined();
      expect(
        mockDoctorPersistencePort.doctorClinic.findMany,
      ).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a doctor by id', async () => {
      mockDoctorPersistencePort.user.findFirst.mockResolvedValue(mockDoctor);

      const result = await service.findOne('doctor-123');

      expect(result).toEqual(mockDoctor);
      expect(mockDoctorPersistencePort.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'doctor-123' },
        select: expect.any(Object),
      });
    });

    it('should throw NotFoundException if doctor not found', async () => {
      mockDoctorPersistencePort.user.findFirst.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new doctor', async () => {
      const createData = {
        email: 'newdoctor@example.com',
        password: 'password123',
        name: 'Dr. New Doctor',
        specialization: Specialization.PEDIATRICS,
      };

      mockDoctorPersistencePort.doctorClinic.findFirst.mockResolvedValue(null);
      mockDoctorPersistencePort.user.create.mockResolvedValue({
        id: 'new-doctor',
        ...createData,
      });
      mockDoctorPersistencePort.doctorClinic.create.mockResolvedValue({});

      const result = await service.create('clinic-123', createData);

      expect(result.email).toBe('newdoctor@example.com');
      expect(mockDoctorPersistencePort.user.create).toHaveBeenCalled();
      expect(mockDoctorPersistencePort.doctorClinic.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update doctor information', async () => {
      const updateData = { name: 'Dr. Updated Name' };
      mockDoctorPersistencePort.user.updateMany.mockResolvedValue({ count: 1 });
      mockDoctorPersistencePort.user.findFirst.mockResolvedValue({
        ...mockDoctor,
        ...updateData,
      });

      const result = await service.update('doctor-123', updateData);

      expect(result.name).toBe('Dr. Updated Name');
    });
  });

  describe('remove', () => {
    it('should delete a doctor', async () => {
      mockDoctorPersistencePort.doctorEducation.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockDoctorPersistencePort.doctorCertification.deleteMany.mockResolvedValue(
        {
          count: 0,
        },
      );
      mockDoctorPersistencePort.doctorSpecialization.deleteMany.mockResolvedValue(
        {
          count: 0,
        },
      );
      mockDoctorPersistencePort.doctorClinic.deleteMany.mockResolvedValue({
        count: 1,
      });
      mockDoctorPersistencePort.user.deleteMany.mockResolvedValue({ count: 1 });

      await service.remove('doctor-123');

      expect(
        mockDoctorPersistencePort.doctorEducation.deleteMany,
      ).toHaveBeenCalled();
      expect(mockDoctorPersistencePort.user.deleteMany).toHaveBeenCalledWith({
        where: { id: 'doctor-123' },
      });
    });
  });

  describe('addEducation', () => {
    it('should add education to doctor profile', async () => {
      const eduData = {
        degree: 'MD',
        institution: 'University Hospital',
        startYear: 2015,
        endYear: 2020,
      };
      mockDoctorPersistencePort.doctorEducation.create.mockResolvedValue({
        id: 'edu-new',
        doctorId: 'doctor-123',
        ...eduData,
      });

      const result = await service.addEducation('doctor-123', eduData);

      expect(result.degree).toBe('MD');
    });
  });

  describe('getEducationHistory', () => {
    it('should return education history', async () => {
      mockDoctorPersistencePort.doctorEducation.findMany.mockResolvedValue([
        mockEducation,
      ]);

      const result = await service.getEducationHistory('doctor-123');

      expect(result).toHaveLength(1);
      expect(result[0].degree).toBe('MBBS');
    });
  });

  describe('addCertification', () => {
    it('should add certification to doctor profile', async () => {
      const certData = {
        name: 'Advanced Cardiac Life Support',
        issuingBody: 'AHA',
        issueDate: new Date(),
      };
      mockDoctorPersistencePort.doctorCertification.create.mockResolvedValue({
        id: 'cert-new',
        doctorId: 'doctor-123',
        ...certData,
      });

      const result = await service.addCertification('doctor-123', certData);

      expect(result.name).toBe('Advanced Cardiac Life Support');
    });
  });

  describe('getCertifications', () => {
    it('should return certifications', async () => {
      mockDoctorPersistencePort.doctorCertification.findMany.mockResolvedValue([
        mockCertification,
      ]);

      const result = await service.getCertifications('doctor-123');

      expect(result).toHaveLength(1);
    });
  });

  describe('getAvailableSpecializations', () => {
    it('should return list of available specializations', () => {
      const result = service.getAvailableSpecializations();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getAvailableHospitalRoles', () => {
    it('should return list of available hospital roles', () => {
      const result = service.getAvailableHospitalRoles();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('formatSpecializationLabel', () => {
    it('should format specialization enum to readable label from getAvailableSpecializations result', () => {
      const specializations = service.getAvailableSpecializations();
      const hasLabel = specializations.some(
        (s) => s.label && typeof s.label === 'string',
      );
      expect(hasLabel).toBe(true);
    });
  });

  describe('formatHospitalRoleLabel', () => {
    it('should format hospital role enum to readable label from getAvailableHospitalRoles result', () => {
      const roles = service.getAvailableHospitalRoles();
      const hasLabel = roles.some(
        (r) => r.label && typeof r.label === 'string',
      );
      expect(hasLabel).toBe(true);
    });
  });
});
