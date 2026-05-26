import { PrismaService } from '@/prisma/prisma.service';
import { CLINIC_PERSISTENCE_PORT } from './application/ports/clinic-persistence.port';
import { Module, forwardRef } from '@nestjs/common';
import { ClinicsController } from './presentation/controllers/clinics.controller';
import { ClinicsComplianceController } from './presentation/controllers/clinics-compliance.controller';
import { ClinicSettingsController } from './presentation/controllers/clinic-settings.controller';
import { OnboardingController } from './presentation/controllers/onboarding.controller';
import { OnboardingSlaSignatureController } from './presentation/controllers/onboarding-sla-signature.controller';
import { JoinRequestsController } from './presentation/controllers/join-requests.controller';
import { ClinicsService } from './application/services/clinics.service';
import { ClinicDataService } from './application/services/clinic-data.service';
import { ClinicDataCommandService } from './application/services/clinic-data-command.service';
import { ClinicDataQueryService } from './application/services/clinic-data-query.service';
import { ClinicSettingsService } from './application/services/clinic-settings.service';
import { ClinicSettingsQueryService } from './application/services/clinic-settings-query.service';
import { ClinicSettingsCommandService } from './application/services/clinic-settings-command.service';
import { ClinicDataSubjectRequestService } from './application/services/clinic-data-subject-request.service';
import { StaffManagementService } from './application/services/staff-management.service';
import { StaffInviteService } from './application/services/staff-invite.service';
import { JoinRequestService } from './application/services/join-request.service';
import { JoinRequestCommandService } from './application/services/join-request-command.service';
import { JoinRequestQueryService } from './application/services/join-request-query.service';
import { OnboardingService } from './application/services/onboarding/onboarding.service';
import { OnboardingPaymentService } from './application/services/onboarding/onboarding-payment.service';
import { PrismaClinicCoreRepository } from './infrastructure/repositories/prisma-clinic-core.repository';
import { PrismaClinicMembershipRepository } from './infrastructure/repositories/prisma-clinic-membership.repository';
import { PrismaClinicDataRepository } from './infrastructure/repositories/prisma-clinic-data.repository';
import { PrismaJoinRequestRepository } from './infrastructure/repositories/prisma-join-request.repository';
import {
  CLINIC_CORE_REPOSITORY_TOKEN,
  CLINIC_DATA_REPOSITORY_TOKEN,
  CLINIC_MEMBERSHIP_REPOSITORY_TOKEN,
} from './core/repositories/clinic-data.repository.interface';
import { JOIN_REQUEST_REPOSITORY_TOKEN } from './core/repositories/join-request.repository.interface';
import { OnboardingDataService } from './application/services/onboarding/onboarding-data.service';
import { OnboardingValidationService } from './application/services/onboarding/onboarding-validation.service';
import { OnboardingWorkflowService } from './application/services/onboarding/onboarding-workflow.service';
import { ONBOARDING_TX_REPOSITORY_TOKEN } from './core/repositories/onboarding-tx.repository.interface';
import { PrismaOnboardingTxRepository } from './infrastructure/repositories/prisma-onboarding-tx.repository';
import { OnboardingComplianceService } from './application/services/onboarding/onboarding-compliance.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuditModule } from '@/shared/modules/audit/audit/audit.module';
import { AuthModule } from '@/shared/modules/auth/auth/auth.module';
import { SubscriptionsModule } from '@/domains/subscriptions/subscriptions.module';
import { BillingModule } from '@/domains/billing/billing.module';
import { MessagingModule } from '@/shared/modules/messaging/messaging.module';
import { WhatsappModule } from '@/domains/whatsapp/whatsapp-clinic.module';
import { UsersModule } from '@/domains/users/users.module';
import { ClinicFactory } from './core/factories/clinic.factory';
import { SettingsFactory } from './core/factories/settings.factory';
import { DocumentsModule } from '@/domains/documents/documents.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    forwardRef(() => AuthModule),
    SubscriptionsModule,
    forwardRef(() => BillingModule),
    MessagingModule,
    WhatsappModule,
    forwardRef(() => UsersModule),
    DocumentsModule,
  ],
  controllers: [
    ClinicsController,
    ClinicsComplianceController,
    ClinicSettingsController,
    OnboardingController,
    OnboardingSlaSignatureController,
    JoinRequestsController,
  ],
  providers: [
    { provide: CLINIC_PERSISTENCE_PORT, useExisting: PrismaService },
    ClinicDataCommandService,
    ClinicDataQueryService,
    ClinicDataService,
    ClinicSettingsService,
    ClinicSettingsQueryService,
    ClinicSettingsCommandService,
    ClinicDataSubjectRequestService,
    StaffManagementService,
    ClinicsService,
    JoinRequestQueryService,
    JoinRequestCommandService,
    JoinRequestService,
    OnboardingService,
    OnboardingPaymentService,
    OnboardingDataService,
    OnboardingValidationService,
    OnboardingWorkflowService,
    {
      provide: ONBOARDING_TX_REPOSITORY_TOKEN,
      useClass: PrismaOnboardingTxRepository,
    },
    OnboardingComplianceService,
    ClinicFactory,
    SettingsFactory,
    PrismaClinicCoreRepository,
    PrismaClinicMembershipRepository,
    PrismaClinicDataRepository,
    {
      provide: CLINIC_DATA_REPOSITORY_TOKEN,
      useExisting: PrismaClinicDataRepository,
    },
    {
      provide: CLINIC_CORE_REPOSITORY_TOKEN,
      useExisting: PrismaClinicCoreRepository,
    },
    {
      provide: CLINIC_MEMBERSHIP_REPOSITORY_TOKEN,
      useExisting: PrismaClinicMembershipRepository,
    },
    PrismaJoinRequestRepository,
    {
      provide: JOIN_REQUEST_REPOSITORY_TOKEN,
      useClass: PrismaJoinRequestRepository,
    },
  ],
  exports: [
    ClinicsService,
    OnboardingService,
    ClinicFactory,
    SettingsFactory,
    JoinRequestService,
    StaffInviteService,
  ],
})
export class ClinicsModule {}
