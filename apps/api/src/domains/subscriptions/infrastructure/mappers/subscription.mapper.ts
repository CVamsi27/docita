import {
  scheduledPlanChangeJsonSchema,
  subscriptionDiscountsAppliedJsonSchema,
} from '@workspace/types';
import { Prisma, Subscription as PrismaSubscription } from '@workspace/db';
import { parsePrismaJsonColumn } from '@/shared/common/json/parse-prisma-json-column';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import {
  Subscription,
  type ScheduledPlanChange,
} from '@/domains/subscriptions/core/entities/subscription.entity';
import {
  SubscriptionStatus,
  ClinicTier,
  BillingCycle,
  DiscountAggregate,
  Discount,
  DiscountType,
} from '@/domains/subscriptions/core/value-objects';
import { DEFAULT_CURRENCY } from '@workspace/utils';
import {
  DOMAIN_TO_PRISMA_BILLING_CYCLE,
  DOMAIN_TO_PRISMA_CLINIC_TIER,
  DOMAIN_TO_PRISMA_SUBSCRIPTION_STATUS,
} from './subscription-prisma-maps';

interface DiscountJsonItem {
  type: string;
  percentOff: number;
  expiresAt?: string;
  description?: string;
}

function discountTypeFromStored(value: string): DiscountType | null {
  return Object.values(DiscountType).find((type) => type === value) ?? null;
}

export class SubscriptionMapper {
  static toDomain(raw: PrismaSubscription): Subscription {
    const status = SubscriptionStatus.fromString(raw.status);
    const plan = ClinicTier.fromString(raw.plan);
    const cycle = BillingCycle.fromString(raw.billingCycle);

    const discountAggregate = this.parseDiscounts(
      raw.discountsApplied,
      raw.updatedAt,
    );

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
    const parsed = parsePrismaJsonColumn(json, scheduledPlanChangeJsonSchema);
    return parsed ?? null;
  }

  static toPersistence(
    subscription: Subscription,
  ): Prisma.SubscriptionUncheckedCreateInput {
    const discountsJson = this.serializeDiscounts(
      subscription.getDiscounts(),
      subscription.updatedAt,
    );

    return {
      id: subscription.id,
      clinicId: subscription.clinicId,
      plan: DOMAIN_TO_PRISMA_CLINIC_TIER[subscription.getPlan().value],
      billingCycle:
        DOMAIN_TO_PRISMA_BILLING_CYCLE[subscription.getBillingCycle().value],
      basePriceCents: subscription.getBasePrice().paise,
      currency: DEFAULT_CURRENCY,
      status:
        DOMAIN_TO_PRISMA_SUBSCRIPTION_STATUS[subscription.getStatus().value],
      discountsApplied: toPrismaInputJsonValue(discountsJson),
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
      updatedAt: subscription.updatedAt,
      version: subscription.version,

      scheduledChange: subscription.scheduledChange
        ? toPrismaInputJsonValue(subscription.scheduledChange)
        : Prisma.JsonNull,
    };
  }

  private static parseDiscounts(
    json: Prisma.JsonValue,
    asOf: Date,
  ): DiscountAggregate {
    const aggregate = new DiscountAggregate();

    const items =
      parsePrismaJsonColumn(json, subscriptionDiscountsAppliedJsonSchema) ?? [];

    items.forEach((item) => {
      try {
        const type = discountTypeFromStored(item.type);
        if (!type) {
          return;
        }
        const discount = new Discount({
          type,
          percentOff: item.percentOff,
          expiresAt: item.expiresAt ? new Date(item.expiresAt) : undefined,
          description: item.description || '',
        });
        aggregate.addDiscount(discount, asOf);
      } catch {
        // Ignore malformed stored discounts; valid discount rows remain usable.
      }
    });

    return aggregate;
  }

  private static serializeDiscounts(
    aggregate: DiscountAggregate,
    asOf: Date,
  ): DiscountJsonItem[] {
    return aggregate.getActiveDiscounts(asOf).map((d) => ({
      type: d.type,
      percentOff: d.percentOff,
      expiresAt: d.expiresAt?.toISOString(),
      description: d.description,
    }));
  }
}
