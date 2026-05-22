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
export class AppointmentSearchStrategy implements ISearchStrategy {
  readonly entityType = 'appointment' as const;
  private readonly logger = new Logger(AppointmentSearchStrategy.name);

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
    if (!support.appointment) {
      return this.searchFallback(clinicId, query, limit);
    }

    try {
      return await this.searchFullText(clinicId, query, limit);
    } catch (error) {
      this.fullTextSupport.disable('appointment');
      this.logger.warn(
        `Full-text search failed for appointments, falling back to ILIKE: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return this.searchFallback(clinicId, query, limit);
    }
  }

  private async searchFullText(
    clinicId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const appointments = await this.searchQueries.searchAppointmentsFullText(
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

  private async searchFallback(
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

    return appointments.map((appointment) => ({
      id: appointment.id,
      type: 'appointment' as const,
      title: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
      subtitle:
        appointment.chiefComplaint || appointment.notes || 'Appointment',
      meta: { startTime: appointment.startTime },
    }));
  }
}
