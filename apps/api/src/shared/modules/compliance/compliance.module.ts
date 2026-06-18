import { Module } from '@nestjs/common';
import { DPDPComplianceService } from './dpdp-compliance.service';
import { DpdpAuditEmitter } from './dpdp-audit.emitter';
import { ConsentComplianceService } from './consent-compliance.service';
import { DataSubjectRequestService } from './data-subject-request.service';
import { ConsentController } from './consent.controller';
import { ConsentPdfService } from './consent-pdf.service';
import { AuditModule } from '@/shared/modules/audit/audit/audit.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { AnonymizationFactory } from './factories/anonymization.factory';
import { DataExportFactory } from './factories/data-export.factory';
import { AuthModule } from '@/shared/modules/auth/auth/auth.module';

import { ArchivalService } from './archival.service';

@Module({
  imports: [PrismaModule, AuditModule, AuthModule],
  controllers: [ConsentController],
  providers: [
    DpdpAuditEmitter,
    ConsentComplianceService,
    DataSubjectRequestService,
    DPDPComplianceService,
    AnonymizationFactory,
    DataExportFactory,
    ArchivalService,
    ConsentPdfService,
  ],
  exports: [DPDPComplianceService, ArchivalService],
})
export class ComplianceModule {}
