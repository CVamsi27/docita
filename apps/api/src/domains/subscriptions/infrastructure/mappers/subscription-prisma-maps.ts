import {
  BillingCycle as PrismaBillingCycle,
  ClinicTier as PrismaClinicTier,
  SubscriptionStatus as PrismaSubscriptionStatus,
} from '@workspace/db';
import { BillingCycleEnum } from '@/domains/subscriptions/core/value-objects/billing-cycle.policy';
import { ClinicTierEnum } from '@/domains/subscriptions/core/value-objects/clinic-tier.value-object';
import { SubscriptionStatusEnum } from '@/domains/subscriptions/core/value-objects/subscription-status.value-object';

export const DOMAIN_TO_PRISMA_CLINIC_TIER: Record<
  ClinicTierEnum,
  PrismaClinicTier
> = {
  [ClinicTierEnum.STARTER]: PrismaClinicTier.STARTER,
  [ClinicTierEnum.ESSENTIAL]: PrismaClinicTier.ESSENTIAL,
  [ClinicTierEnum.PROFESSIONAL]: PrismaClinicTier.PROFESSIONAL,
  [ClinicTierEnum.HOSPITAL]: PrismaClinicTier.HOSPITAL,
  [ClinicTierEnum.ENTERPRISE]: PrismaClinicTier.ENTERPRISE,
};

export const DOMAIN_TO_PRISMA_BILLING_CYCLE: Record<
  BillingCycleEnum,
  PrismaBillingCycle
> = {
  [BillingCycleEnum.MONTHLY]: PrismaBillingCycle.MONTHLY,
  [BillingCycleEnum.QUARTERLY]: PrismaBillingCycle.QUARTERLY,
  [BillingCycleEnum.SEMI_ANNUAL]: PrismaBillingCycle.SEMI_ANNUAL,
  [BillingCycleEnum.YEARLY]: PrismaBillingCycle.YEARLY,
};

export const DOMAIN_TO_PRISMA_SUBSCRIPTION_STATUS: Record<
  SubscriptionStatusEnum,
  PrismaSubscriptionStatus
> = {
  [SubscriptionStatusEnum.ACTIVE]: PrismaSubscriptionStatus.ACTIVE,
  [SubscriptionStatusEnum.TRIALING]: PrismaSubscriptionStatus.TRIALING,
  [SubscriptionStatusEnum.PAST_DUE]: PrismaSubscriptionStatus.PAST_DUE,
  [SubscriptionStatusEnum.GRACE]: PrismaSubscriptionStatus.GRACE,
  [SubscriptionStatusEnum.CANCELLED]: PrismaSubscriptionStatus.CANCELLED,
  [SubscriptionStatusEnum.EXPIRED]: PrismaSubscriptionStatus.EXPIRED,
  [SubscriptionStatusEnum.PAUSED]: PrismaSubscriptionStatus.PAUSED,
};
