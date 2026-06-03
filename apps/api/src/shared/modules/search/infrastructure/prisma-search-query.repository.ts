import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type {
  AppointmentFullTextSearchHit,
  PatientFullTextSearchHit,
  SearchQueryRepository,
} from '@/shared/modules/search/ports/search-query.repository.port';

const SIMILARITY_THRESHOLD = 0.2;

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
        ts_rank(
          p.search_tsvector,
          plainto_tsquery('english', ${query}),
          32
        ) AS rank
      FROM "Patient" p
      WHERE 
        p."clinicId" = ${clinicId}
        AND p.search_tsvector @@ plainto_tsquery('english', ${query})
      ORDER BY rank DESC
      LIMIT ${Math.min(limit, 100)}
    `;
  }

  async searchPatientsFuzzy(
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
        GREATEST(
          similarity(p."firstName", ${query}),
          similarity(p."lastName", ${query}),
          COALESCE(similarity(p."phoneNumber", ${query}), 0),
          COALESCE(similarity(p.mrn, ${query}), 0),
          similarity(
            COALESCE(p."firstName", '') || ' ' || COALESCE(p."lastName", ''),
            ${query}
          )
        ) AS rank
      FROM "Patient" p
      WHERE
        p."clinicId" = ${clinicId}
        AND (
          similarity(p."firstName", ${query}) > ${SIMILARITY_THRESHOLD}
          OR similarity(p."lastName", ${query}) > ${SIMILARITY_THRESHOLD}
          OR similarity(COALESCE(p."firstName", '') || ' ' || COALESCE(p."lastName", ''), ${query}) > ${SIMILARITY_THRESHOLD}
          OR COALESCE(similarity(p."phoneNumber", ${query}), 0) > ${SIMILARITY_THRESHOLD}
          OR COALESCE(similarity(p.mrn, ${query}), 0) > ${SIMILARITY_THRESHOLD}
        )
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
        p."firstName" AS "patientFirstName",
        p."lastName" AS "patientLastName",
        ts_rank(
          a.search_tsvector,
          plainto_tsquery('english', ${query}),
          32
        ) AS rank
      FROM "Appointment" a
      LEFT JOIN "Patient" p ON a."patientId" = p.id
      WHERE 
        a."clinicId" = ${clinicId}
        AND a.search_tsvector @@ plainto_tsquery('english', ${query})
      ORDER BY rank DESC
      LIMIT ${Math.min(limit, 100)}
    `;
  }

  async searchAppointmentsFuzzy(
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
        p."firstName" AS "patientFirstName",
        p."lastName" AS "patientLastName",
        GREATEST(
          COALESCE(similarity(a.notes, ${query}), 0),
          COALESCE(similarity(a."chiefComplaint", ${query}), 0)
        ) AS rank
      FROM "Appointment" a
      LEFT JOIN "Patient" p ON a."patientId" = p.id
      WHERE
        a."clinicId" = ${clinicId}
        AND (
          COALESCE(similarity(a.notes, ${query}), 0) > ${SIMILARITY_THRESHOLD}
          OR COALESCE(similarity(a."chiefComplaint", ${query}), 0) > ${SIMILARITY_THRESHOLD}
        )
      ORDER BY rank DESC
      LIMIT ${Math.min(limit, 100)}
    `;
  }
}
