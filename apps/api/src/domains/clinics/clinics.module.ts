import { Module } from '@nestjs/common';
import {
  ClinicsController,
  ClinicSettingsController,
} from './presentation/controllers/clinics.controller';
import { OnboardingController } from './presentation/controllers/onboarding.controller';
import { ClinicsService } from './application/services/clinics.service';
import { ClinicDataService } from './application/services/clinic-data.service';
import { ClinicSettingsService } from './application/services/clinic-settings.service';
import { StaffManagementService } from './application/services/staff-management.service';
import { OnboardingService } from './application/services/onboarding/onboarding.service';
import { OnboardingDataService } from './application/services/onboarding/onboarding-data.service';
import { OnboardingValidationService } from './application/services/onboarding/onboarding-validation.service';
import { OnboardingWorkflowService } from './application/services/onboarding/onboarding-workflow.service';
import { OnboardingComplianceService } from './application/services/onboarding/onboarding-compliance.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../../shared/modules/audit/audit/audit.module';
import { AuthModule } from '../../shared/modules/auth/auth/auth.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { BillingModule } from '../billing/billing.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { ClinicFactory } from './core/factories/clinic.factory';
import { SettingsFactory } from './core/factories/settings.factory';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    AuthModule,
    SubscriptionsModule,
    BillingModule,
    WhatsAppModule,
  ],
  controllers: [
    ClinicsController,
    ClinicSettingsController,
    OnboardingController,
  ],
  providers: [
    ClinicDataService,
    ClinicSettingsService,
    StaffManagementService,
    ClinicsService,
    OnboardingService,
    OnboardingDataService,
    OnboardingValidationService,
    OnboardingWorkflowService,
    OnboardingComplianceService,
    ClinicFactory,
    SettingsFactory,
  ],
  exports: [ClinicsService, OnboardingService, ClinicFactory, SettingsFactory],
})
export class ClinicsModule {}
