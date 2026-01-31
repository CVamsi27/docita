import { Module } from '@nestjs/common';
import { DPDPComplianceService } from './dpdp-compliance.service';
import { ConsentController } from './consent.controller';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AnonymizationFactory } from './factories/anonymization.factory';
import { DataExportFactory } from './factories/data-export.factory';
import { DataRetentionScheduler } from './data-retention.scheduler';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuditModule, AuthModule],
  controllers: [ConsentController],
  providers: [
    DPDPComplianceService,
    AnonymizationFactory,
    DataExportFactory,
    DataRetentionScheduler,
  ],
  exports: [DPDPComplianceService],
})
export class ComplianceModule {}
