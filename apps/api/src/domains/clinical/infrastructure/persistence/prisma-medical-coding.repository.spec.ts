import { describe, expect, it, jest } from '@jest/globals';
import { CodeCatalogSyncStatus, CodeCatalogSystem } from '@workspace/db';
import { PrismaMedicalCodingRepository } from './prisma-medical-coding.repository';
import type { PrismaService } from '@/prisma/prisma.service';

/** Provenance every synced code row is stamped with. */
const PROVENANCE = {
  source: 'NLM',
  sourceVersion: '2026-01',
  syncedAt: new Date('2026-01-01T00:00:00.000Z'),
};

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
      await repository.createCommonIcdCodes(
        [
          {
            code: 'E11.9',
            description: 'Type 2 diabetes',
            category: 'Endocrine',
          },
          { code: 'A00.0', description: 'Cholera', category: 'Infectious' },
        ],
        PROVENANCE,
      );

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
        repository.updateCommonIcdCodes(
          [
            { code: 'E11.9', description: 'updated', category: 'Endocrine' },
            { code: 'A00.0', description: 'updated', category: 'Infectious' },
          ],
          PROVENANCE,
        ),
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
      await repository.createCommonCptCodes(
        [{ code: '99213', description: 'Office visit', category: 'E&M' }],
        PROVENANCE,
      );

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

  describe('catalog provenance', () => {
    it('stamps source, source version and sync instant onto new ICD rows', async () => {
      const icdCode = {
        findMany: jest.fn(async (_args?: unknown) => []),
        createMany: jest.fn(async (_args?: unknown) => ({ count: 1 })),
      };
      const prisma = {
        getReadClient: jest.fn(() => ({ icdCode })),
        icdCode,
      } as unknown as PrismaService;
      const repository = new PrismaMedicalCodingRepository(prisma);

      await repository.createCommonIcdCodes(
        [{ code: 'E11.9', description: 'T2DM', category: 'Endocrine' }],
        PROVENANCE,
      );

      expect(icdCode.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({
              source: 'NLM',
              sourceVersion: '2026-01',
              lastSyncedAt: PROVENANCE.syncedAt,
            }),
          ],
        }),
      );
    });

    it('gives CPT rows a version, which they previously had no column for', async () => {
      const cptCode = {
        findMany: jest.fn(async (_args?: unknown) => []),
        createMany: jest.fn(async (_args?: unknown) => ({ count: 1 })),
      };
      const prisma = {
        getReadClient: jest.fn(() => ({ cptCode })),
        cptCode,
      } as unknown as PrismaService;
      const repository = new PrismaMedicalCodingRepository(prisma);

      await repository.createCommonCptCodes(
        [{ code: '99213', description: 'Office visit', category: 'E&M' }],
        PROVENANCE,
      );

      expect(cptCode.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({
              version: 'HCPCS',
              system: 'HCPCS',
              source: 'NLM',
              lastSyncedAt: PROVENANCE.syncedAt,
            }),
          ],
        }),
      );
    });

    it('re-stamps provenance when an existing row is updated', async () => {
      const icdCode = { update: jest.fn(async (_args?: unknown) => ({})) };
      const prisma = {
        $transaction: jest.fn(async (queries: unknown[]) => {
          for (const q of queries) await (q as Promise<unknown>);
        }),
        icdCode,
      } as unknown as PrismaService;
      const repository = new PrismaMedicalCodingRepository(prisma);

      await repository.updateCommonIcdCodes(
        [{ code: 'E11.9', description: 'updated', category: 'Endocrine' }],
        PROVENANCE,
      );

      expect(icdCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source: 'NLM',
            sourceVersion: '2026-01',
            lastSyncedAt: PROVENANCE.syncedAt,
          }),
        }),
      );
    });
  });

  describe('sync runs', () => {
    it('opens a run as RUNNING so a crash leaves a visible row', async () => {
      const create = jest.fn(async (_args: unknown) => ({ id: 'run-9' }));
      const prisma = {
        codeCatalogSyncRun: { create },
      } as unknown as PrismaService;
      const repository = new PrismaMedicalCodingRepository(prisma);

      const runId = await repository.startCodeSyncRun({
        system: CodeCatalogSystem.ICD,
        source: 'NLM',
        startedAt: PROVENANCE.syncedAt,
      });

      expect(runId).toBe('run-9');
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: CodeCatalogSyncStatus.RUNNING,
            system: CodeCatalogSystem.ICD,
            source: 'NLM',
          }),
        }),
      );
    });

    it('settles a run with the coverage actually achieved', async () => {
      const update = jest.fn(async (_args: unknown) => ({}));
      const prisma = {
        codeCatalogSyncRun: { update },
      } as unknown as PrismaService;
      const repository = new PrismaMedicalCodingRepository(prisma);

      await repository.finishCodeSyncRun('run-9', {
        status: CodeCatalogSyncStatus.TRUNCATED,
        finishedAt: PROVENANCE.syncedAt,
        codesSeen: 120,
        batchesApplied: 3,
        unitsSkipped: 18,
        lastUnit: 'E',
        error: 'HTTP 503',
      });

      expect(update).toHaveBeenCalledWith({
        where: { id: 'run-9' },
        data: expect.objectContaining({
          status: CodeCatalogSyncStatus.TRUNCATED,
          codesSeen: 120,
          unitsSkipped: 18,
          lastUnit: 'E',
          error: 'HTTP 503',
        }),
      });
    });

    it('reads the most recent run for a system', async () => {
      const findFirst = jest.fn(async (_args: unknown) => ({ id: 'run-9' }));
      const prisma = {
        getReadClient: jest.fn(() => ({
          codeCatalogSyncRun: { findFirst },
        })),
      } as unknown as PrismaService;
      const repository = new PrismaMedicalCodingRepository(prisma);

      const run = await repository.getLastCodeSyncRun(CodeCatalogSystem.CPT);

      expect(run).toEqual({ id: 'run-9' });
      expect(findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { system: CodeCatalogSystem.CPT },
          orderBy: { startedAt: 'desc' },
        }),
      );
    });
  });
});
