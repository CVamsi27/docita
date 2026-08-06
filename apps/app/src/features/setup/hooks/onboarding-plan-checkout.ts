import { BRAND_FOREGROUND_HEX } from "@/lib/constants/branding";
import type { ClinicDetails } from "@/features/setup/components/onboarding/types";
import {
  createOnboardingCheckout,
  getOnboardingTrialEligibility as getTrialEligibility,
} from "@/features/setup/api/onboarding.api";
import type { RazorpayResponse, useRazorpay } from "@/hooks/use-razorpay";
import type { PlanMode } from "@workspace/types";

export interface PlanSelectionOptions {
  currency?: string;
  mode?: PlanMode;
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
  return getTrialEligibility(onboardingId);
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
  const checkout = await createOnboardingCheckout({
    onboardingId,
    tier,
    billingCycle,
    currency,
    planMode,
    gstin: clinicDetails.gstin,
    customerEmail: customer.email,
    customerName: customer.name,
    customerPhone: clinicDetails.phone,
  });

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
