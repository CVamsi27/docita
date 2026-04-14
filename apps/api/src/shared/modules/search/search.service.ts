import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { TaggedCacheService } from '@/shared/modules/services/tagged-cache.service';

export type SearchEntityType =
  | 'patient'
  | 'appointment'
  | 'prescription'
  | 'all';

export interface SearchResult {
  id: string;
  type: SearchEntityType;
  title: string;
  subtitle?: string;
  meta?: Record<string, unknown>;
  relevanceScore?: number;
}

export interface SearchOptions {
  clinicId: string;
  query: string;
  types?: SearchEntityType[];
  limit?: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly SEARCH_CACHE_TTL = 300;
  private fullTextSupportPromise: Promise<{
    patient: boolean;
    appointment: boolean;
  }> | null = null;
  private fullTextSupport = {
    patient: true,
    appointment: true,
  };

  constructor(
    private prisma: PrismaService,
    private readonly cacheService: TaggedCacheService,
  ) {}

  async search(options: SearchOptions): Promise<SearchResult[]> {
    const { clinicId, query, types = ['all'], limit = 20 } = options;

    if (!query || query.length < 2) {
      return [];
    }

    const normalizedQuery = query.trim().replace(/\s+/g, ' ');
    const normalizedQueryLower = normalizedQuery.toLowerCase();

    const cacheKey = `search:${clinicId}:${normalizedQueryLower}:${types.join(',')}:${limit}`;
    const cached = await this.cacheService.get<SearchResult[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for search query: ${normalizedQuery}`);
      return cached;
    }

    const searchTypes = types.includes('all')
      ? ['patient', 'appointment', 'prescription']
      : types;

    const results: SearchResult[] = [];
    const perTypeLimit = Math.ceil(limit / searchTypes.length);

    const searchPromises = searchTypes.map((type) => {
      switch (type) {
        case 'patient':
          return this.searchPatients(clinicId, normalizedQuery, perTypeLimit);
        case 'appointment':
          return this.searchAppointments(
            clinicId,
            normalizedQuery,
            perTypeLimit,
          );
        case 'prescription':
          return this.searchPrescriptions(
            clinicId,
            normalizedQuery,
            perTypeLimit,
          );
        default:
          return Promise.resolve([]);
      }
    });

    const allResults = await Promise.all(searchPromises);
    allResults.forEach((r) => results.push(...r));

    const sorted = results
      .sort((a, b) => {
        const scoreA = a.relevanceScore ?? 0;
        const scoreB = b.relevanceScore ?? 0;
        if (scoreB !== scoreA) return scoreB - scoreA;

        const aExact = a.title.toLowerCase().includes(normalizedQueryLower);
        const bExact = b.title.toLowerCase().includes(normalizedQueryLower);
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return 0;
      })
      .slice(0, limit);

    await this.cacheService.set(cacheKey, sorted, {
      ttl: this.SEARCH_CACHE_TTL,
      tags: [`search:${clinicId}`],
    });

    return sorted;
  }

  private async getFullTextSupport(): Promise<{
    patient: boolean;
    appointment: boolean;
  }> {
    if (!this.fullTextSupportPromise) {
      this.fullTextSupportPromise = this.detectFullTextSupport().then(
        (support) => {
          this.fullTextSupport = support;
          return support;
        },
      );
    }

    return this.fullTextSupportPromise;
  }

  private async detectFullTextSupport(): Promise<{
    patient: boolean;
    appointment: boolean;
  }> {
    try {
      const rows = await this.prisma.$queryRaw<
        Array<{ tableName: string; hasSearchTsvector: boolean }>
      >`
        SELECT
          table_name AS "tableName",
          BOOL_OR(column_name = 'search_tsvector' AND udt_name = 'tsvector') AS "hasSearchTsvector"
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('Patient', 'Appointment')
        GROUP BY table_name
      `;

      const supportByTable = new Map(
        rows.map((row) => [row.tableName, row.hasSearchTsvector]),
      );

      return {
        patient: supportByTable.get('Patient') ?? false,
        appointment: supportByTable.get('Appointment') ?? false,
      };
    } catch (error) {
      this.logger.warn(
        `Unable to probe full-text search support; defaulting to full-text path: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return { patient: true, appointment: true };
    }
  }

  private disableFullTextSupport(type: 'patient' | 'appointment'): void {
    if (!this.fullTextSupport[type]) {
      return;
    }

    this.fullTextSupport = {
      ...this.fullTextSupport,
      [type]: false,
    };
    this.fullTextSupportPromise = Promise.resolve(this.fullTextSupport);
  }

