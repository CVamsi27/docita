import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { SearchFullTextSupportService } from './search-full-text-support.service';
import { SearchStrategyRegistry } from './search-strategy.registry';
import {
  PatientSearchStrategy,
  AppointmentSearchStrategy,
  PrescriptionSearchStrategy,
} from './strategies';
import { SEARCH_SCHEMA_REPOSITORY_TOKEN } from './ports/search-schema.repository.port';
import { SEARCH_QUERY_REPOSITORY_TOKEN } from './ports/search-query.repository.port';
import { PrismaSearchSchemaRepository } from './infrastructure/prisma-search-schema.repository';
import { PrismaSearchQueryRepository } from './infrastructure/prisma-search-query.repository';

@Module({
  imports: [PrismaModule],
  controllers: [SearchController],
  providers: [
    {
      provide: SEARCH_SCHEMA_REPOSITORY_TOKEN,
      useClass: PrismaSearchSchemaRepository,
    },
    {
      provide: SEARCH_QUERY_REPOSITORY_TOKEN,
      useClass: PrismaSearchQueryRepository,
    },
    SearchFullTextSupportService,
    PatientSearchStrategy,
    AppointmentSearchStrategy,
    PrescriptionSearchStrategy,
    SearchStrategyRegistry,
    SearchService,
  ],
  exports: [SearchService],
})
export class SearchModule {}
