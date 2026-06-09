import { Module } from '@nestjs/common';
import {
  BillMonthlyOveragesUseCase,
  NotifyUsageThresholdsUseCase,
} from './application/use-cases';
import { SUBSCRIPTIONS_COMMON_PROVIDERS } from './subscriptions-common.providers';
import { SubscriptionReminderScheduler } from './infrastructure/schedulers/subscription-reminder.scheduler';
import { OverageInvoiceComposer } from './infrastructure/schedulers/overage-invoice.composer';
import { SubscriptionOverageMeterService } from './application/services/subscription-overage-meter.service';
import { SubscriptionOveragePaymentService } from './application/services/subscription-overage-payment.service';
import { OverageBillingScheduler } from './infrastructure/schedulers/overage-billing.scheduler';
import { PrismaWorkerModule } from '@/prisma/prisma.worker.module';
import { PrismaService } from '@/prisma/prisma.service';
import { SUBSCRIPTION_PERSISTENCE_PORT } from './application/ports/subscription-persistence.port';
import { BillingWorkerModule } from '@/domains/billing/billing.worker.module';
import { PaymentsModule } from '@/domains/payments/payments.module';
import { EmailModule } from '@/shared/modules/messaging/email/email.module';
import { CommonServicesModule } from '@/shared/modules/services/common-services.module';
import { AdminAlertsModule } from '@/shared/modules/messaging/admin-alerts/admin-alerts.module';

/**
 * Subscription use-cases and schedulers for the worker process only (no HTTP controllers).
 * Uses BillingWorkerModule instead of BillingModule to avoid duplicate billing providers.
 */
@Module({
  imports: [
    PrismaWorkerModule,
    BillingWorkerModule,
    PaymentsModule,
    EmailModule,
    AdminAlertsModule,
    CommonServicesModule,
  ],
  providers: [
    { provide: SUBSCRIPTION_PERSISTENCE_PORT, useExisting: PrismaService },
    ...SUBSCRIPTIONS_COMMON_PROVIDERS,
    SubscriptionReminderScheduler,
    OverageInvoiceComposer,
    SubscriptionOveragePaymentService,
    SubscriptionOverageMeterService,
    BillMonthlyOveragesUseCase,
    NotifyUsageThresholdsUseCase,
    OverageBillingScheduler,
  ],
})
export class SubscriptionsWorkerModule {}
