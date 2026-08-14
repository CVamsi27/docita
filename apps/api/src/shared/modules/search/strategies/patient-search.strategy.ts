// jscpd:ignore-start
import { Injectable } from '@nestjs/common';
import { getPatientFullName } from '@workspace/utils';
import { SearchFullTextSupportService } from '../search-full-text-support.service';
import {
  SEARCH_QUERY_REPOSITORY_TOKEN,
  type SearchQueryRepository,
} from '@/shared/modules/search/ports/search-query.repository.port';
import type { SearchResult } from '../search.types';
import { SearchStrategyBase } from './search-strategy.base';
import { Inject } from '@nestjs/common';
import type { SearchStrategyPersistencePort } from '../ports/search-strategy.persistence.port';

@Injectable()
export class PatientSearchStrategy extends SearchStrategyBase {
  readonly entityType = 'patient';
  readonly fullTextKey = 'patient' as const;

  constructor(
    prisma: SearchStrategyPersistencePort,
    fullTextSupport: SearchFullTextSupportService,
    @Inject(SEARCH_QUERY_REPOSITORY_TOKEN)
    searchQueries: SearchQueryRepository,
  ) {
    super(prisma, fullTextSupport, searchQueries);
  }

  protected async searchFullText(
    clinicId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const [ftsResults, fuzzyResults] = await Promise.all([
      this.searchQueries.searchPatientsFullText(clinicId, query, limit),
      // jscpd:ignore-end
      this.searchQueries.searchPatientsFuzzy(clinicId, query, limit),
    ]);

    const seen = new Set<string>();
    const combined: SearchResult[] = [];

    for (const patient of ftsResults) {
      if (combined.length >= limit) break;
      seen.add(patient.id);
      combined.push({
        id: patient.id,
        type: 'patient',
        title: getPatientFullName(patient),
        subtitle: patient.phoneNumber || undefined,
        relevanceScore: patient.rank,
        meta: { mrn: patient.mrn || undefined },
      });
    }

    for (const patient of fuzzyResults) {
      if (combined.length >= limit) break;
      if (seen.has(patient.id)) continue;
      seen.add(patient.id);
      combined.push({
        id: patient.id,
        type: 'patient',
        title: getPatientFullName(patient),
        subtitle: patient.phoneNumber || undefined,
        relevanceScore: patient.rank * 0.5,
        meta: { mrn: patient.mrn || undefined },
      });
    }

    return combined;
  }

  protected async searchFallback(
    clinicId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const patients = await this.searchQueries.searchPatientsFuzzy(
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
}
