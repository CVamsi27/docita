import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuditModule } from '@/shared/modules/audit/audit/audit.module';
import { BillingModule } from '@/domains/billing/billing.module';
import { ClaimValidationService } from '@/domains/billing/core/services/claim-validation.service';
import { CLAIM_VALIDATION_PORT } from './application/ports/claim-validation.port';
import { InsuranceClaimsController } from './presentation/controllers/insurance-claims.controller';
import { InsuranceClaimsService } from './application/services/insurance-claims.service';
import { InsuranceClaimsQueryService } from './application/services/insurance-claims-query.service';
import { InsuranceClaimsCommandService } from './application/services/insurance-claims-command.service';
import { PrismaInsuranceClaimRepository } from './infrastructure/repositories/prisma.insurance-claim.repository';
import { INSURANCE_CLAIM_REPOSITORY_TOKEN } from './core/repositories/insurance-claim.repository';

@Module({
  imports: [PrismaModule, AuditModule, BillingModule],
  controllers: [InsuranceClaimsController],
  providers: [
    InsuranceClaimsService,
    InsuranceClaimsQueryService,
    InsuranceClaimsCommandService,
    {
      provide: INSURANCE_CLAIM_REPOSITORY_TOKEN,
      useClass: PrismaInsuranceClaimRepository,
    },
    {
      provide: CLAIM_VALIDATION_PORT,
      useExisting: ClaimValidationService,
    },
  ],
  exports: [InsuranceClaimsService],
})
export class InsuranceClaimsModule {}
