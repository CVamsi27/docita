import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import {
  CptCode,
  CodeCatalogSyncStatus,
  CodeCatalogSystem,
  IcdCode,
} from '@workspace/db';
import {
  CodeCatalogProvider,
  type CodeStreamOutcome,
} from '@/domains/clinical/core/providers/code-catalog.provider';
import { IMedicalCodingRepository } from '@/domains/clinical/core/repositories/clinical.repository.interface';
import { MedicalCodeSyncRunnerService } from './medical-code-sync-runner.service';
import { MedicalCodeSyncService } from './medical-code-sync.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

type ExistingCodeRecord = {
  code: string;
  description: string;
  category: string;
  isCommon: boolean;
};

const COMPLETE: CodeStreamOutcome = {
  completed: true,
  codesStreamed: 1,
  unitsSkipped: 0,
  lastUnit: 'E',
  source: 'NLM',
};

describe('MedicalCodeSyncService', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const clock: IClock = { now: () => now } as unknown as IClock;

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
  const startCodeSyncRunMock =
    jest.fn<IMedicalCodingRepository['startCodeSyncRun']>();
  const finishCodeSyncRunMock =
    jest.fn<IMedicalCodingRepository['finishCodeSyncRun']>();

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
    startCodeSyncRun: startCodeSyncRunMock,
    finishCodeSyncRun: finishCodeSyncRunMock,
    getLastCodeSyncRun: jest.fn(async () => null),
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
    getCatalogSource: () => 'NLM',
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
    system: 'ICD-10-CM',
    source: 'NLM',
    sourceVersion: null,
    lastSyncedAt: null,
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
    version: 'HCPCS',
    system: 'HCPCS',
    source: 'NLM',
    sourceVersion: null,
    lastSyncedAt: null,
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
    startCodeSyncRunMock.mockResolvedValue('run-1');
    finishCodeSyncRunMock.mockResolvedValue(undefined);
    service = new MedicalCodeSyncService(
      medicalCodingRepository,
      codeCatalogProvider,
      new MedicalCodeSyncRunnerService(
        medicalCodingRepository,
        codeCatalogProvider,
        clock,
      ),
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
      return COMPLETE;
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

    expect(synced.codes).toBe(2);
    expect(synced.status).toBe(CodeCatalogSyncStatus.COMPLETED);
    expect(findExistingIcdCodesMock).toHaveBeenCalledWith(['E11.9', 'I10']);
    expect(createCommonIcdCodesMock).toHaveBeenCalledWith(
      [expect.objectContaining({ code: 'E11.9' })],
      expect.objectContaining({ source: 'NLM', syncedAt: now }),
    );
    expect(updateCommonIcdCodesMock).toHaveBeenCalledTimes(1);
    expect(updateCommonIcdCodesMock).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          code: 'I10',
          description: 'Essential hypertension',
          category: 'Circulatory',
        }),
      ],
      expect.objectContaining({ source: 'NLM', syncedAt: now }),
    );
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
      return COMPLETE;
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

    expect(synced.codes).toBe(2);
    expect(findExistingCptCodesMock).toHaveBeenCalledWith(['99213', '93000']);
    expect(createCommonCptCodesMock).toHaveBeenCalledWith(
      [expect.objectContaining({ code: '99213' })],
      expect.objectContaining({ source: 'NLM', syncedAt: now }),
    );
    expect(updateCommonCptCodesMock).not.toHaveBeenCalled();
  });

  it('propagates a partial-failure (createMany rejects) without marking the batch as synced', async () => {
    const syncError = new Error('DB write failed');
    streamIcdCodesMock.mockImplementation(async (onBatch) => {
      await onBatch([buildIcdCode('E11.9', 'T2DM', 'Endocrine')]);
      return COMPLETE;
    });
    findExistingIcdCodesMock.mockResolvedValue([]);
    createCommonIcdCodesMock.mockRejectedValue(syncError);

    await expect(service.syncCommonIcdCodes()).rejects.toThrow(
      'DB write failed',
    );
    // The failing batch must not be counted as synced, so a retry re-attempts
    // the same codes on the next tick (no silent partial state).
    expect(createCommonIcdCodesMock).toHaveBeenCalledTimes(1);
  });

  it('syncs both ICD and CPT code sets together', async () => {
    streamIcdCodesMock.mockImplementation(async (onBatch) => {
      await onBatch([
        buildIcdCode('J02.9', 'Acute pharyngitis, unspecified', 'Respiratory'),
      ]);
      return COMPLETE;
    });
    streamCptCodesMock.mockImplementation(async (onBatch) => {
      await onBatch([
        buildCptCode('87880', 'Infectious agent detection', 'Laboratory'),
      ]);
      return COMPLETE;
    });
    findExistingIcdCodesMock.mockResolvedValue([]);
    findExistingCptCodesMock.mockResolvedValue([]);

    await expect(service.syncCommonCodes()).resolves.toEqual({
      icd: 1,
      cpt: 1,
    });
  });

  describe('catalog provenance', () => {
    it('records the resolved source on the run before the first batch', async () => {
      streamIcdCodesMock.mockImplementation(async (onBatch) => {
        await onBatch([buildIcdCode('I10', 'Hypertension', 'Circulatory')]);
        return COMPLETE;
      });
      findExistingIcdCodesMock.mockResolvedValue([]);

      await service.syncCommonIcdCodes();

      expect(startCodeSyncRunMock).toHaveBeenCalledWith({
        system: CodeCatalogSystem.ICD,
        source: 'NLM',
        startedAt: now,
      });
    });

    it('stamps the source and sync instant on every code row it writes', async () => {
      streamCptCodesMock.mockImplementation(async (onBatch) => {
        await onBatch([buildCptCode('93000', 'Electrocardiogram', 'Medicine')]);
        return COMPLETE;
      });
      findExistingCptCodesMock.mockResolvedValue([]);

      await service.syncCommonCptCodes();

      expect(createCommonCptCodesMock).toHaveBeenCalledWith(expect.anything(), {
        source: 'NLM',
        sourceVersion: null,
        syncedAt: now,
      });
    });

    it('opens a separate run row per coding system', async () => {
      streamIcdCodesMock.mockImplementation(async () => COMPLETE);
      streamCptCodesMock.mockImplementation(async () => COMPLETE);

      await service.syncCommonCodes();

      const systems = startCodeSyncRunMock.mock.calls.map(
        (call) => (call[0] as { system: CodeCatalogSystem }).system,
      );
      expect(systems).toEqual([CodeCatalogSystem.ICD, CodeCatalogSystem.CPT]);
    });
  });

  /**
   * The defect this item exists for: a stream that died partway through used to
   * return normally with a smaller count, so a truncated catalog and a complete
   * one were the same event.
   */
  describe('partial sync state', () => {
    const TRUNCATED: CodeStreamOutcome = {
      completed: false,
      codesStreamed: 1,
      unitsSkipped: 18,
      lastUnit: 'E',
      failure: 'HTTP 503',
      source: 'NLM',
    };

    it('records a truncated stream as TRUNCATED, never COMPLETED', async () => {
      streamIcdCodesMock.mockImplementation(async (onBatch) => {
        await onBatch([buildIcdCode('E11.9', 'T2DM', 'Endocrine')]);
        return TRUNCATED;
      });
      findExistingIcdCodesMock.mockResolvedValue([]);

      const result = await service.syncCommonIcdCodes();

      expect(result.status).toBe(CodeCatalogSyncStatus.TRUNCATED);
      expect(result.unitsSkipped).toBe(18);

      const settle = finishCodeSyncRunMock.mock.calls[0] as unknown as [
        string,
        {
          status: string;
          unitsSkipped: number;
          lastUnit: string;
          error: string;
        },
      ];
      expect(settle[0]).toBe('run-1');
      expect(settle[1].status).toBe(CodeCatalogSyncStatus.TRUNCATED);
      expect(settle[1].unitsSkipped).toBe(18);
      expect(settle[1].lastUnit).toBe('E');
      expect(settle[1].error).toBe('HTTP 503');
    });

    it('records the codes it did apply, so the partial state is auditable', async () => {
      streamIcdCodesMock.mockImplementation(async (onBatch) => {
        await onBatch([buildIcdCode('E11.9', 'T2DM', 'Endocrine')]);
        return TRUNCATED;
      });
      findExistingIcdCodesMock.mockResolvedValue([]);

      await service.syncCommonIcdCodes();

      const settle = finishCodeSyncRunMock.mock.calls[0] as unknown as [
        string,
        { codesSeen: number; batchesApplied: number },
      ];
      expect(settle[1].codesSeen).toBe(1);
      expect(settle[1].batchesApplied).toBe(1);
    });

    it('records a stream that throws as FAILED and rethrows', async () => {
      streamCptCodesMock.mockImplementation(async () => {
        throw new Error('upstream exploded');
      });

      await expect(service.syncCommonCptCodes()).rejects.toThrow(
        'upstream exploded',
      );

      const settle = finishCodeSyncRunMock.mock.calls[0] as unknown as [
        string,
        { status: string; error: string },
      ];
      // Nothing is known about coverage, so no completeness is claimed.
      expect(settle[1].status).toBe(CodeCatalogSyncStatus.FAILED);
      expect(settle[1].error).toBe('upstream exploded');
    });

    it('records COMPLETED only when the provider streamed every unit', async () => {
      streamIcdCodesMock.mockImplementation(async (onBatch) => {
        await onBatch([buildIcdCode('E11.9', 'T2DM', 'Endocrine')]);
        return COMPLETE;
      });
      findExistingIcdCodesMock.mockResolvedValue([]);

      await service.syncCommonIcdCodes();

      const settle = finishCodeSyncRunMock.mock.calls[0] as unknown as [
        string,
        { status: string; unitsSkipped: number },
      ];
      expect(settle[1].status).toBe(CodeCatalogSyncStatus.COMPLETED);
      expect(settle[1].unitsSkipped).toBe(0);
    });
  });
});
