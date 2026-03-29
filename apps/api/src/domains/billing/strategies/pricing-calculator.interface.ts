import { ClinicTier, BillingCycle } from '@workspace/db';

export interface PricingCalculationResult {
  basePriceCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  breakdown: {
    tier: string;
    cycle: string;
    discounts: Array<{ name: string; amountCents: number }>;
  };
}

export interface PricingCalculatorStrategy {
  calculatePrice(params: {
    tier: ClinicTier;
    cycle: BillingCycle;
    discountCode?: string;
    referralCredits?: number;
    currency?: string;
  }): Promise<PricingCalculationResult>;

  calculateProration(params: {
    currentTier: ClinicTier;
    newTier: ClinicTier;
    currentCycle: BillingCycle;
    daysRemaining: number;
  }): Promise<{
    creditCents: number;
    chargeCents: number;
    netChargeCents: number;
  }>;

  isValid(): boolean;
}
