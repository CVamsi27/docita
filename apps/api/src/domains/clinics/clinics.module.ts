import { PrismaService } from '@/prisma/prisma.service';
import { CLINIC_PERSISTENCE_PORT } from './application/ports/clinic-persistence.port';
import { Module, forwardRef } from '@nestjs/common';
import { ClinicsController } from './presentation/controllers/clinics.controller';
import { ClinicsComplianceController } from './presentation/controllers/clinics-compliance.controller';
import { ClinicReferralController } from './presentation/controllers/clinic-referral.controller';
import { ClinicSettingsController } from './presentation/controllers/clinic-settings.controller';
import { JoinRequestsController } from './presentation/controllers/join-requests.controller';
import { ClinicsService } from './application/services/clinics.service';
import { ClinicDataService } from './application/services/clinic-data.service';
import { ClinicDataCommandService } from './application/services/clinic-data-command.service';
import { ClinicDataQueryService } from './application/services/clinic-data-query.service';
import { ClinicDataSubjectRequestService } from './application/services/clinic-data-subject-request.service';
import { ClinicSettingsCommandService } from './application/services/clinic-settings-command.service';
import { ClinicSettingsQueryService } from './application/services/clinic-settings-query.service';
import { ClinicSettingsService } from './application/services/clinic-settings.service';
import { StaffInviteService } from './application/services/staff-invite.service';
import { StaffManagementService } from './application/services/staff-management.service';
import { PrismaClinicCoreRepository } from './infrastructure/repositories/prisma-clinic-core.repository';
import { PrismaClinicMembershipRepository } from './infrastructure/repositories/prisma-clinic-membership.repository';
import { PrismaClinicDataRepository } from './infrastructure/repositories/prisma-clinic-data.repository';
import {
  CLINIC_CORE_REPOSITORY_TOKEN,
  CLINIC_DATA_REPOSITORY_TOKEN,
  CLINIC_MEMBERSHIP_REPOSITORY_TOKEN,
} from './core/repositories/clinic-data.repository.interface';
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
import { CLINIC_REFERRAL_APP_SERVICE } from './application/ports/clinic-referral-app.port';
import { ClinicReferralAdapter } from '@/domains/subscriptions/infrastructure/adapters/clinic-referral.adapter';
import { ClinicsStaffModule } from './clinics-staff.module';

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
    // Provides JoinRequestService (consumed by ClinicSettingsController,
    // whose literal /clinics/settings, /clinics/members, /clinics/search-for-join
    // routes must register before ClinicsController's /clinics/:id).
    ClinicsStaffModule,
  ],
  controllers: [
    // Literal routes before parameterized ones: `/clinics/settings`,
    // `/clinics/members`, `/clinics/search-for-join`, `/clinics/referral`,
    // `/clinics/join-requests` must win over ClinicsController's
    // `/clinics/:id` handlers, so every literal-route controller registers
    // first (Express matches by registration order; cross-module ordering
    // is unreliable because the forwardRef cycle via AuthModule pulls this
    // module into the container before ClinicsSettingsModule is scanned —
    // hence the literal controllers live HERE, not in a later-registered
    // module).
    ClinicSettingsController,
    ClinicReferralController,
    JoinRequestsController,
    ClinicsController,
    ClinicsComplianceController,
  ],
  providers: [
    { provide: CLINIC_PERSISTENCE_PORT, useExisting: PrismaService },
    ClinicDataCommandService,
    ClinicDataQueryService,
    ClinicDataService,
    ClinicDataSubjectRequestService,
    ClinicSettingsService,
    ClinicSettingsQueryService,
    ClinicSettingsCommandService,
    StaffInviteService,
    StaffManagementService,
    ClinicsService,
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
    {
      provide: CLINIC_REFERRAL_APP_SERVICE,
      useExisting: ClinicReferralAdapter,
    },
  ],
  exports: [
    ClinicsService,
    ClinicFactory,
    SettingsFactory,
    ClinicDataService,
    ClinicDataQueryService,
    ClinicDataCommandService,
    ClinicDataSubjectRequestService,
    ClinicSettingsService,
    ClinicSettingsQueryService,
    ClinicSettingsCommandService,
    StaffInviteService,
    StaffManagementService,
  ],
})
export class ClinicsModule {}
