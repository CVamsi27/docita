import { z } from 'zod';
import type {
  ClinicTier,
  BillingCycle,
} from '@/domains/subscriptions/core/value-objects';
import { subscriptionBillingCheckoutResponseSchema } from '@workspace/types';
import type { resolveSubscriptionBillingContact } from '@workspace/utils';

export interface CreateCheckoutRequest {
  clinicId: string;
  tier: string;
  cycle: string;
  /** Optional plan mode (Full / Front Desk / Core). Defaults to FULL. */
  planMode?: string;
  referrals?: string[];
}

/**
 * Internal shape of the checkout result, derived from the shared wire contract
 * so the two cannot drift. See
 * `subscriptionBillingCheckoutResponseSchema` for why this is a union.
 */
export type CheckoutResponse = z.infer<
  typeof subscriptionBillingCheckoutResponseSchema
>;

type ResolvedSubscriptionBillingContact = ReturnType<
  typeof resolveSubscriptionBillingContact
>;

export function buildCheckoutPrefill(
  contact: ResolvedSubscriptionBillingContact,
) {
  return {
    name: contact.name,
    email: contact.email,
    ...(contact.phone ? { contact: contact.phone } : {}),
  };
}

export function buildCheckoutDescription(
  tier: ClinicTier,
  cycle: BillingCycle,
): string {
  return `${tier.value} ${cycle.value} subscription`;
}

export function buildCheckoutOrderNotes(input: {
  clinicId: string;
  tier: string;
  cycle: string;
  pricingOfferTitle?: string;
}) {
  return {
    clinicId: input.clinicId,
    tier: input.tier,
    cycle: input.cycle,
    pricingOffer: input.pricingOfferTitle ?? '',
  };
}

export function buildCompletedWithoutPaymentResponse(input: {
  currency: string;
  prefill: CheckoutResponse['prefill'];
}): CheckoutResponse {
  return {
    currency: input.currency,
    completedWithoutPayment: true,
    prefill: input.prefill,
  };
}
