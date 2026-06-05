"use client";

import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { toast } from "sonner";
import {
  isPaymentCanceledError,
  notifyPaymentCanceled,
  type RazorpayResponse,
  useRazorpay,
} from "@/hooks/use-razorpay";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  type ClinicRegistrationData,
} from "@/features/onboarding/components/types";
import { Tier, type MultiCurrencyTierPricing } from "@workspace/types";
import { getTierName } from "@workspace/utils";
import type { PlanSelectionOptions } from "./onboarding-plan-checkout";
import {
  ERROR_ACCOUNT_DETAILS,
  ERROR_ENTERPRISE_SALES,
  ERROR_PAYMENT_START,
  processPlanPaymentFlow,
  resolvePlanPricing,
} from "./clinic-registration-helpers";

interface UsePlanSelectionActionParams {
  clinicDetails: ClinicRegistrationData["clinicDetails"];
  ensureOnboardingId: () => Promise<string>;
  setFormData: Dispatch<SetStateAction<ClinicRegistrationData>>;
  setStep: (step: number) => void;
  user?: { email?: string | null; name?: string | null };
}

interface PaidPlanFlowParams {
  tier: string;
  billingCycle: "MONTHLY" | "YEARLY";
  currency: string;
  mode: NonNullable<PlanSelectionOptions["mode"]>;
  clinicDetails: ClinicRegistrationData["clinicDetails"];
  ensureOnboardingId: () => Promise<string>;
  openCheckout: ReturnType<typeof useRazorpay>["openCheckout"];
  setFormData: Dispatch<SetStateAction<ClinicRegistrationData>>;
  setIsProcessingPayment: Dispatch<SetStateAction<boolean>>;
  setStep: (step: number) => void;
  user: { email: string; name?: string | null };
}

export function usePlanSelectionAction({
  clinicDetails,
  ensureOnboardingId,
  setFormData,
  setStep,
  user,
}: UsePlanSelectionActionParams) {
  const { openCheckout } = useRazorpay();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const setPlanSelection = useCallback(
    async (
      tier: string,
      billingCycle: "MONTHLY" | "YEARLY",
      pricing: MultiCurrencyTierPricing,
      options?: PlanSelectionOptions,
    ) => {
      const { price, currency, mode } = resolvePlanPricing(
        billingCycle,
        pricing,
        options,
      );
      applyPlanSelection(setFormData, { tier, billingCycle, price, currency, mode });
      if (tier === getTierName(Tier.ENTERPRISE)) {
        toast.info(ERROR_ENTERPRISE_SALES);
        return;
      }
      if (!user?.email) {
        showUserFacingErrorToast(null, ERROR_ACCOUNT_DETAILS, "form");
        return;
      }

      await runPaidPlanFlow({
        tier,
        billingCycle,
        currency,
        mode,
        clinicDetails,
        ensureOnboardingId,
        openCheckout,
        setFormData,
        setIsProcessingPayment,
        setStep,
        user: { email: user.email, name: user.name },
      });
    },
    [clinicDetails, ensureOnboardingId, openCheckout, setFormData, setStep, user],
  );

  return { isProcessingPayment, setPlanSelection };
}

function applyPlanSelection(
  setFormData: Dispatch<SetStateAction<ClinicRegistrationData>>,
  selection: {
    tier: string;
    billingCycle: "MONTHLY" | "YEARLY";
    price: number;
    currency: string;
    mode: NonNullable<PlanSelectionOptions["mode"]>;
  },
): void {
  setFormData((prev) => ({
    ...prev,
    planSelection: {
      tier: selection.tier,
      billingCycle: selection.billingCycle,
      price: selection.price,
      currency: selection.currency,
      isCoreTrial: false,
      planMode: selection.mode,
    },
  }));
}

async function runPaidPlanFlow(params: PaidPlanFlowParams): Promise<void> {
  try {
    params.setIsProcessingPayment(true);
    const oid = await params.ensureOnboardingId();
    await processPlanPaymentFlow(
      {
        onboardingId: oid,
        tier: params.tier,
        billingCycle: params.billingCycle,
        currency: params.currency,
        planMode: params.mode,
        clinicDetails: params.clinicDetails,
        customer: params.user,
      },
      {
        openCheckout: params.openCheckout,
        ...createPaymentFlowHandlers(params.setFormData, params.setStep),
      },
    );
  } catch (error) {
    handlePlanPaymentError(error);
  } finally {
    params.setIsProcessingPayment(false);
  }
}

function createPaymentFlowHandlers(
  setFormData: Dispatch<SetStateAction<ClinicRegistrationData>>,
  setStep: (step: number) => void,
) {
  return {
    onTrialEligible: () => {
      setFormData((prev) => ({
        ...prev,
        paymentDetails: { skipPayment: true, autoPay: true },
      }));
      setStep(5);
    },
    onPaymentCompleted: (response: RazorpayResponse) => {
      setFormData((prev) => ({
        ...prev,
        paymentDetails: {
          razorpayPaymentId: response.razorpay_payment_id,
          razorpayOrderId: response.razorpay_order_id,
          razorpaySignature: response.razorpay_signature,
          autoPay: true,
          skipPayment: false,
        },
      }));
      setStep(5);
    },
  };
}

function handlePlanPaymentError(error: unknown): void {
  if (isPaymentCanceledError(error)) {
    notifyPaymentCanceled();
    return;
  }
  showUserFacingErrorToast(error, ERROR_PAYMENT_START, "payment");
}
