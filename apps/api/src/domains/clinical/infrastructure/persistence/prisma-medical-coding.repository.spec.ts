import { describe, expect, it, jest } from '@jest/globals';
import { PrismaMedicalCodingRepository } from './prisma-medical-coding.repository';
import type { PrismaService } from '@/prisma/prisma.service';

describe('PrismaMedicalCodingRepository', () => {
  describe('onModuleInit', () => {
    it('prewarms medical-code caches without blocking bootstrap', () => {
      const readClient = {
        icdCode: {
          findMany: jest.fn(async () => []) as jest.Mock,
        },
        cptCode: {
          findMany: jest.fn(async () => []) as jest.Mock,
        },
      };
      const prisma = {
        getReadClient: jest.fn(() => readClient) as jest.Mock,
      } as PrismaService & {
        getReadClient: jest.Mock;
      };

      const repository = new PrismaMedicalCodingRepository(prisma);
      const result = repository.onModuleInit();

      expect(result).toBeUndefined();
      expect(prisma.getReadClient).toHaveBeenCalledTimes(2);
      expect(readClient.icdCode.findMany).toHaveBeenCalledWith({
        where: { isCommon: true },
        take: 50,
      });
      expect(readClient.cptCode.findMany).toHaveBeenCalledWith({
        where: { isCommon: true },
        take: 50,
      });
    });
  });

  describe('searchIcdCodes / searchCptCodes', () => {
    it('passes the limit to the read client', async () => {
      const icdResult = [
        { id: 'icd-1', code: 'E11.9', description: 'Type 2 diabetes' },
      ];
      const cptResult = [
        { id: 'cpt-1', code: '99213', description: 'Office visit' },
      ];
      const readClient = {
        icdCode: {
          findMany: jest.fn(async () => icdResult) as jest.Mock,
        },
        cptCode: {
          findMany: jest.fn(async () => cptResult) as jest.Mock,
        },
      };
      const prisma = {
        getReadClient: jest.fn(() => readClient) as jest.Mock,
      } as PrismaService & { getReadClient: jest.Mock };

      const repository = new PrismaMedicalCodingRepository(prisma);
      const icd = await repository.searchIcdCodes('diabetes', 5);
      const cpt = await repository.searchCptCodes('office', 5);

      expect(icd).toEqual(icdResult);
      expect(cpt).toEqual(cptResult);
      expect(readClient.icdCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
      expect(readClient.cptCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });

  describe('addFavorite', () => {
    it('upserts the ICD code then creates a doctor favorite row', async () => {
      const icdCode = {
        upsert: jest.fn(async () => ({ id: 'icd-new' })) as jest.Mock,
      };
      const doctorFavoriteCode = {
        create: jest.fn(async () => Object.create(null)) as jest.Mock,
      };
      // The repo calls `prisma.<delegate>` directly, not via read/write clients.
      const prisma = {
        getReadClient: jest.fn(),
        getWriteClient: jest.fn(),
        icdCode,
        doctorFavoriteCode,
      } as PrismaService & {
        getReadClient: jest.Mock;
        getWriteClient: jest.Mock;
        icdCode: { upsert: jest.Mock };
        doctorFavoriteCode: { create: jest.Mock };
      };

      const repository = new PrismaMedicalCodingRepository(prisma);
      await repository.addFavorite(
        'user-1',
        'E11.9',
        'Type 2 diabetes',
        'Endocrine',
      );

      expect(icdCode.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { code: 'E11.9' },
          create: expect.objectContaining({ code: 'E11.9' }),
        }),
      );
      expect(doctorFavoriteCode.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', icdCodeId: 'icd-new' },
      });
    });
  });

  describe('sync writes (createCommon/updateCommon + findExisting)', () => {
    it('creates only codes that do not already exist (skipDuplicates)', async () => {
      const icdCode = {
        findMany: jest.fn(async () => [
          {
            code: 'E11.9',
            description: 'Type 2 diabetes',
            category: 'Endocrine',
          },
        ]) as jest.Mock,
        createMany: jest.fn(async () => ({ count: 1 })) as jest.Mock,
      };
      const prisma = {
        getReadClient: jest.fn(() => ({ icdCode })) as jest.Mock,
        icdCode,
      } as PrismaService & {
        getReadClient: jest.Mock;
        icdCode: { findMany: jest.Mock; createMany: jest.Mock };
      };
      const repository = new PrismaMedicalCodingRepository(prisma);

      const existing = await repository.findExistingIcdCodes([
        'E11.9',
        'A00.0',
      ]);
      await repository.createCommonIcdCodes([
        {
          code: 'E11.9',
          description: 'Type 2 diabetes',
          category: 'Endocrine',
        },
        { code: 'A00.0', description: 'Cholera', category: 'Infectious' },
      ]);

      expect(existing).toHaveLength(1);
      expect(icdCode.findMany).toHaveBeenCalledWith({
        where: { code: { in: ['E11.9', 'A00.0'] } },
        select: expect.any(Object),
      });
      expect(icdCode.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ skipDuplicates: true }),
      );
    });

    it('propagates a partial-failure on updateMany so the sync can resume next tick', async () => {
      const updateMock = jest.fn<() => Promise<unknown>>();
      const icdCode = { update: updateMock };
      const prisma = {
        $transaction: jest.fn(async (queries: unknown[]) => {
          // Simulate the first update succeeding and the second failing — the
          // Prisma $transaction rejects atomically; nothing is silently left
          // half-applied, so the next sync tick resumes cleanly.
          for (const q of queries) {
            await (q as Promise<unknown>);
          }
        }) as jest.Mock,
        icdCode,
      } as PrismaService & {
        $transaction: jest.Mock;
        icdCode: { update: jest.Mock };
      };
      updateMock
        .mockResolvedValueOnce(Object.create(null))
        .mockRejectedValueOnce(new Error('constraint violation'));
      const repository = new PrismaMedicalCodingRepository(prisma);

      await expect(
        repository.updateCommonIcdCodes([
          { code: 'E11.9', description: 'updated', category: 'Endocrine' },
          { code: 'A00.0', description: 'updated', category: 'Infectious' },
        ]),
      ).rejects.toThrow('constraint violation');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('returns existing CPT codes without creating duplicates', async () => {
      const cptCode = {
        findMany: jest.fn(async () => []) as jest.Mock,
        createMany: jest.fn(async () => ({ count: 0 })) as jest.Mock,
      };
      const prisma = {
        getReadClient: jest.fn(() => ({ cptCode })) as jest.Mock,
        cptCode,
      } as PrismaService & {
        getReadClient: jest.Mock;
        cptCode: { findMany: jest.Mock; createMany: jest.Mock };
      };
      const repository = new PrismaMedicalCodingRepository(prisma);

      const existing = await repository.findExistingCptCodes(['99213']);
      await repository.createCommonCptCodes([
        { code: '99213', description: 'Office visit', category: 'E&M' },
      ]);

      expect(existing).toEqual([]);
      expect(cptCode.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ skipDuplicates: true }),
      );
    });
  });

  describe('getUncodedVisits', () => {
    it('queries appointments for the clinic with the COMPLETED + diagnoses.none filter', async () => {
      const visits = [{ id: 'visit-1', patient: { firstName: 'Ada' } }];
      const readClient = {
        appointment: {
          findMany: jest.fn(async () => visits) as jest.Mock,
        },
      };
      const prisma = {
        getReadClient: jest.fn(() => readClient) as jest.Mock,
      } as PrismaService & { getReadClient: jest.Mock };

      const repository = new PrismaMedicalCodingRepository(prisma);
      const result = await repository.getUncodedVisits('clinic-1');

      expect(result).toEqual(visits);
      expect(readClient.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clinicId: 'clinic-1',
            status: 'COMPLETED',
            diagnoses: { none: {} },
          }),
        }),
      );
    });
  });
});
