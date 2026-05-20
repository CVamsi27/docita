import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type {
  AppointmentFullTextSearchHit,
  PatientFullTextSearchHit,
  SearchQueryRepository,
} from '@/shared/modules/search/ports/search-query.repository.port';

@Injectable()
export class PrismaSearchQueryRepository implements SearchQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async searchPatientsFullText(
    clinicId: string,
    query: string,
    limit: number,
  ): Promise<PatientFullTextSearchHit[]> {
    return this.prisma.$queryRaw<PatientFullTextSearchHit[]>`
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
  }

  async searchAppointmentsFullText(
    clinicId: string,
    query: string,
    limit: number,
  ): Promise<AppointmentFullTextSearchHit[]> {
    return this.prisma.$queryRaw<AppointmentFullTextSearchHit[]>`
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
  }
}
