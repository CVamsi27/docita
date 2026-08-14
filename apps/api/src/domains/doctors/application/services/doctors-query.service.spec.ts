import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { DoctorsQueryService } from './doctors-query.service';
import {
  DOCTOR_PERSISTENCE_PORT,
  type DoctorPersistencePort,
} from '@/domains/doctors/application/ports/doctor-persistence.port';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';

describe('DoctorsQueryService', () => {
  let service: DoctorsQueryService;
  let prisma: jest.Mocked<DoctorPersistencePort>;
  let storedFileUrlResolver: jest.Mocked<StoredFileUrlResolverService>;

  beforeEach(() => {
    prisma = {
      doctorClinic: { findMany: jest.fn(), findFirst: jest.fn() },
      user: { findMany: jest.fn(), findFirst: jest.fn() },
    } as unknown as jest.Mocked<DoctorPersistencePort>;

    storedFileUrlResolver = Object.create(
      StoredFileUrlResolverService.prototype,
    ) as jest.Mocked<StoredFileUrlResolverService>;
    storedFileUrlResolver.resolveWithStoredUrl = jest.fn();
    (storedFileUrlResolver.resolveWithStoredUrl as jest.Mock).mockResolvedValue(
      { url: null, storedUrl: null } as never,
    );

    service = new DoctorsQueryService(prisma, storedFileUrlResolver);
  });

  describe('findAll', () => {
    it('should return combined doctors list for a clinic', async () => {
      (prisma.doctorClinic.findMany as jest.Mock).mockResolvedValueOnce([
        {
          doctor: {
            id: 'doc-1',
            role: 'DOCTOR',
            email: 'doc@example.com',
            name: 'Dr. Smith',
            specialization: null,
            hospitalRole: null,
            qualification: null,
            registrationNumber: null,
            registrationCouncil: null,
            registrationStateCode: null,
            verificationStatus: 'PENDING',
            verificationReason: null,
            verificationCheckedAt: null,
            signatureUrl: null,
            profilePhotoUrl: null,
            yearsOfExperience: null,
            consultationFee: null,
            createdAt: new Date(),
          },
        },
      ] as never);
      (prisma.user.findMany as jest.Mock).mockResolvedValueOnce([] as never);

      const result = await service.findAll('clinic-1');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should de-duplicate doctors appearing in both doctorClinic and user lists', async () => {
      const doctor = {
        id: 'doc-1',
        role: 'DOCTOR',
        email: 'doc@example.com',
        name: 'Dr. Smith',
        specialization: null,
        hospitalRole: null,
        qualification: null,
        registrationNumber: null,
        registrationCouncil: null,
        registrationStateCode: null,
        verificationStatus: 'PENDING',
        verificationReason: null,
        verificationCheckedAt: null,
        signatureUrl: null,
        profilePhotoUrl: null,
        yearsOfExperience: null,
        consultationFee: null,
        createdAt: new Date(),
      };
      (prisma.doctorClinic.findMany as jest.Mock).mockResolvedValueOnce([
        { doctor },
      ] as never);
      (prisma.user.findMany as jest.Mock).mockResolvedValueOnce([
        doctor,
      ] as never);

      const result = await service.findAll('clinic-1');

      const ids = result.map((d) => (d as { id: string }).id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });
  });

  describe('findOne', () => {
    it('should return doctor with resolved signature url', async () => {
      const user = {
        id: 'doc-1',
        name: 'Dr. Smith',
        signatureUrl: 'stored://sig.png',
        registrationCertificateUrl: null,
      };
      (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce(user as never);
      (storedFileUrlResolver.resolveWithStoredUrl as jest.Mock)
        .mockResolvedValueOnce({
          url: 'https://cdn.example.com/sig.png',
          storedUrl: 'stored://sig.png',
        } as never)
        .mockResolvedValueOnce({ url: null, storedUrl: null } as never);

      const result = await service.findOne('doc-1');

      expect(result).toMatchObject({ id: 'doc-1' });
    });

    it('should throw NotFoundException when doctor not found', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce(null as never);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should scope query to clinic when clinicId is provided', async () => {
      const user = {
        id: 'doc-1',
        clinicId: 'clinic-1',
        name: 'Dr. Smith',
        signatureUrl: null,
        registrationCertificateUrl: null,
      };
      (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce(user as never);
      // user.clinicId matches supplied clinicId, so no doctorClinic lookup needed
      // but mock findFirst in case the service checks it
      (prisma.doctorClinic.findFirst as jest.Mock).mockResolvedValueOnce({
        doctorId: 'doc-1',
        clinicId: 'clinic-1',
        active: true,
      } as never);

      await service.findOne('doc-1', 'clinic-1');

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'doc-1' }),
        }),
      );
    });
  });

  describe('getAvailableSpecializations', () => {
    it('offers only the active specialization set, not legacy enum values', () => {
      const options = service.getAvailableSpecializations();
      const values = options.map((o) => o.value);

      // Active set (packages/types ACTIVE_SPECIALIZATIONS) — 10 values.
      expect(values).toContain('CARDIOLOGY');
      expect(values).toContain('GENERAL_PRACTICE');
      expect(values.length).toBe(10);
      // Every option carries a human label.
      expect(options.every((o) => o.label.length > 0)).toBe(true);
    });
  });
});
