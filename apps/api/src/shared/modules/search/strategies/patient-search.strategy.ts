import { getPatientFullName } from '@workspace/utils';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SearchFullTextSupportService } from '../search-full-text-support.service';
import {
  SEARCH_QUERY_REPOSITORY_TOKEN,
  type SearchQueryRepository,
} from '@/shared/modules/search/ports/search-query.repository.port';
import type { SearchResult } from '../search.types';
import type { ISearchStrategy } from './search-strategy.interface';

@Injectable()
export class PatientSearchStrategy implements ISearchStrategy {
  readonly entityType = 'patient' as const;
  private readonly logger = new Logger(PatientSearchStrategy.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fullTextSupport: SearchFullTextSupportService,
    @Inject(SEARCH_QUERY_REPOSITORY_TOKEN)
    private readonly searchQueries: SearchQueryRepository,
  ) {}

  async search(
    clinicId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const support = await this.fullTextSupport.getSupport();
    if (!support.patient) {
      return this.searchFallback(clinicId, query, limit);
    }

    try {
      return await this.searchFullText(clinicId, query, limit);
    } catch (error) {
      this.fullTextSupport.disable('patient');
      this.logger.warn(
        `Full-text search failed for patients, falling back to ILIKE: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return this.searchFallback(clinicId, query, limit);
    }
  }

  private async searchFullText(
    clinicId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const patients = await this.searchQueries.searchPatientsFullText(
      clinicId,
      query,
      limit,
    );

    return patients.map((patient) => ({
      id: patient.id,
      type: 'patient' as const,
      title: getPatientFullName(patient),
      subtitle: patient.phoneNumber || undefined,
      relevanceScore: patient.rank,
      meta: { mrn: patient.mrn || undefined },
    }));
  }

  private async searchFallback(
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

    return patients.map((patient) => ({
      id: patient.id,
      type: 'patient' as const,
      title: getPatientFullName(patient),
      subtitle: patient.phoneNumber || undefined,
      meta: { mrn: patient.mrn || undefined },
    }));
  }
}
