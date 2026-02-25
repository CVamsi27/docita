import { SubscriptionPrice } from '../value-objects';

export interface ProratedResult {
  creditCents: number;
  chargeCents: number;
  daysRemaining: number;
  totalCycleDays: number;
}

export class ProratingService {
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

    const creditPrice = currentPrice.prorate(daysRemaining, totalCycleDays);
    const chargePrice = newPrice.prorate(daysRemaining, totalCycleDays);

    const chargeCents = Math.max(0, chargePrice.paise - creditPrice.paise);

    return {
      creditCents: creditPrice.paise,
      chargeCents,
      daysRemaining,
      totalCycleDays,
    };
  }

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

  calculateNetAmount(chargeCents: number, availableCredits: number): number {
    const charge = new SubscriptionPrice(chargeCents);
    const credits = new SubscriptionPrice(availableCredits);

    if (credits.isGreaterThan(charge)) {
      return 0;
    }

    return charge.subtract(credits).paise;
  }

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
  } {
    const proration = this.calculateProration(
      currentPrice,
      newPrice,
      daysRemaining,
      totalCycleDays,
    );

    const netAmount = this.calculateNetAmount(
      proration.chargeCents,
      availableCredits,
    );

    return {
      direction: this.getProrationDirection(currentPrice, newPrice),
      credit: proration.creditCents,
      charge: proration.chargeCents,
      netAmount,
    };
  }
}
