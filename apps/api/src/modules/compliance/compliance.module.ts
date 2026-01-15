import { Module } from '@nestjs/common';
import { DPDPComplianceService } from './dpdp-compliance.service';
import { ConsentController } from './consent.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ConsentController],
  providers: [DPDPComplianceService],
  exports: [DPDPComplianceService],
})
export class ComplianceModule {}
