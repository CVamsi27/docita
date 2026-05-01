import { Injectable } from '@nestjs/common';
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

@Injectable()
export class SubscriptionCheckoutPricingService {
  constructor(
    private readonly pricingService: SubscriptionPricingService,
    private readonly proratingService: ProratingService,
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
      };
    }

    const currentTierObj = subscription.getPlan();
    const currentCycleObj = subscription.getBillingCycle();
    const currentPriceCents = this.pricingService.calculatePrice(
      currentTierObj,
      currentCycleObj,
      offerPercent,
    );
    const daysRemaining = subscription.getDaysRemaining();
    const currentCycleDays = currentCycleObj.getDays();
    const accountCredits = subscription.getCredits().paise;

    if (currentCycleObj.equals(newCycle)) {
      const proration = this.proratingService.createProratedPreview(
        currentPriceCents,
        listPriceNewCents,
        daysRemaining,
        currentCycleDays,
        accountCredits,
      );
      const appliedWallet = Math.min(accountCredits, proration.charge);

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
    };
  }
}
