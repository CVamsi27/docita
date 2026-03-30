import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { MedicalCodeSyncService } from './medical-code-sync.service';

describe('MedicalCodeSyncService', () => {
  const prisma = {
    icdCode: {
      upsert: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    cptCode: {
      upsert: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
  };

  const nlmCodingService = {
    searchIcdCodes: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    searchCptCodes: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    fetchAllIcdCodesForSync:
      jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    fetchAllCptCodesForSync:
      jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  let service: MedicalCodeSyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MedicalCodeSyncService(
      prisma as unknown as never,
      nlmCodingService as unknown as never,
    );
  });

  it('syncs unique ICD codes into the database as common codes', async () => {
    nlmCodingService.fetchAllIcdCodesForSync.mockResolvedValue([
      {
        code: 'E11.9',
        description: 'Type 2 diabetes mellitus without complications',
        category: 'Endocrine',
      },
      {
        code: 'I10',
        description: 'Essential hypertension',
        category: 'Circulatory',
      },
      {
        code: 'E11.9',
        description: 'Type 2 diabetes mellitus without complications',
        category: 'Endocrine',
      },
    ]);

    prisma.icdCode.upsert.mockResolvedValue({} as never);

    const synced = await service.syncCommonIcdCodes();

    expect(synced).toBe(2);
    expect(prisma.icdCode.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.icdCode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { code: 'E11.9' },
        create: expect.objectContaining({
          code: 'E11.9',
          isCommon: true,
          version: 'ICD-10',
        }),
        update: expect.objectContaining({
          description: 'Type 2 diabetes mellitus without complications',
          isCommon: true,
        }),
      }),
    );
  });

  it('syncs unique CPT codes into the database as common codes', async () => {
    nlmCodingService.fetchAllCptCodesForSync.mockResolvedValue([
      {
        code: '99213',
        description: 'Office or other outpatient visit',
        category: 'Evaluation and Management',
      },
      {
        code: '93000',
        description: 'Electrocardiogram',
        category: 'Medicine',
      },
      {
        code: '99213',
        description: 'Office or other outpatient visit',
        category: 'Evaluation and Management',
      },
    ]);

    prisma.cptCode.upsert.mockResolvedValue({} as never);

    const synced = await service.syncCommonCptCodes();

    expect(synced).toBe(2);
    expect(prisma.cptCode.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.cptCode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { code: '99213' },
        create: expect.objectContaining({
          code: '99213',
          isCommon: true,
          price: 0,
        }),
        update: expect.objectContaining({
          description: 'Office or other outpatient visit',
          isCommon: true,
        }),
      }),
    );
  });

  it('syncs both ICD and CPT code sets together', async () => {
    nlmCodingService.fetchAllIcdCodesForSync.mockResolvedValue([
      {
        code: 'J02.9',
        description: 'Acute pharyngitis, unspecified',
        category: 'Respiratory',
      },
    ]);
    nlmCodingService.fetchAllCptCodesForSync.mockResolvedValue([
      {
        code: '87880',
        description: 'Infectious agent detection',
        category: 'Laboratory',
      },
    ]);
    prisma.icdCode.upsert.mockResolvedValue({} as never);
    prisma.cptCode.upsert.mockResolvedValue({} as never);

    await expect(service.syncCommonCodes()).resolves.toEqual({
      icd: 1,
      cpt: 1,
    });
  });
});
