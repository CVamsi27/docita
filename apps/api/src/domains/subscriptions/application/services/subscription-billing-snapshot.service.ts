import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY_TOKEN,
} from '@/domains/subscriptions/application/ports/subscription.repository.port';
import {
  IClinicOperations,
  CLINIC_OPERATIONS_TOKEN,
} from '@/domains/subscriptions/application/ports/clinic-operations.port';
import {
  BillingCycle,
  ClinicTier,
  SubscriptionStatus,
  SubscriptionStatusEnum,
} from '@/domains/subscriptions/core/value-objects';
import { Subscription } from '@/domains/subscriptions/core/entities/subscription.entity';
import {
  PLATFORM_INVOICE_PROVIDER_TOKEN,
  type IPlatformInvoiceProvider,
} from '@/domains/payments/core/ports';
import { SubscriptionActivationPolicyService } from '@/domains/subscriptions/application/services/subscription-activation-policy.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

interface PersistActivatedSubscriptionParams {
  clinicId: string;
  tier: ClinicTier;
  cycle: BillingCycle;
  listPriceCents: number;
  subscription: Subscription | null;
  creditsConsumed: number;
  preserveCurrentPeriodEnd?: boolean;
  surplusCreditCents?: number;
}

@Injectable()
export class SubscriptionBillingSnapshotService {
  private readonly logger = new Logger(SubscriptionBillingSnapshotService.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(CLINIC_OPERATIONS_TOKEN)
    private readonly clinicOps: IClinicOperations,
    private readonly activationPolicy: SubscriptionActivationPolicyService,
    @Inject(PLATFORM_INVOICE_PROVIDER_TOKEN)
    private readonly platformInvoiceProvider: IPlatformInvoiceProvider,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async persistActivatedSubscription(
    params: PersistActivatedSubscriptionParams,
  ): Promise<Subscription> {
    let subscription = params.subscription;
    const { tier, cycle, listPriceCents } = params;

    if (!subscription) {
      const periodStart = this.clock.now();
      subscription = new Subscription({
        id: crypto.randomUUID(),
        clinicId: params.clinicId,
        plan: tier,
        billingCycle: cycle,
        basePriceCents: listPriceCents,
        status: new SubscriptionStatus(SubscriptionStatusEnum.ACTIVE),
        currentPeriodStart: periodStart,
        currentPeriodEnd: Subscription.calculatePeriodEnd(periodStart, cycle),
        autoPayEnabled: true,
        createdAt: periodStart,
        updatedAt: periodStart,
        version: 1,
      });
    } else {
      const now = this.clock.now();
      subscription.deductCreditsApplied(params.creditsConsumed, now);
      subscription.activatePaidPlan(tier, cycle, listPriceCents, now, {
        preserveCurrentPeriodEnd: params.preserveCurrentPeriodEnd,
      });
      if (params.surplusCreditCents && params.surplusCreditCents > 0) {
        subscription.addAccountCredit(params.surplusCreditCents, now);
      }
      subscription.clearScheduledPlanChange(now);
    }

    await this.subscriptionRepo.save(subscription);
    return subscription;
  }

  /**
   * Creates a Razorpay-hosted invoice for an activated subscription payment.
   * Best-effort: failures must not block activation.
   */
  async createHostedInvoice(params: {
    clinicId: string;
    amountCents: number;
    currency: string;
    orderId: string;
    paymentId: string;
    tier: string;
    cycle: string;
  }) {
    try {
      const clinic = await this.clinicOps.getClinicDetails(params.clinicId);
      if (!clinic.razorpayCustomerId) {
        return null;
      }
      return await this.platformInvoiceProvider.createInvoice({
        customerId: clinic.razorpayCustomerId,
        amountCents: params.amountCents,
        currency: params.currency,
        description: `Docita ${params.tier} ${params.cycle} subscription`,
        orderId: params.orderId,
        paymentId: params.paymentId,
        notes: {
          clinicId: params.clinicId,
          tier: params.tier,
          cycle: params.cycle,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Hosted invoice creation failed for clinic ${params.clinicId}: ${
          err instanceof Error ? err.message : 'unknown error'
        }`,
      );
      return null;
    }
  }
}
