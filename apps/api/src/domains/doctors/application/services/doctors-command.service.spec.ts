import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { DoctorsCommandService } from './doctors-command.service';
import { PrismaService } from '@/prisma/prisma.service';
import { DoctorVerificationService } from './doctor-verification.service';
import { SignatureUploadService } from './signature-upload.service';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';
import { StorageProvider } from '@/domains/documents/infrastructure/storage.provider';
import { DoctorsQueryService } from './doctors-query.service';
import { DoctorProfileService } from './doctor-profile.service';
import { DoctorAdminVerificationCommandService } from './doctor-admin-verification-command.service';
import { DoctorVerificationStatus, Role } from '@workspace/db';

describe('DoctorsCommandService', () => {
  let service: DoctorsCommandService;
  let prisma: jest.Mocked<PrismaService>;
  let doctorVerificationService: jest.Mocked<DoctorVerificationService>;
  let signatureUploadService: jest.Mocked<SignatureUploadService>;
  let storedFileUrlResolver: jest.Mocked<StoredFileUrlResolverService>;
  let storageProvider: jest.Mocked<StorageProvider>;
  let queryService: jest.Mocked<DoctorsQueryService>;
  let profileService: jest.Mocked<DoctorProfileService>;
  let adminVerificationService: jest.Mocked<DoctorAdminVerificationCommandService>;

  beforeEach(() => {
    prisma = {
      user: {
        create: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      doctorClinic: {
        create: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      doctorSpecialization: { create: jest.fn(), deleteMany: jest.fn() },
      doctorEducation: { deleteMany: jest.fn() },
      doctorCertification: { deleteMany: jest.fn() },
    } as unknown as jest.Mocked<PrismaService>;

    doctorVerificationService = Object.create(
      DoctorVerificationService.prototype,
    ) as jest.Mocked<DoctorVerificationService>;
    doctorVerificationService.verifyAndPersistDoctorVerification = jest.fn();

    signatureUploadService = Object.create(
      SignatureUploadService.prototype,
    ) as jest.Mocked<SignatureUploadService>;
    signatureUploadService.generateUploadToken = jest.fn() as never;

    storedFileUrlResolver = Object.create(
      StoredFileUrlResolverService.prototype,
    ) as jest.Mocked<StoredFileUrlResolverService>;

    storageProvider = {} as jest.Mocked<StorageProvider>;

    queryService = Object.create(
      DoctorsQueryService.prototype,
    ) as jest.Mocked<DoctorsQueryService>;
    queryService.findOne = jest.fn();
    queryService.resolveDoctorSignatureUrl = jest.fn() as never;

    profileService = Object.create(
      DoctorProfileService.prototype,
    ) as jest.Mocked<DoctorProfileService>;

    adminVerificationService = Object.create(
      DoctorAdminVerificationCommandService.prototype,
    ) as jest.Mocked<DoctorAdminVerificationCommandService>;
    adminVerificationService.adminVerifyDoctor = jest.fn();
    adminVerificationService.adminRejectDoctor = jest.fn();

    service = new DoctorsCommandService(
      prisma,
      doctorVerificationService,
      signatureUploadService,
      storedFileUrlResolver,
      storageProvider,
      queryService,
      profileService,
      adminVerificationService,
    );
  });

  describe('create', () => {
    it('should create a doctor and trigger verification', async () => {
      const user = {
        id: 'doc-1',
        email: 'doc@example.com',
        name: 'Dr. Smith',
        role: Role.DOCTOR,
        specialization: null,
        hospitalRole: null,
        qualification: null,
      };
      (prisma.user.create as jest.Mock).mockResolvedValueOnce(user as never);
      (prisma.doctorClinic.create as jest.Mock).mockResolvedValueOnce(
        {} as never,
      );
      (
        doctorVerificationService.verifyAndPersistDoctorVerification as jest.Mock
      ).mockResolvedValueOnce(undefined as never);

      const result = await service.create('clinic-1', {
        email: 'doc@example.com',
        password: 'password123',
        name: 'Dr. Smith',
      });

      expect(result.id).toBe('doc-1');
      expect(
        doctorVerificationService.verifyAndPersistDoctorVerification,
      ).toHaveBeenCalledWith('doc-1');
    });

    it('should create a doctor with specialization', async () => {
      const user = {
        id: 'doc-2',
        email: 'doc@example.com',
        name: 'Dr. Jones',
        role: Role.DOCTOR,
        specialization: 'CARDIOLOGY',
        hospitalRole: null,
        qualification: null,
      };
      (prisma.user.create as jest.Mock).mockResolvedValueOnce(user as never);
      (prisma.doctorClinic.create as jest.Mock).mockResolvedValueOnce(
        {} as never,
      );
      (prisma.doctorSpecialization.create as jest.Mock).mockResolvedValueOnce(
        {} as never,
      );
      (
        doctorVerificationService.verifyAndPersistDoctorVerification as jest.Mock
      ).mockResolvedValueOnce(undefined as never);

      const result = await service.create('clinic-1', {
        email: 'doc@example.com',
        password: 'password123',
        name: 'Dr. Jones',
        specialization: 'CARDIOLOGY' as never,
      });

      expect(result.specialization).toBe('CARDIOLOGY');
      expect(prisma.doctorSpecialization.create).toHaveBeenCalled();
    });
  });

  describe('adminVerifyDoctor', () => {
    it('should delegate to DoctorAdminVerificationCommandService', async () => {
      const expected = {
        id: 'doc-1',
        verificationStatus: DoctorVerificationStatus.VERIFIED,
      };
      (
        adminVerificationService.adminVerifyDoctor as jest.Mock
      ).mockResolvedValueOnce(expected as never);

      const result = await service.adminVerifyDoctor(
        'doc-1',
        'admin-1',
        'looks good',
      );

      expect(adminVerificationService.adminVerifyDoctor).toHaveBeenCalledWith(
        'doc-1',
        'admin-1',
        'looks good',
      );
      expect(result).toMatchObject({ id: 'doc-1' });
    });
  });

  describe('remove', () => {
    it('should remove doctor and all related records', async () => {
      (prisma.doctorEducation.deleteMany as jest.Mock).mockResolvedValueOnce(
        {} as never,
      );
      (
        prisma.doctorCertification.deleteMany as jest.Mock
      ).mockResolvedValueOnce({} as never);
      (
        prisma.doctorSpecialization.deleteMany as jest.Mock
      ).mockResolvedValueOnce({} as never);
      (prisma.doctorClinic.deleteMany as jest.Mock).mockResolvedValueOnce(
        {} as never,
      );
      (prisma.user.deleteMany as jest.Mock).mockResolvedValueOnce({
        count: 1,
      } as never);

      const result = await service.remove('doc-1');

      expect(result).toEqual({ success: true });
    });
  });
});
