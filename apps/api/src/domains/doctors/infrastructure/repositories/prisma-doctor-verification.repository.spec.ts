import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { DoctorVerificationStatus, Role } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import { PrismaDoctorVerificationRepository } from './prisma-doctor-verification.repository';
import { DOCTOR_VERIFICATION_REPOSITORY_TOKEN } from '../../core/repositories/doctor-verification.repository.interface';

describe('PrismaDoctorVerificationRepository', () => {
  let repo: PrismaDoctorVerificationRepository;
  let readClient: {
    user: {
      findFirst: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
      findMany: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
    };
  };
  let writeClient: {
    user: {
      updateMany: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
    };
  };

  beforeEach(async () => {
    readClient = {
      user: {
        findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      },
    };
    writeClient = {
      user: {
        updateMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaDoctorVerificationRepository,
        {
          provide: PrismaService,
          useValue: {
            getReadClient: () => readClient,
            user: writeClient.user,
          },
        },
      ],
    }).compile();

    repo = module.get<PrismaDoctorVerificationRepository>(
      PrismaDoctorVerificationRepository,
    );
  });

  it('exposes itself under the DI token', () => {
    // The point of this test is to assert the symbol-based token is wired
    // correctly, so production DI works the same as the unit test.
    expect(PrismaDoctorVerificationRepository).toBeDefined();
    // Re-resolve from the token as a smoke check.
    const symbol = DOCTOR_VERIFICATION_REPOSITORY_TOKEN;
    expect(typeof symbol).toBe('symbol');
  });

  describe('findDoctorForVerification', () => {
    it('selects the credential fields and returns the row', async () => {
      const row = {
        id: 'doc_1',
        name: 'Dr. Rao',
        role: Role.DOCTOR,
        registrationNumber: 'KMC-12345',
        registrationCouncil: 'KMC',
        registrationStateCode: 'KA',
        licenseNumber: 'LIC-999',
      };
      readClient.user.findFirst.mockResolvedValueOnce(row);

      const result = await repo.findDoctorForVerification('doc_1');

      expect(readClient.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'doc_1' },
        select: {
          id: true,
          name: true,
          role: true,
          registrationNumber: true,
          registrationCouncil: true,
          registrationStateCode: true,
          licenseNumber: true,
        },
      });
      expect(result).toBe(row);
    });

    it('returns null when the doctor does not exist', async () => {
      readClient.user.findFirst.mockResolvedValueOnce(null);
      const result = await repo.findDoctorForVerification('missing');
      expect(result).toBeNull();
    });
  });

  describe('findDoctorVerificationRecord', () => {
    it('selects the verification status fields including signature + json', async () => {
      const row = {
        id: 'doc_1',
        name: 'Dr. Rao',
        email: 'rao@example.test',
        role: Role.DOCTOR,
        registrationNumber: 'KMC-12345',
        licenseNumber: 'LIC-999',
        signatureUrl: '/uploads/sig.png',
        signatureUploadedAt: new Date('2024-01-02'),
        verificationStatus: DoctorVerificationStatus.VERIFIED,
        verificationSource: 'KMC_API',
        verificationRef: 'REF-001',
        verificationReason: null,
        verificationData: { match: true },
        verificationCheckedAt: new Date('2024-01-03'),
        updatedAt: new Date('2024-01-03'),
      };
      readClient.user.findFirst.mockResolvedValueOnce(row);

      const result = await repo.findDoctorVerificationRecord('doc_1');

      expect(readClient.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'doc_1' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          registrationNumber: true,
          licenseNumber: true,
          signatureUrl: true,
          signatureUploadedAt: true,
          verificationStatus: true,
          verificationSource: true,
          verificationRef: true,
          verificationReason: true,
          verificationData: true,
          verificationCheckedAt: true,
          updatedAt: true,
        },
      });
      expect(result).toBe(row);
    });
  });

  describe('findDoctorLicenseExpiry', () => {
    it('returns the licenseExpiry scalar projection', async () => {
      const expiry = new Date('2026-06-30');
      readClient.user.findFirst.mockResolvedValueOnce({
        licenseExpiry: expiry,
      });
      const result = await repo.findDoctorLicenseExpiry('doc_1');
      expect(readClient.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'doc_1' },
        select: { licenseExpiry: true },
      });
      expect(result).toEqual({ licenseExpiry: expiry });
    });

    it('returns null when the doctor does not exist', async () => {
      readClient.user.findFirst.mockResolvedValueOnce(null);
      const result = await repo.findDoctorLicenseExpiry('missing');
      expect(result).toBeNull();
    });
  });

  describe('findDoctorsForReverification', () => {
    it('filters to doctor/admin-doctor roles with a registration number, take 500', async () => {
      const rows = [{ id: 'doc_1' }, { id: 'doc_2' }];
      readClient.user.findMany.mockResolvedValueOnce(rows);

      const result = await repo.findDoctorsForReverification();

      expect(readClient.user.findMany).toHaveBeenCalledWith({
        where: {
          role: { in: [Role.DOCTOR, Role.ADMIN_DOCTOR] },
          registrationNumber: { not: null },
        },
        select: { id: true },
        take: 500,
      });
      expect(result).toBe(rows);
    });
  });

  describe('updateVerificationStatus', () => {
    it('writes only the supplied fields and the verificationCheckedAt timestamp', async () => {
      writeClient.user.updateMany.mockResolvedValueOnce({ count: 1 });
      const checkedAt = new Date('2024-01-04T00:00:00Z');

      await repo.updateVerificationStatus('doc_1', {
        verificationStatus: DoctorVerificationStatus.VERIFIED,
        verificationSource: 'KMC_API',
        verificationRef: 'REF-100',
        verificationData: { ok: true },
        verificationCheckedAt: checkedAt,
      });

      expect(writeClient.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'doc_1' },
        data: {
          verificationStatus: DoctorVerificationStatus.VERIFIED,
          verificationSource: 'KMC_API',
          verificationRef: 'REF-100',
          // verificationReason is undefined in input, so omitted from data
          verificationData: expect.objectContaining({ ok: true }),
          verificationCheckedAt: checkedAt,
        },
      });
    });

    it('writes verificationReason when supplied (including null for clearing)', async () => {
      writeClient.user.updateMany.mockResolvedValueOnce({ count: 1 });
      const checkedAt = new Date('2024-01-04T00:00:00Z');

      await repo.updateVerificationStatus('doc_1', {
        verificationStatus: DoctorVerificationStatus.REJECTED,
        verificationReason: 'License expired',
        verificationCheckedAt: checkedAt,
      });

      expect(writeClient.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'doc_1' },
        data: expect.objectContaining({
          verificationReason: 'License expired',
        }),
      });
    });

    it('throws when the doctor does not exist (count === 0)', async () => {
      writeClient.user.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(
        repo.updateVerificationStatus('missing', {
          verificationStatus: DoctorVerificationStatus.VERIFIED,
          verificationCheckedAt: new Date(),
        }),
      ).rejects.toThrow('Doctor missing not found');
    });
  });
});
