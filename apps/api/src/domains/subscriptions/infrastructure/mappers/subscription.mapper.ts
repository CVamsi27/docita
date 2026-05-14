import {
  Prisma,
  Subscription as PrismaSubscription,
  ClinicTier as PrismaClinicTier,
  BillingCycle as PrismaBillingCycle,
  SubscriptionStatus as PrismaSubscriptionStatus,
} from '@workspace/db';
import {
  Subscription,
  type ScheduledPlanChange,
} from '@/domains/subscriptions/core/entities/subscription.entity';
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

interface DiscountJsonItem extends Record<
  string,
  Prisma.JsonValue | undefined
> {
  type: string;
  percentOff: number;
  expiresAt?: string;
  description?: string;
}

export class SubscriptionMapper {
  private static isDiscountJsonItem(
    value: Prisma.JsonValue,
  ): value is DiscountJsonItem {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    const raw = value as Record<string, unknown>;
    return typeof raw.type === 'string' && typeof raw.percentOff === 'number';
  }

  private static toInputJsonValue(
    value: DiscountJsonItem[] | Record<string, unknown>,
  ): Prisma.InputJsonValue {
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
      graceUntil: raw.graceUntil ?? null,
      scheduledChange: this.parseScheduledChange(raw.scheduledChange),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version,
    });
  }

  private static parseScheduledChange(
    json: Prisma.JsonValue | null,
  ): ScheduledPlanChange | null {
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      return null;
    }
    const raw = json as Record<string, unknown>;
    if (
      typeof raw.plan !== 'string' ||
      typeof raw.billingCycle !== 'string' ||
      typeof raw.effectiveAt !== 'string'
    ) {
      return null;
    }
    return {
      plan: raw.plan,
      billingCycle: raw.billingCycle,
      effectiveAt: raw.effectiveAt,
    };
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
      graceUntil: subscription.getGraceUntil(),
      createdAt: subscription.createdAt,
      updatedAt: new Date(),
      version: subscription.version,

      scheduledChange: subscription.scheduledChange
        ? (this.toInputJsonValue(
            subscription.scheduledChange as unknown as Record<string, unknown>,
          ) as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    };
  }

  private static parseDiscounts(json: Prisma.JsonValue): DiscountAggregate {
    const aggregate = new DiscountAggregate();

    if (!Array.isArray(json)) {
      return aggregate;
    }

    json.forEach((item) => {
      try {
        if (!this.isDiscountJsonItem(item)) {
          return;
        }
        const discount = new Discount({
          type: item.type as DiscountType,
          percentOff: item.percentOff,
          expiresAt: item.expiresAt ? new Date(item.expiresAt) : undefined,
          description: item.description || '',
        });
        aggregate.addDiscount(discount);
      } catch (_error) {}
    });

    return aggregate;
  }

  private static serializeDiscounts(
    aggregate: DiscountAggregate,
  ): DiscountJsonItem[] {
    return aggregate.getActiveDiscounts().map((d) => ({
      type: d.type,
      percentOff: d.percentOff,
      expiresAt: d.expiresAt?.toISOString(),
      description: d.description,
    }));
  }
}
