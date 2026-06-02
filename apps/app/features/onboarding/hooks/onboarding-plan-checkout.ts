import { apiFetch } from "@/lib/api/api-client";
import { buildJsonHeaders } from "@/lib/auth/csrf";
import { BRAND_FOREGROUND_HEX } from "@/lib/constants/branding";
import type { ClinicDetails } from "@/features/onboarding/components/types";
import type { RazorpayResponse, useRazorpay } from "@/hooks/use-razorpay";
import {
  onboardingTrialEligibilityResponseSchema,
  type PlanMode,
} from "@workspace/types";

export interface PlanSelectionOptions {
  currency?: string;
  mode?: PlanMode;
}

interface OnboardingCheckoutResponse {
  orderId: string;
  amountCents: number;
  currency: string;
  razorpayKeyId: string;
}

interface OpenOnboardingPlanCheckoutOptions {
  onboardingId: string;
  tier: string;
  billingCycle: "MONTHLY" | "YEARLY";
  currency: string;
  planMode: PlanMode;
  clinicDetails: Pick<Partial<ClinicDetails>, "gstin" | "phone">;
  customer: { email: string; name?: string | null };
  openCheckout: ReturnType<typeof useRazorpay>["openCheckout"];
  onPaymentCompleted: (response: RazorpayResponse) => void;
}

export async function getOnboardingTrialEligibility(
  onboardingId: string,
): Promise<boolean> {
  const response = await apiFetch<unknown>(
    `/onboarding/${onboardingId}/trial-eligibility`,
    {
      method: "POST",
      headers: buildJsonHeaders(),
      body: JSON.stringify({}),
    },
  );
  return onboardingTrialEligibilityResponseSchema.parse(response).eligible;
}

export async function openOnboardingPlanCheckout({
  onboardingId,
  tier,
  billingCycle,
  currency,
  planMode,
  clinicDetails,
  customer,
  openCheckout,
  onPaymentCompleted,
}: OpenOnboardingPlanCheckoutOptions) {
  const checkout = await apiFetch<OnboardingCheckoutResponse>(
    `/onboarding/${onboardingId}/checkout`,
    {
      method: "POST",
      headers: buildJsonHeaders(),
      body: JSON.stringify({
        tier,
        billingCycle,
        currency,
        planMode,
        gstin: clinicDetails.gstin,
        customerEmail: customer.email,
        customerName: customer.name,
        customerPhone: clinicDetails.phone,
      }),
    },
  );

  return openCheckout({
    key: checkout.razorpayKeyId,
    amount: checkout.amountCents,
    currency: checkout.currency,
    name: "Docita Onboarding",
    description: `${tier} ${billingCycle} subscription`,
    order_id: checkout.orderId,
    handler: onPaymentCompleted,
    prefill: {
      name: customer.name || "Clinic Owner",
      email: customer.email,
      contact: clinicDetails.phone || undefined,
    },
    theme: { color: BRAND_FOREGROUND_HEX },
  });
}
