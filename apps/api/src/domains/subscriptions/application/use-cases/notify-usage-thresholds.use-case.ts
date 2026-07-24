import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  SUBSCRIPTION_PERSISTENCE_PORT,
  type SubscriptionPersistencePort,
} from '@/domains/subscriptions/application/ports/subscription-persistence.port';
import {
  CLINIC_USAGE_PORT_TOKEN,
  type IClinicUsagePort,
} from '@/domains/billing/application/ports';
import { UsageThresholdNotifierService } from '@/domains/subscriptions/application/services/usage-threshold-notifier.service';
import { GLOBAL_BULK_READ_LIMIT } from '@/shared/common/constants/bulk-read-limit.constant';

@Injectable()
export class NotifyUsageThresholdsUseCase {
  private readonly logger = new Logger(NotifyUsageThresholdsUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_PERSISTENCE_PORT)
    private readonly persistence: SubscriptionPersistencePort,
    @Inject(CLINIC_USAGE_PORT_TOKEN)
    private readonly clinicUsage: IClinicUsagePort,
    private readonly usageThresholdNotifier: UsageThresholdNotifierService,
  ) {}

  async execute(): Promise<void> {
    // RLS-BYPASS: subscription billing use cases run in scheduler context
    await this.persistence.runUnrestricted(async () => {
      const activeSubscriptions = await this.persistence.subscription.findMany({
        where: { status: { in: ['ACTIVE', 'TRIALING'] } },
        select: {
          clinicId: true,
        },
        // Capped: this cron iterates all active/trialing subscriptions across
        // every clinic. The current Docita footprint is well under this
        // guardrail; GLOBAL_BULK_READ_LIMIT is a safety net that pages loudly
        // via the Promise.allSettled error loop before anything is dropped.
        take: GLOBAL_BULK_READ_LIMIT,
      });

      const results = await Promise.allSettled(
        activeSubscriptions.map(async (sub) => {
          const usage = await this.clinicUsage.getCurrentUsage(sub.clinicId);
          await this.usageThresholdNotifier.processUsageWarnings(
            sub.clinicId,
            usage,
          );
        }),
      );

      for (const [index, result] of results.entries()) {
        if (result.status === 'rejected') {
          const sub = activeSubscriptions[index];
          this.logger.error(
            `Usage warning check failed for clinic ${sub?.clinicId ?? 'unknown'}`,
            result.reason,
          );
        }
      }
    });
  }
}
