import type {
  ClinicTier,
  BillingCycle,
} from '@/domains/subscriptions/core/value-objects';
import type { resolveSubscriptionBillingContact } from '@workspace/utils';

export interface CreateCheckoutRequest {
  clinicId: string;
  tier: string;
  cycle: string;
  /** Optional plan mode (Full / Front Desk / Core). Defaults to FULL. */
  planMode?: string;
  referrals?: string[];
}

export interface CheckoutResponse {
  orderId: string;
  amountCents: number;
  currency: string;
  razorpayKeyId: string;
  completedWithoutPayment?: boolean;
  prefill?: {
    name: string;
    email: string;
    contact?: string;
  };
}

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
  razorpayKeyId: string;
  prefill: CheckoutResponse['prefill'];
}): CheckoutResponse {
  return {
    orderId: '',
    amountCents: 0,
    currency: input.currency,
    razorpayKeyId: input.razorpayKeyId,
    completedWithoutPayment: true,
    prefill: input.prefill,
  };
}
