import { Module } from '@nestjs/common';
import { DPDPComplianceService } from './dpdp-compliance.service';
import { ConsentController } from './consent.controller';
import { AuditModule } from '../audit';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AnonymizationFactory } from './factories/anonymization.factory';
import { DataExportFactory } from './factories/data-export.factory';
import { DataRetentionScheduler } from './data-retention.scheduler';
import { AuthModule } from '../auth/auth/auth.module';

import { ArchivalService } from './archival.service';

@Module({
  imports: [PrismaModule, AuditModule, AuthModule],
  controllers: [ConsentController],
  providers: [
    DPDPComplianceService,
    AnonymizationFactory,
    DataExportFactory,
    DataRetentionScheduler,
    ArchivalService,
  ],
  exports: [DPDPComplianceService, ArchivalService],
})
export class ComplianceModule {}
