import { Module, forwardRef } from '@nestjs/common';
import {
  ClinicsController,
  ClinicSettingsController,
} from './presentation/controllers/clinics.controller';
import { OnboardingController } from './presentation/controllers/onboarding.controller';
import { JoinRequestsController } from './presentation/controllers/join-requests.controller';
import { ClinicsService } from './application/services/clinics.service';
import { ClinicDataService } from './application/services/clinic-data.service';
import { ClinicSettingsService } from './application/services/clinic-settings.service';
import { ClinicSettingsQueryService } from './application/services/clinic-settings-query.service';
import { ClinicSettingsCommandService } from './application/services/clinic-settings-command.service';
import { ClinicDataSubjectRequestService } from './application/services/clinic-data-subject-request.service';
import { StaffManagementService } from './application/services/staff-management.service';
import { StaffInviteService } from './application/services/staff-invite.service';
import { JoinRequestService } from './application/services/join-request.service';
import { OnboardingService } from './application/services/onboarding/onboarding.service';
import { PrismaClinicDataRepository } from './infrastructure/repositories/prisma-clinic-data.repository';
import { PrismaJoinRequestRepository } from './infrastructure/repositories/prisma-join-request.repository';
import { CLINIC_DATA_REPOSITORY_TOKEN } from './core/repositories/clinic-data.repository.interface';
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
import { WhatsappModule } from '@/shared/modules/messaging/whatsapp/whatsapp.module';
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
    ClinicSettingsController,
    OnboardingController,
    JoinRequestsController,
  ],
  providers: [
    ClinicDataService,
    ClinicSettingsService,
    ClinicSettingsQueryService,
    ClinicSettingsCommandService,
    ClinicDataSubjectRequestService,
    StaffInviteService,
    StaffManagementService,
    ClinicsService,
    JoinRequestService,
    OnboardingService,
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
    PrismaClinicDataRepository,
    {
      provide: CLINIC_DATA_REPOSITORY_TOKEN,
      useClass: PrismaClinicDataRepository,
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
