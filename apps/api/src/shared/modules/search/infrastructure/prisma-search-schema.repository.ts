import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type {
  SearchSchemaRepository,
  SearchTableTsvectorSupport,
} from '@/shared/modules/search/ports/search-schema.repository.port';

@Injectable()
export class PrismaSearchSchemaRepository implements SearchSchemaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getPatientAndAppointmentTsvectorSupport(): Promise<
    SearchTableTsvectorSupport[]
  > {
    return this.prisma.$queryRaw<SearchTableTsvectorSupport[]>`
      SELECT
        table_name AS "tableName",
        BOOL_OR(column_name = 'search_tsvector' AND udt_name = 'tsvector') AS "hasSearchTsvector"
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('Patient', 'Appointment')
      GROUP BY table_name
    `;
  }
}
