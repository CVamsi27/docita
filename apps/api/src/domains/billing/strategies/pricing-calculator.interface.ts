/**
 * Pricing Calculator Strategy Interface
 * Part of Strategy Pattern for flexible pricing calculations
 *
 * SOLID Principles:
 * - Interface Segregation: Small, focused interface
 * - Open/Closed: Open for extension, closed for modification
 * - Dependency Inversion: Depend on abstraction, not concretion
 */

import { ClinicTier, BillingCycle } from '@workspace/db';

export interface PricingCalculationResult {
  basePriceCents: number;
  addOnsCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  breakdown: {
    tier: string;
    cycle: string;
    addOns: Array<{ name: string; priceCents: number }>;
    discounts: Array<{ name: string; amountCents: number }>;
  };
}

export interface PricingCalculatorStrategy {
  /**
   * Calculate total price for a subscription
   */
  calculatePrice(params: {
    tier: ClinicTier;
    cycle: BillingCycle;
    addOns?: string[];
    discountCode?: string;
    referralCredits?: number;
    currency?: string;
  }): Promise<PricingCalculationResult>;

  /**
   * Calculate proration when upgrading/downgrading
   */
  calculateProration(params: {
    currentTier: ClinicTier;
    newTier: ClinicTier;
    currentCycle: BillingCycle;
    daysRemaining: number;
    currentAddOns?: string[];
    newAddOns?: string[];
  }): Promise<{
    creditCents: number;
    chargeCents: number;
    netChargeCents: number;
  }>;

  /**
   * Validate pricing configuration
   */
  isValid(): boolean;
}