  private async searchPatients(
    clinicId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const support = await this.getFullTextSupport();
    if (!support.patient) {
      return this.searchPatientsFallback(clinicId, query, limit);
    }

    try {
      return await this.searchPatientsFullText(clinicId, query, limit);
    } catch (error) {
      this.disableFullTextSupport('patient');
      this.logger.warn(
        `Full-text search failed for patients, falling back to ILIKE: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      return this.searchPatientsFallback(clinicId, query, limit);
    }
  }

  private async searchPatientsFullText(
    clinicId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const patients = await this.prisma.$queryRaw<
      Array<{
        id: string;
        firstName: string;
        lastName: string;
        phoneNumber: string | null;
        mrn: string | null;
        rank: number;
      }>
    >`
      SELECT 
        p.id,
        p."firstName",
        p."lastName",
        p."phoneNumber",
        p.mrn,
        ts_rank(p.search_tsvector, plainto_tsquery('english', ${query})) as rank
      FROM "Patient" p
      WHERE 
        p."clinicId" = ${clinicId}
        AND p.search_tsvector @@ plainto_tsquery('english', ${query})
      ORDER BY rank DESC
      LIMIT ${Math.min(limit, 100)}
    `;

    return patients.map((p) => ({
      id: p.id,
      type: 'patient' as const,
      title: `${p.firstName} ${p.lastName}`,
      subtitle: p.phoneNumber || undefined,
      relevanceScore: p.rank,
      meta: { mrn: p.mrn || undefined },
    }));
  }

  private async searchPatientsFallback(
    clinicId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const patients = await this.prisma.patient.findMany({
      where: {
        clinicId,
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { phoneNumber: { contains: query } },
          { email: { contains: query, mode: 'insensitive' } },
          { mrn: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        mrn: true,
      },
      take: limit,
    });

    return patients.map((p) => ({
      id: p.id,
      type: 'patient' as const,
      title: `${p.firstName} ${p.lastName}`,
      subtitle: p.phoneNumber || undefined,
      meta: { mrn: p.mrn || undefined },
    }));
  }

  private async searchAppointments(
    clinicId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const support = await this.getFullTextSupport();
    if (!support.appointment) {
      return this.searchAppointmentsFallback(clinicId, query, limit);
    }

    try {
      return await this.searchAppointmentsFullText(clinicId, query, limit);
    } catch (error) {
      this.disableFullTextSupport('appointment');
      this.logger.warn(
        `Full-text search failed for appointments, falling back to ILIKE: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      return this.searchAppointmentsFallback(clinicId, query, limit);
    }
  }

  private async searchAppointmentsFullText(
    clinicId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const appointments = await this.prisma.$queryRaw<
      Array<{
        id: string;
        notes: string | null;
        chiefComplaint: string | null;
        startTime: Date;
        patientFirstName: string;
        patientLastName: string;
        rank: number;
      }>
    >`
      SELECT 
        a.id,
        a.notes,
        a."chiefComplaint",
        a."startTime",
        p."firstName" as "patientFirstName",
        p."lastName" as "patientLastName",
        ts_rank(a.search_tsvector, plainto_tsquery('english', ${query})) as rank
      FROM "Appointment" a
      LEFT JOIN "Patient" p ON a."patientId" = p.id
      WHERE 
        a."clinicId" = ${clinicId}
        AND a.search_tsvector @@ plainto_tsquery('english', ${query})
      ORDER BY rank DESC
      LIMIT ${Math.min(limit, 100)}
    `;

    return appointments.map((a) => ({
      id: a.id,
      type: 'appointment' as const,
      title: `${a.patientFirstName} ${a.patientLastName}`,
      subtitle: a.chiefComplaint || a.notes || 'Appointment',
      relevanceScore: a.rank,
      meta: { startTime: a.startTime },
    }));
  }

  private async searchAppointmentsFallback(
    clinicId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        clinicId,
        OR: [
          { notes: { contains: query, mode: 'insensitive' } },
          { chiefComplaint: { contains: query, mode: 'insensitive' } },
          { patient: { firstName: { contains: query, mode: 'insensitive' } } },
          { patient: { lastName: { contains: query, mode: 'insensitive' } } },
        ],
      },
      select: {
        id: true,
        notes: true,
        chiefComplaint: true,
        startTime: true,
        patient: {
          select: { firstName: true, lastName: true },
        },
      },
      take: limit,
      orderBy: { startTime: 'desc' },
    });

    return appointments.map((a) => ({
      id: a.id,
      type: 'appointment' as const,
      title: `${a.patient.firstName} ${a.patient.lastName}`,
      subtitle: a.chiefComplaint || a.notes || 'Appointment',
      meta: { startTime: a.startTime },
    }));
  }

  private async searchPrescriptions(
    clinicId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const prescriptions = await this.prisma.prescription.findMany({
      where: {
        patient: { clinicId },
        OR: [
          { instructions: { contains: query, mode: 'insensitive' } },
          { patient: { firstName: { contains: query, mode: 'insensitive' } } },
          { patient: { lastName: { contains: query, mode: 'insensitive' } } },
        ],
      },
      select: {
        id: true,
        instructions: true,
        createdAt: true,
        patient: {
          select: { firstName: true, lastName: true },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return prescriptions.map((p) => ({
      id: p.id,
      type: 'prescription' as const,
      title: `${p.patient.firstName} ${p.patient.lastName}`,
      subtitle: p.instructions || 'Prescription',
      meta: { createdAt: p.createdAt },
    }));
  }

  async invalidateSearchCache(clinicId?: string) {
    if (clinicId) {
      await this.cacheService.invalidateTag(`search:${clinicId}`);
    } else {
      await this.cacheService.clear();
    }
    this.logger.debug(
      `Invalidated search cache for clinic: ${clinicId || 'all'}`,
    );
  }
}
