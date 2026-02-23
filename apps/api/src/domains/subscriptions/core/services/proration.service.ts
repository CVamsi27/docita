/**
 * Proration Service
 * Handles calculations for prorated charges/credits
 * when plans are changed mid-cycle
 */

import { SubscriptionPrice } from '../value-objects';

export interface ProratedResult {
  creditCents: number;
  chargeCents: number;
  daysRemaining: number;
  totalCycleDays: number;
}

export class ProratingService {
  /**
   * Calculate proration for plan change
   *
   * @param currentPriceCents - Current plan price in paise
   * @param newPriceCents - New plan price in paise
   * @param daysRemaining - Days left in current billing cycle
   * @param totalCycleDays - Total days in cycle (30 or 365)
   * @returns Proration details with credit and charge amounts
   */
  calculateProration(
    currentPriceCents: number,
    newPriceCents: number,
    daysRemaining: number,
    totalCycleDays: number,
  ): ProratedResult {
    if (daysRemaining < 0 || totalCycleDays <= 0) {
      throw new Error('Invalid day values for proration calculation');
    }

    const currentPrice = new SubscriptionPrice(currentPriceCents);
    const newPrice = new SubscriptionPrice(newPriceCents);

    // Calculate credit for unused portion of current plan
    const creditPrice = currentPrice.prorate(daysRemaining, totalCycleDays);

    // Calculate charge for new plan (prorated)
    const chargePrice = newPrice.prorate(daysRemaining, totalCycleDays);

    // Net charge (could be 0 if downgrading)
    const chargeCents = Math.max(0, chargePrice.paise - creditPrice.paise);

    return {
      creditCents: creditPrice.paise,
      chargeCents,
      daysRemaining,
      totalCycleDays,
    };
  }

  /**
   * Check if plan change should result in credit or charge
   */
  getProrationDirection(
    currentPriceCents: number,
    newPriceCents: number,
  ): 'upgrade' | 'downgrade' | 'same' {
    if (currentPriceCents < newPriceCents) {
      return 'upgrade';
    }
    if (currentPriceCents > newPriceCents) {
      return 'downgrade';
    }
    return 'same';
  }

  /**
   * Calculate effective amount after credits
   */
  calculateNetAmount(chargeCents: number, availableCredits: number): number {
    const charge = new SubscriptionPrice(chargeCents);
    const credits = new SubscriptionPrice(availableCredits);

    if (credits.isGreaterThan(charge)) {
      // Full charge covered by credits
      return 0;
    }

    // Partial or full charge needed
    return charge.subtract(credits).paise;
  }

  /**
   * Suggest plan change amounts to user
   */
  createProratedPreview(
    currentPrice: number,
    newPrice: number,
    daysRemaining: number,
    totalCycleDays: number,
    availableCredits: number = 0,
  ): {
    direction: 'upgrade' | 'downgrade' | 'same';
    credit: number;
    charge: number;
    netAmount: number;
    message: string;
  } {
    const proration = this.calculateProration(
      currentPrice,
      newPrice,
      daysRemaining,
      totalCycleDays,
    );

    const direction = this.getProrationDirection(currentPrice, newPrice);
    const netAmount = this.calculateNetAmount(
      proration.chargeCents,
      availableCredits,
    );

    let message = '';
    if (direction === 'upgrade') {
      message = `You'll be charged ₹${(netAmount / 100).toFixed(2)} for the upgrade`;
    } else if (direction === 'downgrade') {
      message = `You'll receive a credit of ₹${(proration.creditCents / 100).toFixed(2)}`;
    } else {
      message = 'No charge for plan change';
    }

    return {
      direction,
      credit: proration.creditCents,
      charge: proration.chargeCents,
      netAmount,
      message,
    };
  }
}
