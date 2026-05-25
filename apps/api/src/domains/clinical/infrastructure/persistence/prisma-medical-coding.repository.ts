import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { LruCache } from '@/shared/common/utils/lru-cache';
import {
  IMedicalCodingRepository,
  MedicalCodeSyncRecord,
  SyncedMedicalCodeRecord,
} from '@/domains/clinical/core/repositories/clinical.repository.interface';
import {
  IcdCode,
  CptCode,
  DoctorFavoriteCode,
  Appointment,
} from '@workspace/db';

const CODE_CACHE_TTL_MS = 5 * 60 * 1000;
const CODE_CACHE_CAPACITY = 512;

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
    if (!query?.trim()) return [];
    const key = this.cacheKey(query, limit);
    const cached = this.icdSearchCache.get(key);
    if (cached) return cached;

    const result = await this.getReadClient().icdCode.findMany({
      where: {
        OR: [
          { code: { contains: query.trim(), mode: 'insensitive' } },
          { description: { contains: query.trim(), mode: 'insensitive' } },
        ],
      },
      orderBy: [{ isCommon: 'desc' }, { code: 'asc' }],
      take: limit,
    });
    this.icdSearchCache.set(key, result);
    return result;
  }

  async searchCptCodes(query: string, limit = 20): Promise<CptCode[]> {
    if (!query?.trim()) return [];
    const key = this.cacheKey(query, limit);
    const cached = this.cptSearchCache.get(key);
    if (cached) return cached;

    const result = await this.getReadClient().cptCode.findMany({
      where: {
        OR: [
          { code: { contains: query.trim(), mode: 'insensitive' } },
          { description: { contains: query.trim(), mode: 'insensitive' } },
        ],
      },
      orderBy: [{ isCommon: 'desc' }, { code: 'asc' }],
      take: limit,
    });
    this.cptSearchCache.set(key, result);
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
      select: {
        code: true,
        description: true,
        category: true,
        isCommon: true,
      },
    });
  }

  async createCommonIcdCodes(records: MedicalCodeSyncRecord[]): Promise<void> {
    await this.prisma.icdCode.createMany({
      data: records.map((code) => ({
        code: code.code,
        description: code.description,
        category: code.category,
        version: 'ICD-10',
        isCommon: true,
      })),
      skipDuplicates: true,
    });
  }

  async updateCommonIcdCodes(records: MedicalCodeSyncRecord[]): Promise<void> {
    await this.prisma.$transaction(
      records.map((code) =>
        this.prisma.icdCode.update({
          where: { code: code.code },
          data: {
            description: code.description,
            category: code.category,
            isCommon: true,
          },
        }),
      ),
    );
  }

  async findExistingCptCodes(
    codes: string[],
  ): Promise<SyncedMedicalCodeRecord[]> {
    return this.getReadClient().cptCode.findMany({
      where: { code: { in: codes } },
      select: {
        code: true,
        description: true,
        category: true,
        isCommon: true,
      },
    });
  }

  async createCommonCptCodes(records: MedicalCodeSyncRecord[]): Promise<void> {
    await this.prisma.cptCode.createMany({
      data: records.map((code) => ({
        code: code.code,
        description: code.description,
        category: code.category,
        isCommon: true,
        price: 0,
      })),
      skipDuplicates: true,
    });
  }

  async updateCommonCptCodes(records: MedicalCodeSyncRecord[]): Promise<void> {
    await this.prisma.$transaction(
      records.map((code) =>
        this.prisma.cptCode.update({
          where: { code: code.code },
          data: {
            description: code.description,
            category: code.category,
            isCommon: true,
          },
        }),
      ),
    );
  }
}
