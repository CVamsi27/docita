import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  SUBSCRIPTION_PERSISTENCE_PORT,
  type SubscriptionPersistencePort,
} from '@/domains/subscriptions/application/ports/subscription-persistence.port';
import { SubscriptionOverageMeterService } from '@/domains/subscriptions/application/services/subscription-overage-meter.service';

export interface BillMonthlyOveragesParams {
  periodStart: Date;
  periodEnd: Date;
}

@Injectable()
export class BillMonthlyOveragesUseCase {
  private readonly logger = new Logger(BillMonthlyOveragesUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_PERSISTENCE_PORT)
    private readonly persistence: SubscriptionPersistencePort,
    private readonly overageMeterService: SubscriptionOverageMeterService,
  ) {}

  async execute(params: BillMonthlyOveragesParams): Promise<void> {
    const { periodStart, periodEnd } = params;
    // RLS-BYPASS: subscription billing use cases run in scheduler context
    await this.persistence.runUnrestricted(async () => {
      const activeSubscriptions = await this.persistence.subscription.findMany({
        where: { status: { in: ['ACTIVE', 'TRIALING'] } },
        select: {
          id: true,
          clinicId: true,
          plan: true,
          currency: true,
          includedAppointments: true,
          includedUsers: true,
        },
        // Capped: monthly cron iterates every active/trialing subscription.
        // Dropping a subscription here means silently not billing its
        // overages for the period — unacceptable. The cap is a guardrail
        // well above current scale; if it ever fires the per-clinic
        // failure loop surfaces it loudly.
        take: 10000,
      });

      this.logger.log(
        `Processing overage for ${activeSubscriptions.length} active subscriptions`,
      );

      const results = await Promise.allSettled(
        activeSubscriptions.map((sub) =>
          this.overageMeterService.processSubscriptionOverage(
            sub,
            periodStart,
            periodEnd,
          ),
        ),
      );
      for (const [index, result] of results.entries()) {
        if (result.status === 'rejected') {
          const sub = activeSubscriptions[index];
          this.logger.error(
            `Overage billing failed for clinic ${sub?.clinicId ?? 'unknown'}`,
            result.reason,
          );
        }
      }
    });
  }
}
