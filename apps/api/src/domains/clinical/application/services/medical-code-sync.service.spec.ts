import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { MedicalCodeSyncService } from './medical-code-sync.service';

describe('MedicalCodeSyncService', () => {
  const prisma = {
    $transaction: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    icdCode: {
      createMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    cptCode: {
      createMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
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
    prisma.$transaction.mockImplementation(async (...args: unknown[]) => {
      const operations = args[0] as Promise<unknown>[];
      return Promise.all(operations) as never;
    });
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
    prisma.icdCode.findMany.mockResolvedValue([
      {
        code: 'I10',
        description: 'Old hypertension description',
        category: 'Circulatory',
        isCommon: false,
      },
    ]);
    prisma.icdCode.createMany.mockResolvedValue({ count: 1 } as never);
    prisma.icdCode.update.mockResolvedValue({} as never);

    const synced = await service.syncCommonIcdCodes();

    expect(synced).toBe(2);
    expect(prisma.icdCode.findMany).toHaveBeenCalledWith({
      where: { code: { in: ['E11.9', 'I10'] } },
      select: {
        code: true,
        description: true,
        category: true,
        isCommon: true,
      },
    });
    expect(prisma.icdCode.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            code: 'E11.9',
            isCommon: true,
            version: 'ICD-10',
          }),
        ],
        skipDuplicates: true,
      }),
    );
    expect(prisma.icdCode.update).toHaveBeenCalledTimes(1);
    expect(prisma.icdCode.update).toHaveBeenCalledWith({
      where: { code: 'I10' },
      data: {
        description: 'Essential hypertension',
        category: 'Circulatory',
        isCommon: true,
      },
    });
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
    prisma.cptCode.findMany.mockResolvedValue([
      {
        code: '93000',
        description: 'Electrocardiogram',
        category: 'Medicine',
        isCommon: true,
      },
    ]);
    prisma.cptCode.createMany.mockResolvedValue({ count: 1 } as never);

    const synced = await service.syncCommonCptCodes();

    expect(synced).toBe(2);
    expect(prisma.cptCode.findMany).toHaveBeenCalledWith({
      where: { code: { in: ['99213', '93000'] } },
      select: {
        code: true,
        description: true,
        category: true,
        isCommon: true,
      },
    });
    expect(prisma.cptCode.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            code: '99213',
            isCommon: true,
            price: 0,
          }),
        ],
        skipDuplicates: true,
      }),
    );
    expect(prisma.cptCode.update).not.toHaveBeenCalled();
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
    prisma.icdCode.findMany.mockResolvedValue([]);
    prisma.cptCode.findMany.mockResolvedValue([]);
    prisma.icdCode.createMany.mockResolvedValue({ count: 1 } as never);
    prisma.cptCode.createMany.mockResolvedValue({ count: 1 } as never);

    await expect(service.syncCommonCodes()).resolves.toEqual({
      icd: 1,
      cpt: 1,
    });
  });
});
