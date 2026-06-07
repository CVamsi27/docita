// jscpd:ignore-start
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SearchFullTextSupportService } from '../search-full-text-support.service';
import {
  SEARCH_QUERY_REPOSITORY_TOKEN,
  type SearchQueryRepository,
} from '@/shared/modules/search/ports/search-query.repository.port';
import type { SearchResult } from '../search.types';
import { SearchStrategyBase } from './search-strategy.base';
import { Inject } from '@nestjs/common';

@Injectable()
export class AppointmentSearchStrategy extends SearchStrategyBase {
  readonly entityType = 'appointment';
  readonly fullTextKey = 'appointment' as const;

  constructor(
    prisma: PrismaService,
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
      this.searchQueries.searchAppointmentsFullText(clinicId, query, limit),
// jscpd:ignore-end
      this.searchQueries.searchAppointmentsFuzzy(clinicId, query, limit),
    ]);

    const seen = new Set<string>();
    const combined: SearchResult[] = [];

    for (const appointment of ftsResults) {
      seen.add(appointment.id);
      combined.push({
        id: appointment.id,
        type: 'appointment',
        title: `${appointment.patientFirstName} ${appointment.patientLastName}`,
        subtitle:
          appointment.chiefComplaint || appointment.notes || 'Appointment',
        relevanceScore: appointment.rank,
        meta: { startTime: appointment.startTime },
      });
    }

    for (const appointment of fuzzyResults) {
      if (seen.has(appointment.id)) continue;
      seen.add(appointment.id);
      combined.push({
        id: appointment.id,
        type: 'appointment',
        title: `${appointment.patientFirstName} ${appointment.patientLastName}`,
        subtitle:
          appointment.chiefComplaint || appointment.notes || 'Appointment',
        relevanceScore: appointment.rank * 0.5,
        meta: { startTime: appointment.startTime },
      });
      if (combined.length >= limit) break;
    }

    return combined.slice(0, limit);
  }

  protected async searchFallback(
    clinicId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const appointments = await this.searchQueries.searchAppointmentsFuzzy(
      clinicId,
      query,
      limit,
    );

    return appointments.map((appointment) => ({
      id: appointment.id,
      type: 'appointment' as const,
      title: `${appointment.patientFirstName} ${appointment.patientLastName}`,
      subtitle:
        appointment.chiefComplaint || appointment.notes || 'Appointment',
      relevanceScore: appointment.rank,
      meta: { startTime: appointment.startTime },
    }));
  }
}
