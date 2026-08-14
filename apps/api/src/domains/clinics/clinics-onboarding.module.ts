import { Module, forwardRef } from '@nestjs/common';
import { OnboardingController } from './presentation/controllers/onboarding.controller';
import { OnboardingSlaSignatureController } from './presentation/controllers/onboarding-sla-signature.controller';
import { OnboardingService } from './application/services/onboarding/onboarding.service';
import { OnboardingPaymentService } from './application/services/onboarding/onboarding-payment.service';
import { OnboardingDataService } from './application/services/onboarding/onboarding-data.service';
import { OnboardingValidationService } from './application/services/onboarding/onboarding-validation.service';
import { OnboardingWorkflowService } from './application/services/onboarding/onboarding-workflow.service';
import { OnboardingComplianceService } from './application/services/onboarding/onboarding-compliance.service';
import { ONBOARDING_TX_REPOSITORY_TOKEN } from './core/repositories/onboarding-tx.repository.interface';
import { PrismaOnboardingTxRepository } from './infrastructure/repositories/prisma-onboarding-tx.repository';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthModule } from '@/shared/modules/auth/auth/auth.module';
import { SubscriptionsModule } from '@/domains/subscriptions/subscriptions.module';
import { BillingModule } from '@/domains/billing/billing.module';
import { MessagingModule } from '@/shared/modules/messaging/messaging.module';
import { WhatsappModule } from '@/domains/whatsapp/whatsapp-clinic.module';
import { CLINIC_PERSISTENCE_PORT } from './application/ports/clinic-persistence.port';
import { DocumentsModule } from '@/domains/documents/documents.module';
import { AuditModule } from '@/shared/modules/audit/audit/audit.module';
import { UsersModule } from '@/domains/users/users.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AuthModule),
    SubscriptionsModule,
    forwardRef(() => BillingModule),
    MessagingModule,
    WhatsappModule,
    DocumentsModule,
    AuditModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [OnboardingController, OnboardingSlaSignatureController],
  providers: [
    { provide: CLINIC_PERSISTENCE_PORT, useExisting: PrismaService },
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
  ],
  exports: [OnboardingService],
})
export class ClinicsOnboardingModule {}
