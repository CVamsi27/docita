import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { LruCache } from '@/shared/common/utils/lru-cache';
import {
  CodeCatalogSyncRunOutcome,
  CodeSyncProvenance,
  IMedicalCodingRepository,
  MedicalCodeSyncRecord,
  SyncedMedicalCodeRecord,
} from '@/domains/clinical/core/repositories/clinical.repository.interface';
import {
  IcdCode,
  CptCode,
  DoctorFavoriteCode,
  Appointment,
  CodeCatalogSyncRun,
  CodeCatalogSyncStatus,
  CodeCatalogSystem,
} from '@workspace/db';

const CODE_CACHE_TTL_MS = 5 * 60 * 1000;
const CODE_CACHE_CAPACITY = 512;

/** Catalog systems stamped onto synced rows, mirroring the schema defaults. */
const ICD_SYSTEM_VERSION = 'ICD-10-CM';
const CPT_SYSTEM_VERSION = 'HCPCS';

/**
 * Shared `select` for the ICD/CPT sync read paths — both code tables expose
 * the same sync-relevant columns, so a single literal keeps the two mirrored
 * query paths (`findExistingIcdCodes` / `findExistingCptCodes`) in lockstep.
 */
const SYNCED_CODE_SELECT = {
  code: true,
  description: true,
  category: true,
  isCommon: true,
} as const;

