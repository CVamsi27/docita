import {
  Prisma,
  Subscription as PrismaSubscription,
  ClinicTier as PrismaClinicTier,
  BillingCycle as PrismaBillingCycle,
  SubscriptionStatus as PrismaSubscriptionStatus,
} from '@workspace/db';
import { Subscription } from '@/domains/subscriptions/core/entities';
import {
  SubscriptionStatus,
  SubscriptionStatusEnum,
  ClinicTier,
  BillingCycle,
  DiscountAggregate,
  Discount,
  DiscountType,
} from '@/domains/subscriptions/core/value-objects';
import { DEFAULT_CURRENCY } from '@workspace/utils';

export class SubscriptionMapper {
  private static toInputJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  static toDomain(raw: PrismaSubscription): Subscription {
    const statusValue = raw.status as SubscriptionStatusEnum;
    const status = new SubscriptionStatus(statusValue);

    const plan = ClinicTier.fromString(raw.plan);
    const cycle = BillingCycle.fromString(raw.billingCycle);

    const discountAggregate = this.parseDiscounts(raw.discountsApplied);

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
      cancelAtPeriodEnd: raw.cancelAtPeriodEnd || false,
      razorpaySubscriptionId: raw.razorpaySubscriptionId || undefined,
      autoPayEnabled: raw.autoPayEnabled,
      discounts: discountAggregate,
      creditsCents: raw.creditsCents,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version,
    });
  }

  static toPersistence(
    subscription: Subscription,
  ): Prisma.SubscriptionUncheckedCreateInput {
    const discountsJson = this.serializeDiscounts(subscription.getDiscounts());

    return {
      id: subscription.id,
      clinicId: subscription.clinicId,
      plan: subscription.getPlan().toString() as PrismaClinicTier,
      billingCycle: subscription
        .getBillingCycle()
        .toString() as PrismaBillingCycle,
      basePriceCents: subscription.getBasePrice().paise,
      currency: DEFAULT_CURRENCY,
      status: subscription.getStatus().toString() as PrismaSubscriptionStatus,
      discountsApplied: this.toInputJsonValue(discountsJson),
      totalDiscountPercent: subscription.getDiscounts().getTotalPercent(),
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialEnd: subscription.trialEnd || null,
      cancelledAt: subscription.cancelledAt || null,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      razorpaySubscriptionId: subscription.razorpaySubscriptionId || null,
      autoPayEnabled: subscription.isAutoPayEnabled(),
      creditsCents: subscription.getCredits().paise,
      createdAt: subscription.createdAt,
      updatedAt: new Date(),
      version: subscription.version,

      scheduledChange: Prisma.JsonNull,
    };
  }

  private static parseDiscounts(json: unknown): DiscountAggregate {
    const aggregate = new DiscountAggregate();

    if (!Array.isArray(json)) {
      return aggregate;
    }

    interface DiscountItem {
      type: string;
      percentOff: number;
      expiresAt?: string;
      description?: string;
    }

    json.forEach((item: unknown) => {
      try {
        const d = item as DiscountItem;
        const discount = new Discount({
          type: d.type as DiscountType,
          percentOff: d.percentOff,
          expiresAt: d.expiresAt ? new Date(d.expiresAt) : undefined,
          description: d.description || '',
        });
        aggregate.addDiscount(discount);
      } catch (_error) {}
    });

    return aggregate;
  }

  private static serializeDiscounts(
    aggregate: DiscountAggregate,
  ): Record<string, unknown>[] {
    return aggregate.getActiveDiscounts().map((d) => ({
      type: d.type,
      percentOff: d.percentOff,
      expiresAt: d.expiresAt?.toISOString(),
      description: d.description,
    }));
  }
}
