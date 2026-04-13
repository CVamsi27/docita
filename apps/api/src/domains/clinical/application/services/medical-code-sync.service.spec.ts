import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { CptCode, IcdCode } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import { CodeCatalogProvider } from '@/domains/clinical/core/providers/code-catalog.provider';
import { MedicalCodeSyncService } from './medical-code-sync.service';

type ExistingCodeRecord = {
  code: string;
  description: string;
  category: string;
  isCommon: boolean;
};
type ExistingCodeSelect = {
  code: true;
  description: true;
  category: true;
  isCommon: true;
};

type CreateManyResult = { count: number };

type IcdCreateManyArgs = {
  data: Array<{
    code: string;
    description: string;
    category: string;
    version: string;
    isCommon: boolean;
  }>;
  skipDuplicates: boolean;
};

type CptCreateManyArgs = {
  data: Array<{
    code: string;
    description: string;
    category: string;
    isCommon: boolean;
    price: number;
  }>;
  skipDuplicates: boolean;
};

type IcdUpdateArgs = {
  where: { code: string };
  data: {
    description: string;
    category: string;
    isCommon: boolean;
  };
};

type CptUpdateArgs = {
  where: { code: string };
  data: {
    description: string;
    category: string;
    isCommon: boolean;
  };
};

describe('MedicalCodeSyncService', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');

  const transactionMock =
    jest.fn<(operations: Array<Promise<object>>) => Promise<object[]>>();

  const icdCreateManyMock =
    jest.fn<(_args: IcdCreateManyArgs) => Promise<CreateManyResult>>();
  const icdFindManyMock =
    jest.fn<
      (_args: {
        where: { code: { in: string[] } };
        select: ExistingCodeSelect;
      }) => Promise<ExistingCodeRecord[]>
    >();
  const icdUpdateMock = jest.fn<(_args: IcdUpdateArgs) => Promise<object>>();

  const cptCreateManyMock =
    jest.fn<(_args: CptCreateManyArgs) => Promise<CreateManyResult>>();
  const cptFindManyMock =
    jest.fn<
      (_args: {
        where: { code: { in: string[] } };
        select: ExistingCodeSelect;
      }) => Promise<ExistingCodeRecord[]>
    >();
  const cptUpdateMock = jest.fn<(_args: CptUpdateArgs) => Promise<object>>();

  const prisma = Object.create(PrismaService.prototype) as PrismaService;
  Object.defineProperties(prisma, {
    $transaction: {
      value: transactionMock,
      writable: true,
    },
    icdCode: {
      value: {
        createMany: icdCreateManyMock,
        findMany: icdFindManyMock,
        update: icdUpdateMock,
      },
      writable: true,
    },
    cptCode: {
      value: {
        createMany: cptCreateManyMock,
        findMany: cptFindManyMock,
        update: cptUpdateMock,
      },
      writable: true,
    },
  });

  const searchIcdCodesMock = jest.fn<CodeCatalogProvider['searchIcdCodes']>();
  const searchCptCodesMock = jest.fn<CodeCatalogProvider['searchCptCodes']>();
  const streamIcdCodesMock = jest.fn<CodeCatalogProvider['streamIcdCodes']>();
  const streamCptCodesMock = jest.fn<CodeCatalogProvider['streamCptCodes']>();

  const codeCatalogProvider: CodeCatalogProvider = {
    searchIcdCodes: searchIcdCodesMock,
    searchCptCodes: searchCptCodesMock,
    streamIcdCodes: streamIcdCodesMock,
    streamCptCodes: streamCptCodesMock,
  };

  const buildIcdCode = (
    code: string,
    description: string,
    category: string,
  ): IcdCode => ({
    id: `icd-${code}`,
    code,
    description,
    category,
    version: 'ICD-10',
    isCommon: false,
    createdAt: now,
    updatedAt: now,
  });

  const buildCptCode = (
    code: string,
    description: string,
    category: string,
  ): CptCode => ({
    id: `cpt-${code}`,
    code,
    description,
    category,
    isCommon: false,
    price: 0,
    createdAt: now,
    updatedAt: now,
  });

  let service: MedicalCodeSyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    transactionMock.mockImplementation(async (operations) =>
      Promise.all(operations),
    );
    service = new MedicalCodeSyncService(prisma, codeCatalogProvider);
  });

  it('syncs unique ICD codes into the database as common codes', async () => {
    streamIcdCodesMock.mockImplementation(async (onBatch) => {
      await onBatch([
        buildIcdCode(
          'E11.9',
          'Type 2 diabetes mellitus without complications',
          'Endocrine',
        ),
        buildIcdCode('I10', 'Essential hypertension', 'Circulatory'),
        buildIcdCode(
          'E11.9',
          'Type 2 diabetes mellitus without complications',
          'Endocrine',
        ),
      ]);
    });

    icdFindManyMock.mockResolvedValue([
      {
        code: 'I10',
        description: 'Old hypertension description',
        category: 'Circulatory',
        isCommon: false,
      },
    ]);
    icdCreateManyMock.mockResolvedValue({ count: 1 });
    icdUpdateMock.mockResolvedValue({});

    const synced = await service.syncCommonIcdCodes();

    expect(synced).toBe(2);
    expect(icdFindManyMock).toHaveBeenCalledWith({
      where: { code: { in: ['E11.9', 'I10'] } },
      select: {
        code: true,
        description: true,
        category: true,
        isCommon: true,
      },
    });
    expect(icdCreateManyMock).toHaveBeenCalledWith(
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
    expect(icdUpdateMock).toHaveBeenCalledTimes(1);
    expect(icdUpdateMock).toHaveBeenCalledWith({
      where: { code: 'I10' },
      data: {
        description: 'Essential hypertension',
        category: 'Circulatory',
        isCommon: true,
      },
    });
  });

  it('syncs unique CPT codes into the database as common codes', async () => {
    streamCptCodesMock.mockImplementation(async (onBatch) => {
      await onBatch([
        buildCptCode(
          '99213',
          'Office or other outpatient visit',
          'Evaluation and Management',
        ),
        buildCptCode('93000', 'Electrocardiogram', 'Medicine'),
        buildCptCode(
          '99213',
          'Office or other outpatient visit',
          'Evaluation and Management',
        ),
      ]);
    });

    cptFindManyMock.mockResolvedValue([
      {
        code: '93000',
        description: 'Electrocardiogram',
        category: 'Medicine',
        isCommon: true,
      },
    ]);
    cptCreateManyMock.mockResolvedValue({ count: 1 });

    const synced = await service.syncCommonCptCodes();

    expect(synced).toBe(2);
    expect(cptFindManyMock).toHaveBeenCalledWith({
      where: { code: { in: ['99213', '93000'] } },
      select: {
        code: true,
        description: true,
        category: true,
        isCommon: true,
      },
    });
    expect(cptCreateManyMock).toHaveBeenCalledWith(
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
    expect(cptUpdateMock).not.toHaveBeenCalled();
  });

  it('syncs both ICD and CPT code sets together', async () => {
    streamIcdCodesMock.mockImplementation(async (onBatch) => {
      await onBatch([
        buildIcdCode('J02.9', 'Acute pharyngitis, unspecified', 'Respiratory'),
      ]);
    });
    streamCptCodesMock.mockImplementation(async (onBatch) => {
      await onBatch([
        buildCptCode('87880', 'Infectious agent detection', 'Laboratory'),
      ]);
    });
    icdFindManyMock.mockResolvedValue([]);
    cptFindManyMock.mockResolvedValue([]);
    icdCreateManyMock.mockResolvedValue({ count: 1 });
    cptCreateManyMock.mockResolvedValue({ count: 1 });

    await expect(service.syncCommonCodes()).resolves.toEqual({
      icd: 1,
      cpt: 1,
    });
  });
});
