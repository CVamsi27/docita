import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { CodeCatalogSyncStatus, CodeCatalogSystem } from '@workspace/db';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { MedicalCodeSyncService } from '@/domains/clinical/application/services/medical-code-sync.service';
import { ClinicalSchedulerModule } from '@/domains/clinical/clinical.scheduler.module';
import { PrismaMedicalCodingRepository } from '@/domains/clinical/infrastructure/persistence/prisma-medical-coding.repository';
import { CODE_CATALOG_PROVIDER } from '@/domains/clinical/core/providers/code-catalog.provider';
import type { CodeCatalogProvider } from '@/domains/clinical/core/providers/code-catalog.provider';
import {
  setupTestDatabase,
  resetDatabase,
  getPrismaInstance,
  closeDatabase,
} from '../../setup';

/**
 * Q02 — catalog provenance and partial-sync state.
 *
 * The unit tests prove the service maps an outcome onto a status. These prove
 * the run row and the per-row provenance actually survive to the database, and
 * that a truncated stream cannot leave a run that reads as complete.
 */
describe('Code catalog sync provenance (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let syncService: MedicalCodeSyncService;
  let repository: PrismaMedicalCodingRepository;
  let provider: CodeCatalogProvider;

  const COMPLETE = {
    completed: true,
    codesStreamed: 1,
    unitsSkipped: 0,
    lastUnit: 'E',
    source: 'NLM',
  };

  beforeAll(async () => {
    setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      // The sync service lives in the scheduler module, which brings the
      // clinical module (and therefore the catalog provider) with it.
      imports: [AppModule, ClinicalSchedulerModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(false);
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    syncService = moduleFixture.get(MedicalCodeSyncService);
    // The clinical module binds the repository to a string token, not the class.
    repository = moduleFixture.get<PrismaMedicalCodingRepository>(
      'IMedicalCodingRepository',
    );
    provider = moduleFixture.get(CODE_CATALOG_PROVIDER);
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it('persists a COMPLETED run with full coverage', async () => {
    const spy = jest
      .spyOn(provider, 'streamIcdCodes')
      .mockImplementation(async (onBatch) => {
        await onBatch([
          {
            id: 'E11.9',
            code: 'E11.9',
            description: 'Type 2 diabetes',
            category: 'Endocrine',
            version: 'ICD-10',
            isCommon: true,
            system: 'ICD-10-CM',
            source: 'NLM',
            sourceVersion: null,
            lastSyncedAt: null,
            createdAt: new Date(0),
            updatedAt: new Date(0),
          } as never,
        ]);
        return COMPLETE;
      });
    jest.spyOn(provider, 'getCatalogSource').mockReturnValue('NLM' as never);

    const result = await syncService.syncCommonIcdCodes();

    expect(result.status).toBe(CodeCatalogSyncStatus.COMPLETED);

    const run = await repository.getLastCodeSyncRun(CodeCatalogSystem.ICD);
    expect(run).not.toBeNull();
    expect(run!.status).toBe(CodeCatalogSyncStatus.COMPLETED);
    expect(run!.source).toBe('NLM');
    expect(run!.unitsSkipped).toBe(0);
    expect(run!.finishedAt).not.toBeNull();
    expect(run!.codesSeen).toBe(1);

    spy.mockRestore();
  });

  it('persists a TRUNCATED run, so a partial catalog never reads as complete', async () => {
    const spy = jest
      .spyOn(provider, 'streamIcdCodes')
      .mockImplementation(async (onBatch) => {
        await onBatch([
          {
            id: 'E11.9',
            code: 'E11.9',
            description: 'Type 2 diabetes',
            category: 'Endocrine',
            version: 'ICD-10',
            isCommon: true,
            system: 'ICD-10-CM',
            source: 'NLM',
            sourceVersion: null,
            lastSyncedAt: null,
            createdAt: new Date(0),
            updatedAt: new Date(0),
          } as never,
        ]);
        return {
          completed: false,
          codesStreamed: 1,
          unitsSkipped: 25,
          lastUnit: 'E',
          failure: 'HTTP 503',
          source: 'NLM',
        };
      });
    jest.spyOn(provider, 'getCatalogSource').mockReturnValue('NLM' as never);

    const result = await syncService.syncCommonIcdCodes();

    expect(result.status).toBe(CodeCatalogSyncStatus.TRUNCATED);

    const run = await repository.getLastCodeSyncRun(CodeCatalogSystem.ICD);
    expect(run!.status).toBe(CodeCatalogSyncStatus.TRUNCATED);
    // The rows it did apply are recorded, and so is the gap it never closed.
    expect(run!.codesSeen).toBe(1);
    expect(run!.unitsSkipped).toBe(25);
    expect(run!.lastUnit).toBe('E');
    expect(run!.error).toBe('HTTP 503');

    spy.mockRestore();
  });

  it('stamps provenance on the code rows a sync writes', async () => {
    const spy = jest
      .spyOn(provider, 'streamIcdCodes')
      .mockImplementation(async (onBatch) => {
        await onBatch([
          {
            id: 'I10',
            code: 'I10',
            description: 'Essential hypertension',
            category: 'Circulatory',
            version: 'ICD-10',
            isCommon: true,
            system: 'ICD-10-CM',
            source: 'NLM',
            sourceVersion: null,
            lastSyncedAt: null,
            createdAt: new Date(0),
            updatedAt: new Date(0),
          } as never,
        ]);
        return COMPLETE;
      });
    jest.spyOn(provider, 'getCatalogSource').mockReturnValue('NLM' as never);

    await syncService.syncCommonIcdCodes();

    const row = await prisma.icdCode.findUniqueOrThrow({
      where: { code: 'I10' },
    });
    expect(row.source).toBe('NLM');
    expect(row.system).toBe('ICD-10-CM');
    expect(row.lastSyncedAt).not.toBeNull();

    spy.mockRestore();
  });

  it('gives CPT rows a version, which had no column before', async () => {
    const spy = jest
      .spyOn(provider, 'streamCptCodes')
      .mockImplementation(async (onBatch) => {
        await onBatch([
          {
            id: '99213',
            code: '99213',
            description: 'Office or other outpatient visit',
            category: 'Evaluation and Management',
            isCommon: true,
            price: 0,
            version: 'HCPCS',
            system: 'HCPCS',
            source: 'NLM',
            sourceVersion: null,
            lastSyncedAt: null,
            createdAt: new Date(0),
            updatedAt: new Date(0),
          } as never,
        ]);
        return COMPLETE;
      });
    jest.spyOn(provider, 'getCatalogSource').mockReturnValue('NLM' as never);

    await syncService.syncCommonCptCodes();

    const row = await prisma.cptCode.findUniqueOrThrow({
      where: { code: '99213' },
    });
    expect(row.version).toBe('HCPCS');
    expect(row.source).toBe('NLM');
    expect(row.lastSyncedAt).not.toBeNull();

    spy.mockRestore();
  });

  it('keeps a failed run distinguishable from a completed one', async () => {
    const spy = jest
      .spyOn(provider, 'streamCptCodes')
      .mockRejectedValue(new Error('upstream exploded'));
    jest.spyOn(provider, 'getCatalogSource').mockReturnValue('NLM' as never);

    await expect(syncService.syncCommonCptCodes()).rejects.toThrow(
      'upstream exploded',
    );

    const run = await repository.getLastCodeSyncRun(CodeCatalogSystem.CPT);
    expect(run!.status).toBe(CodeCatalogSyncStatus.FAILED);
    expect(run!.error).toBe('upstream exploded');

    spy.mockRestore();
  });
});
