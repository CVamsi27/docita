import { Module } from '@nestjs/common';
import { AuditModule } from '@/shared/modules/audit/audit/audit.module';
import { ComplianceModule } from './compliance.module';
import { DataRetentionScheduler } from './data-retention.scheduler';

@Module({
  imports: [ComplianceModule, AuditModule],
  providers: [DataRetentionScheduler],
})
export class ComplianceSchedulerModule {}
