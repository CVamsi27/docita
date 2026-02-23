import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { OnboardingDataService } from './onboarding-data.service';
import { OnboardingValidationService } from './onboarding-validation.service';
import { OnboardingWorkflowService } from './onboarding-workflow.service';
import { OnboardingComplianceService } from './onboarding-compliance.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../../shared/modules/audit/audit/audit.module';
import { AuthModule } from '../../shared/modules/auth/auth/auth.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { PaymentsModule } from '../payments/payments.module';
import { WhatsappModule } from '../../shared/modules/messaging/whatsapp/whatsapp.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    AuthModule,
    SubscriptionModule,
    PaymentsModule,
    WhatsappModule,
  ],
  controllers: [OnboardingController],
  providers: [
    OnboardingDataService,
    OnboardingValidationService,
    OnboardingWorkflowService,
    OnboardingComplianceService,
    OnboardingService,
  ],
  exports: [OnboardingService],
})
export class OnboardingModule {}
