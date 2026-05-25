import { Module } from '@nestjs/common';
import { InternalClinicsController } from './internal-clinics.controller';
import { InternalWhatsappSenderController } from './internal-whatsapp-sender.controller';
import { InternalAnalyticsController } from './internal-analytics.controller';
import { InternalLogsController } from './internal-logs.controller';
import { InternalSupportController } from './internal-support.controller';
import { InternalClinicTierController } from './internal-clinic-tier.controller';
import { InternalBillingController } from './internal-billing.controller';
import { InternalBillingService } from './internal-billing.service';
import { InternalBillingMetricsService } from './internal-billing-metrics.service';
import { InternalSubscriptionQueryService } from './internal-subscription-query.service';
import { InternalSubscriptionAdminService } from './internal-subscription-admin.service';
import { InternalPricingAdminService } from './internal-pricing-admin.service';
import { InternalAdditionalChargeService } from './internal-additional-charge.service';
import { ClinicManagementService } from './clinic-management.service';
import { InternalAnalyticsService } from './internal-analytics.service';
import { InternalLogService } from './internal-log.service';
import { InternalLogStorageQueryService } from './logs/internal-log-storage-query.service';
import { InternalLogActivityFallbackService } from './logs/internal-log-activity-fallback.service';
import { InternalAiService } from './internal-ai.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { ClinicsModule } from '@/domains/clinics/clinics.module';
import { UsersModule } from '@/domains/users/users.module';
import { BillingModule } from '@/domains/billing/billing.module';
import { AuthModule } from '@/shared/modules/auth/auth/auth.module';
import { WebsocketsModule } from '@/websockets/websockets.module';
import { FeedbackModule } from '@/domains/feedback/feedback.module';
import { ContactModule } from '@/shared/modules/contact/contact.module';
import { SupportWhatsAppModule } from '@/shared/modules/support-whatsapp';
import { WhatsAppBroadcastModule } from '@/shared/modules/whatsapp-broadcast';
import { SubscriptionsModule } from '@/domains/subscriptions/subscriptions.module';
import { INTERNAL_SUBSCRIPTION_PAYMENT_REPOSITORY_TOKEN } from './ports/internal-subscription-payment.repository.port';
import { PrismaInternalSubscriptionPaymentRepository } from './infrastructure/prisma-internal-subscription-payment.repository';

@Module({
  imports: [
    PrismaModule,
    ClinicsModule,
    UsersModule,
    BillingModule,
    SubscriptionsModule,
    FeedbackModule,
    ContactModule,
    SupportWhatsAppModule,
    WhatsAppBroadcastModule,
    AuthModule,
    WebsocketsModule,
  ],
  controllers: [
    InternalAnalyticsController,
    InternalLogsController,
    InternalClinicTierController,
    InternalSupportController,
    InternalClinicsController,
    InternalWhatsappSenderController,
    InternalBillingController,
  ],
  providers: [
    InternalBillingService,
    InternalBillingMetricsService,
    {
      provide: INTERNAL_SUBSCRIPTION_PAYMENT_REPOSITORY_TOKEN,
      useClass: PrismaInternalSubscriptionPaymentRepository,
    },
    InternalSubscriptionQueryService,
    InternalSubscriptionAdminService,
    InternalPricingAdminService,
    InternalAdditionalChargeService,
    PrismaService,
    ClinicManagementService,
    InternalAnalyticsService,
    InternalLogStorageQueryService,
    InternalLogActivityFallbackService,
    InternalLogService,
    InternalAiService,
  ],
  exports: [
    InternalBillingService,
    ClinicManagementService,
    InternalAnalyticsService,
    InternalLogStorageQueryService,
    InternalLogActivityFallbackService,
    InternalLogService,
    InternalAiService,
  ],
})
export class InternalModule {}
