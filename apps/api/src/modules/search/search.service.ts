import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
}

export interface SearchOptions {
  clinicId: string;
  query: string;
  types?: SearchEntityType[];
  limit?: number;
}

/**
 * Unified search service for cross-entity search.
 * Uses PostgreSQL ILIKE for pattern matching (can be upgraded to tsvector).
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Perform unified search across multiple entity types.
   */
  async search(options: SearchOptions): Promise<SearchResult[]> {
    const { clinicId, query, types = ['all'], limit = 20 } = options;

    if (!query || query.length < 2) {
      return [];
    }

    const searchTypes = types.includes('all')
      ? ['patient', 'appointment', 'prescription']
      : types;

    const results: SearchResult[] = [];
    const perTypeLimit = Math.ceil(limit / searchTypes.length);

    // Search in parallel
    const searchPromises = searchTypes.map((type) => {
      switch (type) {
        case 'patient':
          return this.searchPatients(clinicId, query, perTypeLimit);
        case 'appointment':
          return this.searchAppointments(clinicId, query, perTypeLimit);
        case 'prescription':
          return this.searchPrescriptions(clinicId, query, perTypeLimit);
        default:
          return Promise.resolve([]);
      }
    });

    const allResults = await Promise.all(searchPromises);
    allResults.forEach((r) => results.push(...r));

    // Sort by relevance (title match first) and limit
    return results
      .sort((a, b) => {
        const aExact = a.title.toLowerCase().includes(query.toLowerCase());
        const bExact = b.title.toLowerCase().includes(query.toLowerCase());
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return 0;
      })
      .slice(0, limit);
  }

  /**
   * Search patients by name, phone, or email.
   */
  private async searchPatients(
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
      subtitle: p.phoneNumber,
      meta: { mrn: p.mrn },
    }));
  }

  /**
   * Search appointments by patient name or notes.
   */
  private async searchAppointments(
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

  /**
   * Search prescriptions by instructions or patient name.
   */
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
}