@Injectable()
export class PrismaMedicalCodingRepository
  implements IMedicalCodingRepository, OnModuleInit
{
  private readonly logger = new Logger(PrismaMedicalCodingRepository.name);
  private readonly icdSearchCache = new LruCache<IcdCode[]>(
    CODE_CACHE_CAPACITY,
    CODE_CACHE_TTL_MS,
  );
  private readonly cptSearchCache = new LruCache<CptCode[]>(
    CODE_CACHE_CAPACITY,
    CODE_CACHE_TTL_MS,
  );

  constructor(private prisma: PrismaService) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  private cacheKey(query: string, limit: number): string {
    return `${query.trim().toLowerCase()}|${limit}`;
  }

  onModuleInit(): void {
    void this.prewarmFromFavorites().catch((error: unknown) => {
      this.logger.warn(
        `Failed to prewarm medical-coding cache: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }

  private async prewarmFromFavorites(): Promise<void> {
    const [icdCommon, cptCommon] = await Promise.all([
      this.getReadClient().icdCode.findMany({
        where: { isCommon: true },
        take: 50,
      }),
      this.getReadClient().cptCode.findMany({
        where: { isCommon: true },
        take: 50,
      }),
    ]);

    const icdQueries = new Set<string>();
    const cptQueries = new Set<string>();
    for (const item of icdCommon) {
      if (item.code) icdQueries.add(item.code.slice(0, 3).toLowerCase());
    }
    for (const item of cptCommon) {
      if (item.code) cptQueries.add(item.code.slice(0, 3).toLowerCase());
    }

    await Promise.all([
      ...Array.from(icdQueries).map((q) =>
        this.searchIcdCodes(q).catch((): IcdCode[] => []),
      ),
      ...Array.from(cptQueries).map((q) =>
        this.searchCptCodes(q).catch((): CptCode[] => []),
      ),
    ]);
  }

  async searchIcdCodes(query: string, limit = 20): Promise<IcdCode[]> {
    return this.cachedSearch(this.icdSearchCache, query, limit, () =>
      this.getReadClient().icdCode.findMany(
        this.buildCodeSearchArgs(query, limit),
      ),
    );
  }

  async searchCptCodes(query: string, limit = 20): Promise<CptCode[]> {
    return this.cachedSearch(this.cptSearchCache, query, limit, () =>
      this.getReadClient().cptCode.findMany(
        this.buildCodeSearchArgs(query, limit),
      ),
    );
  }

  /**
   * Builds the `findMany` args shared by `searchIcdCodes` / `searchCptCodes` —
   * both code tables are searched the same way (code/description prefix match,
   * common-first ordering), so the query shape is genuinely identical, not
   * coincidentally similar.
   */
  private buildCodeSearchArgs(query: string, limit: number) {
    const trimmed = query.trim();
    return {
      where: {
        OR: [
          { code: { contains: trimmed, mode: 'insensitive' as const } },
          { description: { contains: trimmed, mode: 'insensitive' as const } },
        ],
      },
      orderBy: [{ isCommon: 'desc' as const }, { code: 'asc' as const }],
      take: limit,
    };
  }

  /**
   * Builds the `update.data` shared by `updateCommonIcdCodes` /
   * `updateCommonCptCodes` — syncing either coding system overwrites the same
   * three fields, re-marks the record as common, and re-stamps provenance so a
   * row cannot outlive the sync run that last touched it without saying so.
   */
  private buildCodeUpdateData(
    code: MedicalCodeSyncRecord,
    provenance: CodeSyncProvenance,
  ) {
    return {
      description: code.description,
      category: code.category,
      isCommon: true,
      source: provenance.source,
      sourceVersion: provenance.sourceVersion,
      lastSyncedAt: provenance.syncedAt,
    };
  }

  private async cachedSearch<T>(
    cache: LruCache<T[]>,
    query: string,
    limit: number,
    factory: () => Promise<T[]>,
  ): Promise<T[]> {
    if (!query?.trim()) return [];
    const key = this.cacheKey(query, limit);
    const cached = cache.get(key);
    if (cached) return cached;
    const result = await factory();
    cache.set(key, result);
    return result;
  }

  /** Used by favorites mutations to invalidate cached search results. */
  invalidateSearchCaches(): void {
    this.icdSearchCache.clear();
    this.cptSearchCache.clear();
  }

  async getFavorites(userId: string): Promise<IcdCode[]> {
    const favorites = await this.getReadClient().doctorFavoriteCode.findMany({
      where: { userId, icdCodeId: { not: null } },
      include: { icdCode: true },
    });
    return favorites.map((f) => f.icdCode).filter((c): c is IcdCode => !!c);
  }

  async getCommonIcdCodes(limit = 50): Promise<IcdCode[]> {
    return this.getReadClient().icdCode.findMany({
      where: { isCommon: true },
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
      take: limit,
    });
  }

  async addFavorite(
    userId: string,
    code: string,
    description: string,
    category: string,
  ): Promise<DoctorFavoriteCode> {
    const icdCode = await this.prisma.icdCode.upsert({
      where: { code },
      create: { code, description, category, version: 'ICD-10' },
      update: { description, category },
    });
    return this.prisma.doctorFavoriteCode.create({
      data: { userId, icdCodeId: icdCode.id },
    });
  }

  async removeFavorite(userId: string, icdCodeId: string): Promise<void> {
    await this.prisma.doctorFavoriteCode.deleteMany({
      where: { userId, icdCodeId },
    });
  }

  async getCptFavorites(userId: string): Promise<CptCode[]> {
    const favorites = await this.getReadClient().doctorFavoriteCode.findMany({
      where: { userId, cptCodeId: { not: null } },
      include: { cptCode: true },
    });
    return favorites.map((f) => f.cptCode).filter((c): c is CptCode => !!c);
  }

  async getCommonCptCodes(limit = 50): Promise<CptCode[]> {
    return this.getReadClient().cptCode.findMany({
      where: { isCommon: true },
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
      take: limit,
    });
  }

  async addCptFavorite(
    userId: string,
    code: string,
    description: string,
    category: string,
  ): Promise<DoctorFavoriteCode> {
    const cptCode = await this.prisma.cptCode.upsert({
      where: { code },
      create: { code, description, category },
      update: { description, category },
    });
    return this.prisma.doctorFavoriteCode.create({
      data: { userId, cptCodeId: cptCode.id },
    });
  }

  async removeCptFavorite(userId: string, cptCodeId: string): Promise<void> {
    await this.prisma.doctorFavoriteCode.deleteMany({
      where: { userId, cptCodeId },
    });
  }

  async getUncodedVisits(
    clinicId: string,
    search?: string,
  ): Promise<Appointment[]> {
    const visits = await this.getReadClient().appointment.findMany({
      where: {
        clinicId,
        status: 'COMPLETED',
        diagnoses: { none: {} },
        ...(search && {
          patient: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          },
        }),
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      take: 20,
    });
    return visits;
  }

  async findExistingIcdCodes(
    codes: string[],
  ): Promise<SyncedMedicalCodeRecord[]> {
    return this.getReadClient().icdCode.findMany({
      where: { code: { in: codes } },
      select: SYNCED_CODE_SELECT,
    });
  }

  async createCommonIcdCodes(
    records: MedicalCodeSyncRecord[],
    provenance: CodeSyncProvenance,
  ): Promise<void> {
    await this.prisma.icdCode.createMany({
      data: records.map((code) => ({
        code: code.code,
        description: code.description,
        category: code.category,
        version: ICD_SYSTEM_VERSION,
        isCommon: true,
        system: ICD_SYSTEM_VERSION,
        source: provenance.source,
        sourceVersion: provenance.sourceVersion,
        lastSyncedAt: provenance.syncedAt,
      })),
      skipDuplicates: true,
    });
  }

  async updateCommonIcdCodes(
    records: MedicalCodeSyncRecord[],
    provenance: CodeSyncProvenance,
  ): Promise<void> {
    await this.prisma.$transaction(
      records.map((code) =>
        this.prisma.icdCode.update({
          where: { code: code.code },
          data: this.buildCodeUpdateData(code, provenance),
        }),
      ),
    );
  }

  async findExistingCptCodes(
    codes: string[],
  ): Promise<SyncedMedicalCodeRecord[]> {
    return this.getReadClient().cptCode.findMany({
      where: { code: { in: codes } },
      select: SYNCED_CODE_SELECT,
    });
  }

  async createCommonCptCodes(
    records: MedicalCodeSyncRecord[],
    provenance: CodeSyncProvenance,
  ): Promise<void> {
    await this.prisma.cptCode.createMany({
      data: records.map((code) => ({
        code: code.code,
        description: code.description,
        category: code.category,
        isCommon: true,
        price: 0,
        version: CPT_SYSTEM_VERSION,
        system: CPT_SYSTEM_VERSION,
        source: provenance.source,
        sourceVersion: provenance.sourceVersion,
        lastSyncedAt: provenance.syncedAt,
      })),
      skipDuplicates: true,
    });
  }

  async updateCommonCptCodes(
    records: MedicalCodeSyncRecord[],
    provenance: CodeSyncProvenance,
  ): Promise<void> {
    await this.prisma.$transaction(
      records.map((code) =>
        this.prisma.cptCode.update({
          where: { code: code.code },
          data: this.buildCodeUpdateData(code, provenance),
        }),
      ),
    );
  }

  async startCodeSyncRun(run: {
    system: CodeCatalogSystem;
    source: string;
    sourceVersion?: string | null;
    startedAt: Date;
  }): Promise<string> {
    const created = await this.prisma.codeCatalogSyncRun.create({
      data: {
        system: run.system,
        source: run.source,
        sourceVersion: run.sourceVersion ?? null,
        status: CodeCatalogSyncStatus.RUNNING,
        startedAt: run.startedAt,
      },
      select: { id: true },
    });
    return created.id;
  }

  async finishCodeSyncRun(
    runId: string,
    outcome: CodeCatalogSyncRunOutcome,
  ): Promise<void> {
    await this.prisma.codeCatalogSyncRun.update({
      where: { id: runId },
      data: {
        status: outcome.status,
        finishedAt: outcome.finishedAt,
        codesSeen: outcome.codesSeen,
        batchesApplied: outcome.batchesApplied,
        unitsSkipped: outcome.unitsSkipped,
        lastUnit: outcome.lastUnit,
        error: outcome.error ?? null,
      },
    });
  }

  async getLastCodeSyncRun(
    system: CodeCatalogSystem,
  ): Promise<CodeCatalogSyncRun | null> {
    return this.getReadClient().codeCatalogSyncRun.findFirst({
      where: { system },
      orderBy: { startedAt: 'desc' },
    });
  }
}
