import { Inject, Injectable } from '@nestjs/common';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
import { Subscription } from '@/domains/subscriptions/core/entities/subscription.entity';
import { SubscriptionPricingService } from '@/domains/subscriptions/core/services/subscription-pricing.service';
import { ProratingService } from '@/domains/subscriptions/core/services/proration.service';
import {
  ClinicTier,
  BillingCycle,
} from '@/domains/subscriptions/core/value-objects';

export type SubscriptionCheckoutPricingBreakdown = {
  currentTier: string | null;
  currentCycle: string | null;
  newTier: string;
  newCycle: string;
  creditCents: number;
  chargeCents: number;
  daysRemaining: number;
  billingCycleDays: number;
  finalAmountCents: number;
  listPriceNewCents: number;
  accountCreditsAppliedCents: number;
  /**
   * Credit left over when an unused-period credit exceeds the new tier's
   * charge (i.e. downgrade). Held on the subscription as accountCredits and
   * applied to the next invoice.
   */
  surplusCreditCents: number;
};

export function finalizePayableAmountPaise(
  rawFinalPaise: number,
  currencyCode: string,
): number {
  if (rawFinalPaise <= 0) {
    return 0;
  }
  const upper = currencyCode.toUpperCase();
  if (upper === 'INR' && rawFinalPaise < 100) {
    return 100;
  }
  return rawFinalPaise;
}

/** Facade — checkout price preview; delegates to SubscriptionPricingService and ProratingService. */
@Injectable()
export class SubscriptionCheckoutPricingService {
  constructor(
    private readonly pricingService: SubscriptionPricingService,
    private readonly proratingService: ProratingService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  compute(
    subscription: Subscription | null,
    newTier: ClinicTier,
    newCycle: BillingCycle,
    offerPercent: number,
  ): SubscriptionCheckoutPricingBreakdown {
    const listPriceNewCents = this.pricingService.calculatePrice(
      newTier,
      newCycle,
      offerPercent,
    );

    if (!subscription) {
      return {
        currentTier: null,
        currentCycle: null,
        newTier: newTier.value,
        newCycle: newCycle.value,
        creditCents: 0,
        chargeCents: listPriceNewCents,
        daysRemaining: 0,
        billingCycleDays: newCycle.getDays(),
        finalAmountCents: listPriceNewCents,
        listPriceNewCents,
        accountCreditsAppliedCents: 0,
        surplusCreditCents: 0,
      };
    }

    const currentTierObj = subscription.getPlan();
    const currentCycleObj = subscription.getBillingCycle();
    const currentPriceCents = this.pricingService.calculatePrice(
      currentTierObj,
      currentCycleObj,
      offerPercent,
    );
    const daysRemaining = subscription.getDaysRemaining(this.clock.now());
    const currentCycleDays = currentCycleObj.getDays();
    const accountCredits = subscription.getCredits().paise;

    if (currentCycleObj.equals(newCycle)) {
      // Renewal of the same tier on the same billing cycle: charge the full
      // next-cycle list price (minus any account credits). Proration only
      // makes sense for upgrades/downgrades mid-cycle; for renewal we are
      // buying another full period, not swapping tiers.
      if (currentTierObj.equals(newTier)) {
        const finalAmount = this.proratingService.calculateNetAmount(
          listPriceNewCents,
          accountCredits,
        );
        const appliedWallet = Math.min(accountCredits, listPriceNewCents);
        return {
          currentTier: currentTierObj.value,
          currentCycle: currentCycleObj.value,
          newTier: newTier.value,
          newCycle: newCycle.value,
          creditCents: 0,
          chargeCents: listPriceNewCents,
          daysRemaining,
          billingCycleDays: currentCycleDays,
          finalAmountCents: finalAmount,
          listPriceNewCents,
          accountCreditsAppliedCents: appliedWallet,
          surplusCreditCents: 0,
        };
      }

      const proration = this.proratingService.createProratedPreview(
        currentPriceCents,
        listPriceNewCents,
        daysRemaining,
        currentCycleDays,
        accountCredits,
      );
      const appliedWallet = Math.min(accountCredits, proration.charge);
      // Downgrade where credit > new charge: the surplus is held as account
      // credit and applied against the next invoice.
      const surplusCreditCents = Math.max(
        0,
        proration.credit - listPriceNewCents,
      );

      return {
        currentTier: currentTierObj.value,
        currentCycle: currentCycleObj.value,
        newTier: newTier.value,
        newCycle: newCycle.value,
        creditCents: proration.credit,
        chargeCents: proration.charge,
        daysRemaining,
        billingCycleDays: currentCycleDays,
        finalAmountCents: proration.netAmount,
        listPriceNewCents,
        accountCreditsAppliedCents: appliedWallet,
        surplusCreditCents,
      };
    }

    const creditFromPeriod = Math.round(
      (daysRemaining / Math.max(1, currentCycleDays)) * currentPriceCents,
    );
    const chargeAfterPeriodCredit = Math.max(
      0,
      listPriceNewCents - creditFromPeriod,
    );
    const finalAmount = this.proratingService.calculateNetAmount(
      chargeAfterPeriodCredit,
      accountCredits,
    );
    const appliedWallet = Math.min(accountCredits, chargeAfterPeriodCredit);
    const surplusCreditCents = Math.max(
      0,
      creditFromPeriod - listPriceNewCents,
    );

    return {
      currentTier: currentTierObj.value,
      currentCycle: currentCycleObj.value,
      newTier: newTier.value,
      newCycle: newCycle.value,
      creditCents: creditFromPeriod,
      chargeCents: chargeAfterPeriodCredit,
      daysRemaining,
      billingCycleDays: currentCycleDays,
      finalAmountCents: finalAmount,
      listPriceNewCents,
      accountCreditsAppliedCents: appliedWallet,
      surplusCreditCents,
    };
  }
}
