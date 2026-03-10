import { Test, TestingModule } from '@nestjs/testing';
import { DoctorsService } from './doctors.service';
import { PrismaService } from '@/prisma/prisma.service';
import { DoctorVerificationService } from './doctor-verification.service';
import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('DoctorsService', () => {
  let service: DoctorsService;
  let _prisma: PrismaService;

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

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    doctorClinic: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    doctorEducation: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    doctorCertification: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    doctorSpecialization: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockDoctorVerificationService = {
    verifyAndPersistDoctorVerification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: DoctorVerificationService,
          useValue: mockDoctorVerificationService,
        },
      ],
    }).compile();

    service = module.get<DoctorsService>(DoctorsService);
    prisma = module.get<PrismaService>(PrismaService);

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
      mockPrismaService.doctorClinic.findMany.mockResolvedValue([
        { doctor: mockDoctor },
      ]);
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.findAll('clinic-123');

      expect(result).toBeDefined();
      expect(mockPrismaService.doctorClinic.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a doctor by id', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockDoctor);

      const result = await service.findOne('doctor-123');

      expect(result).toEqual(mockDoctor);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'doctor-123' },
        select: expect.any(Object),
      });
    });

    it('should throw NotFoundException if doctor not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

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
        specialization: 'PEDIATRICS' as never,
      };

      mockPrismaService.doctorClinic.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'new-doctor',
        ...createData,
      });
      mockPrismaService.doctorClinic.create.mockResolvedValue({});

      const result = await service.create('clinic-123', createData);

      expect(result.email).toBe('newdoctor@example.com');
      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(mockPrismaService.doctorClinic.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update doctor information', async () => {
      const updateData = { name: 'Dr. Updated Name' };
      mockPrismaService.user.update.mockResolvedValue({
        ...mockDoctor,
        ...updateData,
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockDoctor,
        ...updateData,
      });

      const result = await service.update('doctor-123', updateData);

      expect(result.name).toBe('Dr. Updated Name');
    });
  });

  describe('remove', () => {
    it('should delete a doctor', async () => {
      mockPrismaService.doctorEducation.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.doctorCertification.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.doctorSpecialization.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.doctorClinic.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaService.user.delete.mockResolvedValue(mockDoctor);

      await service.remove('doctor-123');

      expect(mockPrismaService.doctorEducation.deleteMany).toHaveBeenCalled();
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
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
      mockPrismaService.doctorEducation.create.mockResolvedValue({
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
      mockPrismaService.doctorEducation.findMany.mockResolvedValue([
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
      mockPrismaService.doctorCertification.create.mockResolvedValue({
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
      mockPrismaService.doctorCertification.findMany.mockResolvedValue([
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
