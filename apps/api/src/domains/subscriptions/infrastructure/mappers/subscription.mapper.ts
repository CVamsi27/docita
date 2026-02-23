/**
 * Subscription Mapper
 * Converts between Prisma models and domain entities
 */

import { Prisma, Subscription as PrismaSubscription } from '@workspace/db';
import { Subscription } from '../../core/entities';
import {
  SubscriptionStatus,
  SubscriptionStatusEnum,
  ClinicTier,
  BillingCycle,
  DiscountAggregate,
  Discount,
  DiscountType,
} from '../../core/value-objects';

export class SubscriptionMapper {
  /**
   * Convert Prisma model to domain entity
   */
  static toDomain(raw: PrismaSubscription): Subscription {
    // Parse status
    const statusValue = raw.status as any as SubscriptionStatusEnum;
    const status = new SubscriptionStatus(statusValue);

    // Parse plan tier
    const plan = new ClinicTier(raw.plan as any as any);

    // Parse billing cycle
    const cycle = new BillingCycle(raw.billingCycle as any as any);

    // Parse discounts from JSON
    const discountAggregate = this.parseDiscounts(raw.discountsApplied as any);

    return new Subscription({
      id: raw.id,
      clinicId: raw.clinicId,
      plan,
      billingCycle: cycle,
      basePriceCents: raw.basePriceCents,
      status,
      currentPeriodStart: raw.currentPeriodStart,
      currentPeriodEnd: raw.currentPeriodEnd,
      trialEnd: raw.trialEnd || undefined,
      cancelledAt: raw.cancelledAt || undefined,
      autoPayEnabled: raw.autoPayEnabled,
      discounts: discountAggregate,
      creditsCents: raw.creditsCents,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version,
    });
  }

  /**
   * Convert domain entity to Prisma format
   */
  static toPersistence(subscription: Subscription): any {
    const discountsJson = this.serializeDiscounts(subscription.getDiscounts());

    return {
      clinicId: subscription.clinicId,
      plan: subscription.getPlan().toString(),
      billingCycle: subscription.getBillingCycle().toString(),
      basePriceCents: subscription.getBasePrice().paise,
      currency: 'INR',
      status: subscription.getStatus().toString(),
      discountsApplied: discountsJson,
      totalDiscountPercent: subscription.getDiscounts().getTotalPercent(),
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      // ... other fields
      autoPayEnabled: subscription.isAutoPayEnabled(),
      creditsCents: subscription.getCredits().paise,
      createdAt: subscription.createdAt,
      updatedAt: new Date(),
      version: subscription.version,
    };
  }

  /**
   * Parse discounts from JSON
   */
  private static parseDiscounts(json: any): DiscountAggregate {
    const aggregate = new DiscountAggregate();

    if (!Array.isArray(json)) {
      return aggregate;
    }

    json.forEach((item: any) => {
      try {
        const discount = new Discount({
          type: item.type as DiscountType,
          percentOff: item.percentOff,
          expiresAt: item.expiresAt ? new Date(item.expiresAt) : undefined,
          description: item.description,
        });
        aggregate.addDiscount(discount);
      } catch {
        // Silently skip invalid discounts
      }
    });

    return aggregate;
  }

  /**
   * Serialize discounts to JSON
   */
  private static serializeDiscounts(aggregate: DiscountAggregate): any[] {
    return aggregate.getActiveDiscounts().map((d) => ({
      type: d.type,
      percentOff: d.percentOff,
      expiresAt: d.expiresAt?.toISOString(),
      description: d.description,
    }));
  }
}
