import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { CptCode, IcdCode } from '@workspace/db';
import { CodeCatalogProvider } from '@/domains/clinical/core/providers/code-catalog.provider';
import { IMedicalCodingRepository } from '@/domains/clinical/core/repositories/clinical.repository.interface';
import { MedicalCodeSyncService } from './medical-code-sync.service';

type ExistingCodeRecord = {
  code: string;
  description: string;
  category: string;
  isCommon: boolean;
};
describe('MedicalCodeSyncService', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');

  const findExistingIcdCodesMock =
    jest.fn<IMedicalCodingRepository['findExistingIcdCodes']>();
  const createCommonIcdCodesMock =
    jest.fn<IMedicalCodingRepository['createCommonIcdCodes']>();
  const updateCommonIcdCodesMock =
    jest.fn<IMedicalCodingRepository['updateCommonIcdCodes']>();
  const findExistingCptCodesMock =
    jest.fn<IMedicalCodingRepository['findExistingCptCodes']>();
  const createCommonCptCodesMock =
    jest.fn<IMedicalCodingRepository['createCommonCptCodes']>();
  const updateCommonCptCodesMock =
    jest.fn<IMedicalCodingRepository['updateCommonCptCodes']>();

  const medicalCodingRepository: IMedicalCodingRepository = {
    searchIcdCodes: jest.fn(async () => []),
    searchCptCodes: jest.fn(async () => []),
    getFavorites: jest.fn(async () => []),
    getCommonIcdCodes: jest.fn(async () => []),
    addFavorite: jest.fn(),
    removeFavorite: jest.fn(async () => undefined),
    getCptFavorites: jest.fn(async () => []),
    getCommonCptCodes: jest.fn(async () => []),
    addCptFavorite: jest.fn(),
    removeCptFavorite: jest.fn(async () => undefined),
    getUncodedVisits: jest.fn(async () => []),
    findExistingIcdCodes: findExistingIcdCodesMock,
    createCommonIcdCodes: createCommonIcdCodesMock,
    updateCommonIcdCodes: updateCommonIcdCodesMock,
    findExistingCptCodes: findExistingCptCodesMock,
    createCommonCptCodes: createCommonCptCodesMock,
    updateCommonCptCodes: updateCommonCptCodesMock,
  } as unknown as IMedicalCodingRepository;

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
    createCommonIcdCodesMock.mockResolvedValue(undefined);
    updateCommonIcdCodesMock.mockResolvedValue(undefined);
    createCommonCptCodesMock.mockResolvedValue(undefined);
    updateCommonCptCodesMock.mockResolvedValue(undefined);
    service = new MedicalCodeSyncService(
      medicalCodingRepository,
      codeCatalogProvider,
    );
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

    findExistingIcdCodesMock.mockResolvedValue([
      {
        code: 'I10',
        description: 'Old hypertension description',
        category: 'Circulatory',
        isCommon: false,
      },
    ]);
    const synced = await service.syncCommonIcdCodes();

    expect(synced).toBe(2);
    expect(findExistingIcdCodesMock).toHaveBeenCalledWith(['E11.9', 'I10']);
    expect(createCommonIcdCodesMock).toHaveBeenCalledWith([
      expect.objectContaining({ code: 'E11.9' }),
    ]);
    expect(updateCommonIcdCodesMock).toHaveBeenCalledTimes(1);
    expect(updateCommonIcdCodesMock).toHaveBeenCalledWith([
      expect.objectContaining({
        code: 'I10',
        description: 'Essential hypertension',
        category: 'Circulatory',
      }),
    ]);
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

    findExistingCptCodesMock.mockResolvedValue([
      {
        code: '93000',
        description: 'Electrocardiogram',
        category: 'Medicine',
        isCommon: true,
      },
    ]);
    const synced = await service.syncCommonCptCodes();

    expect(synced).toBe(2);
    expect(findExistingCptCodesMock).toHaveBeenCalledWith(['99213', '93000']);
    expect(createCommonCptCodesMock).toHaveBeenCalledWith([
      expect.objectContaining({ code: '99213' }),
    ]);
    expect(updateCommonCptCodesMock).not.toHaveBeenCalled();
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
    findExistingIcdCodesMock.mockResolvedValue([]);
    findExistingCptCodesMock.mockResolvedValue([]);

    await expect(service.syncCommonCodes()).resolves.toEqual({
      icd: 1,
      cpt: 1,
    });
  });
});
