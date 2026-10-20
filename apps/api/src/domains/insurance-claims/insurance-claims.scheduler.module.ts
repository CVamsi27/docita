import { Module } from '@nestjs/common';
import { PrismaWorkerModule } from '@/prisma/prisma.worker.module';
import { CommonServicesModule } from '@/shared/modules/services/common-services.module';
import { INSURANCE_CLAIM_REPOSITORY_TOKEN } from './core/repositories/insurance-claim.repository';
import { CLAIM_SUBMISSION_GATEWAY_TOKEN } from './application/ports/claim-submission-gateway.port';
import { PrismaInsuranceClaimRepository } from './infrastructure/repositories/prisma.insurance-claim.repository';
import { UnconfiguredClaimSubmissionGateway } from './infrastructure/gateways/unconfigured-claim-submission.gateway';
import { InsuranceClaimSubmissionCommandService } from './application/services/insurance-claim-submission.command.service';
import { InsuranceClaimSubmissionRetryCron } from './insurance-claim-submission-retry.cron';

/**
 * Worker-process providers for the claim submission retry sweep. The API
 * module carries HTTP controllers and the API Prisma wiring, so the worker
 * gets the command service plus its persistence and gateway bindings directly
 * (same shape as the other *.worker.module.ts files).
 */
@Module({
  imports: [PrismaWorkerModule, CommonServicesModule],
  providers: [
    InsuranceClaimSubmissionCommandService,
    InsuranceClaimSubmissionRetryCron,
    {
      provide: INSURANCE_CLAIM_REPOSITORY_TOKEN,
      useClass: PrismaInsuranceClaimRepository,
    },
    {
      // Replaced by a real insurer integration when one is configured. The
      // default fails loudly rather than reporting an undelivered claim as
      // filed, so the sweep keeps the claim retryable.
      provide: CLAIM_SUBMISSION_GATEWAY_TOKEN,
      useClass: UnconfiguredClaimSubmissionGateway,
    },
  ],
})
export class InsuranceClaimsSchedulerModule {}
