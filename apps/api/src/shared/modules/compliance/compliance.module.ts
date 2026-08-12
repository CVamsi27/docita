import { Module } from '@nestjs/common';
import { DpdpAuditEmitter } from './dpdp-audit.emitter';
import { ConsentCommandService } from './consent-command.service';
import { ConsentQueryService } from './consent-query.service';
import { DataSubjectRequestService } from './data-subject-request.service';
import { ConsentController } from './consent.controller';
import { ConsentPdfService } from './consent-pdf.service';
import { AuditModule } from '@/shared/modules/audit/audit/audit.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { AnonymizationFactory } from './factories/anonymization.factory';
import { DataExportFactory } from './factories/data-export.factory';
import { AuthModule } from '@/shared/modules/auth/auth/auth.module';
import { ANONYMIZATION_PERSISTENCE_PORT } from './ports/anonymization.persistence.port';
import { DATA_EXPORT_PERSISTENCE_PORT } from './ports/data-export.persistence.port';

import { ArchivalService } from './archival.service';

@Module({
  imports: [PrismaModule, AuditModule, AuthModule],
  controllers: [ConsentController],
  providers: [
    {
      provide: ANONYMIZATION_PERSISTENCE_PORT,
      useExisting: PrismaService,
    },
    {
      provide: DATA_EXPORT_PERSISTENCE_PORT,
      useExisting: PrismaService,
    },
    DpdpAuditEmitter,
    ConsentCommandService,
    ConsentQueryService,
    DataSubjectRequestService,
    AnonymizationFactory,
    DataExportFactory,
    ArchivalService,
    ConsentPdfService,
  ],
  exports: [
    ConsentCommandService,
    ConsentQueryService,
    DataSubjectRequestService,
    ArchivalService,
  ],
})
export class ComplianceModule {}
