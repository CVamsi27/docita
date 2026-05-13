import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { LabTest } from '@/domains/clinical/core/entities/lab-test.entity';
import { LabOrder } from '@/domains/clinical/core/entities/lab-order.entity';
import {
  ILabRepository,
  IMedicalCodingRepository,
} from '@/domains/clinical/core/repositories/clinical.repository.interface';
import {
  LabTestOrderStatus,
  Prisma,
  LabTest as PrismaLabTest,
  LabTestOrder as PrismaLabTestOrder,
  IcdCode,
  CptCode,
  DoctorFavoriteCode,
  Appointment,
} from '@workspace/db';

/**
 * Lightweight LRU cache for medical-coding searches. Typeahead input drives a
 * high query volume, so caching the normalized query → rows mapping dramatically
 * cuts DB load during active consultation documentation.
 */
class MedicalCodeLruCache<T> {
  private readonly store = new Map<string, { value: T[]; expiresAt: number }>();

  constructor(
    private readonly capacity: number,
    private readonly ttlMs: number,
  ) {}

  get(key: string): T[] | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T[]): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.capacity) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  clear(): void {
    this.store.clear();
  }
}

const CODE_CACHE_TTL_MS = 5 * 60 * 1000;
const CODE_CACHE_CAPACITY = 512;

@Injectable()
export class PrismaClinicalRepository
  implements ILabRepository, IMedicalCodingRepository, OnModuleInit
{
  private readonly logger = new Logger(PrismaClinicalRepository.name);
  private readonly icdSearchCache = new MedicalCodeLruCache<IcdCode>(
    CODE_CACHE_CAPACITY,
    CODE_CACHE_TTL_MS,
  );
  private readonly cptSearchCache = new MedicalCodeLruCache<CptCode>(
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
    // Best-effort pre-warm: load the top-N favorited ICD/CPT codes. Failures
    // must never block startup.
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
        this.searchIcdCodes(q).catch(() => [] as IcdCode[]),
      ),
      ...Array.from(cptQueries).map((q) =>
        this.searchCptCodes(q).catch(() => [] as CptCode[]),
      ),
    ]);
  }

  async findAllTests(clinicId: string): Promise<LabTest[]> {
    const tests = await this.getReadClient().labTest.findMany({
      where: { clinicId },
    });
    return tests.map((t) => this.mapToLabTest(t));
  }

  async findTestById(id: string): Promise<LabTest | null> {
    const test = await this.getReadClient().labTest.findUnique({
      where: { id },
    });
    return test ? this.mapToLabTest(test) : null;
  }

  async saveTest(labTest: LabTest): Promise<LabTest> {
    const data: Prisma.LabTestUncheckedCreateInput = {
      clinicId: labTest.clinicId,
      name: labTest.name,
      category: labTest.category,
      price: labTest.price || null,
      description: labTest.description,
      code: labTest.code,
      active: labTest.active,
    };

    const saved = await this.prisma.labTest.upsert({
      where: { id: labTest.id || 'new' },
      create: data,
      update: data,
    });

    return this.mapToLabTest(saved);
  }

  async findAllOrders(
    clinicId: string,
    params?: {
      search?: string;
      status?: string;
      date?: string;
      patientId?: string;
    },
  ): Promise<LabOrder[]> {
    const where: Prisma.LabTestOrderWhereInput = {
      clinicId,
      ...(params?.patientId && { patientId: params.patientId }),
      ...(params?.status && { status: params.status as LabTestOrderStatus }),
    };

    const readClient = this.getReadClient();

    if (params?.search) {
      const matchingPatients = await readClient.patient.findMany({
        where: {
          clinicId,
          OR: [
            { firstName: { contains: params.search, mode: 'insensitive' } },
            { lastName: { contains: params.search, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      where.patientId = { in: matchingPatients.map((p) => p.id) };
    }

    const orders = await readClient.labTestOrder.findMany({
      where,
      include: { labTest: true },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => this.mapToLabOrder(o));
  }

  async findOrderById(id: string): Promise<LabOrder | null> {
    const order = await this.getReadClient().labTestOrder.findUnique({
      where: { id },
      include: { labTest: true },
    });

    if (!order) return null;
    return this.mapToLabOrder(order);
  }

  async saveOrder(order: LabOrder): Promise<LabOrder> {
    const data: Prisma.LabTestOrderUncheckedCreateInput = {
      clinicId: order.clinicId,
      patientId: order.patientId,
      appointmentId: order.appointmentId || null,
      labTestId: order.labTestId,
      status: order.status,
      result: order.result as Prisma.InputJsonValue,
      resultUrl: order.resultUrl || null,
      notes: order.notes || null,
      orderedBy: 'SYSTEM',
    };

    const saved = await this.prisma.labTestOrder.upsert({
      where: { id: order.id || 'new' },
      create: data,
      update: data,
      include: { labTest: true },
    });

    return this.mapToLabOrder(saved);
  }

  async deleteOrder(id: string): Promise<void> {
    await this.prisma.labTestOrder.delete({
      where: { id },
    });
  }

  async getStats(clinicId: string): Promise<{
    pending: number;
    inProgress: number;
    completed: number;
    urgent: number;
    total: number;
  }> {
    const counts = await this.getReadClient().labTestOrder.groupBy({
      by: ['status'],
      where: { clinicId },
      _count: true,
    });

    const stats = {
      pending: 0,
      inProgress: 0,
      completed: 0,
      urgent: 0,
      total: 0,
    };

    counts.forEach((c) => {
      const count = c._count;
      stats.total += count;
      if (c.status === 'ORDERED') stats.pending += count;
      if (c.status === 'PENDING') stats.inProgress += count;
      if (c.status === 'COMPLETED') stats.completed += count;
    });

    return stats;
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

  private mapToLabTest(prismaTest: PrismaLabTest): LabTest {
    return new LabTest(
      prismaTest.id,
      prismaTest.name,
      prismaTest.category,
      prismaTest.clinicId,
      prismaTest.active,
      prismaTest.code || undefined,
      prismaTest.price ? Number(prismaTest.price) : undefined,
      prismaTest.description || undefined,
    );
  }

  private mapToLabOrder(prismaOrder: PrismaLabTestOrder): LabOrder {
    const normalizedResult =
      prismaOrder.result &&
      typeof prismaOrder.result === 'object' &&
      !Array.isArray(prismaOrder.result)
        ? Object.fromEntries(Object.entries(prismaOrder.result))
        : undefined;

    return new LabOrder(
      prismaOrder.id,
      prismaOrder.patientId,
      prismaOrder.labTestId,
      prismaOrder.status,
      prismaOrder.clinicId,
      prismaOrder.appointmentId || undefined,
      normalizedResult,
      prismaOrder.resultUrl || undefined,
      prismaOrder.notes || undefined,
      prismaOrder.createdAt,
      prismaOrder.updatedAt,
    );
  }
}
