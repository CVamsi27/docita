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
import { CLAIM_SUBMISSION_GATEWAY_TOKEN } from './application/ports/claim-submission-gateway.port';
import { UnconfiguredClaimSubmissionGateway } from './infrastructure/gateways/unconfigured-claim-submission.gateway';
import { InsuranceClaimDecisionCommandService } from './application/services/insurance-claim-decision.command.service';
import { InsuranceClaimSubmissionCommandService } from './application/services/insurance-claim-submission.command.service';

@Module({
  imports: [PrismaModule, AuditModule, BillingModule],
  controllers: [InsuranceClaimsController],
  providers: [
    InsuranceClaimsService,
    InsuranceClaimsQueryService,
    InsuranceClaimsCommandService,
    InsuranceClaimSubmissionCommandService,
    InsuranceClaimDecisionCommandService,
    {
      provide: INSURANCE_CLAIM_REPOSITORY_TOKEN,
      useClass: PrismaInsuranceClaimRepository,
    },
    {
      provide: CLAIM_VALIDATION_PORT,
      useExisting: ClaimValidationService,
    },
    // Replaced by a real insurer integration when one is configured. The
    // default fails loudly rather than reporting an undelivered claim as filed.
    {
      provide: CLAIM_SUBMISSION_GATEWAY_TOKEN,
      useClass: UnconfiguredClaimSubmissionGateway,
    },
  ],
  exports: [
    InsuranceClaimsService,
    InsuranceClaimSubmissionCommandService,
    InsuranceClaimDecisionCommandService,
  ],
})
export class InsuranceClaimsModule {}
