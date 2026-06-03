import type {
  ClinicDetails,
  ComplianceSettings,
} from "@/features/onboarding/components/types";
import type { PlanMode, MultiCurrencyTierPricing } from "@workspace/types";
import { DEFAULT_CURRENCY, getUserFacingErrorMessage } from "@workspace/utils";
import { toast } from "sonner";
import { ApiError } from "@/lib/errors";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { parseClinicDetailsDraft } from "@/features/onboarding/components/forms/clinic-registration-form-helpers";
import { validateRegistrationRequirements } from "./onboarding-payload";
import {
  getOnboardingTrialEligibility,
  openOnboardingPlanCheckout,
} from "./onboarding-plan-checkout";
import { isRestartableOnboardingError } from "./onboarding-session-storage";
import type { RazorpayCheckoutResult, RazorpayResponse } from "@/hooks/use-razorpay";

// ===== Error message constants =====

export const ERROR_CONTINUE_SETUP =
  "We could not continue setup right now. Please try again.";
export const ERROR_ENTERPRISE_SALES =
  "Enterprise plans are handled by our sales team";
export const ERROR_ACCOUNT_DETAILS =
  "Please complete your account details before starting payment";
export const ERROR_PAYMENT_START =
  "We could not start payment right now. Please try again.";
export const ERROR_PAYMENT_COMPLETE =
  "We could not complete this payment. Please try again.";
export const ERROR_SETUP_RESTART =
  "We could not finish setup. Please start again.";
export const ERROR_SETUP_RETRY =
  "We could not finish setup. Please try again.";
export const ERROR_TRIAL_USED =
  "Your free trial has already been used. Complete payment to continue.";

const ERROR_PENDING_ITEMS =
  "Complete the pending onboarding items before continuing";
const MISSING_FACILITY_DETAILS = "valid facility details";

// ===== Owner role =====

export function resolveOwnerRole(
  role?: string,
): "ADMIN_DOCTOR" | "ADMIN" {
  return role === "ADMIN_DOCTOR" ? "ADMIN_DOCTOR" : "ADMIN";
}

// ===== Registration validation =====

export interface RegistrationValidationResult {
  valid: boolean;
  targetStep: number;
  errorMessage?: string;
  parsedDetails?: ClinicDetails;
}

export function validateRegistrationData(
  clinicDetails: Partial<ClinicDetails>,
  ownerName: string | undefined,
  ownerEmail: string | undefined,
  complianceData: ComplianceSettings,
): RegistrationValidationResult {
  const { stepOneMissing, all: missing } = validateRegistrationRequirements(
    clinicDetails,
    ownerName,
    ownerEmail,
    complianceData,
  );
  if (missing.length > 0) {
    return {
      valid: false,
      targetStep: stepOneMissing.length > 0 ? 1 : 5,
      errorMessage: `${ERROR_PENDING_ITEMS}: ${missing.join(", ")}`,
    };
  }

  const details = parseClinicDetailsDraft(clinicDetails);
  if (!details) {
    return {
      valid: false,
      targetStep: 1,
      errorMessage: `${ERROR_PENDING_ITEMS}: ${MISSING_FACILITY_DETAILS}`,
    };
  }

  return { valid: true, targetStep: -1, parsedDetails: details };
}

// ===== Plan pricing resolution =====

export interface ResolvedPricing {
  price: number;
  currency: string;
  mode: PlanMode;
}

export function resolvePlanPricing(
  billingCycle: "MONTHLY" | "YEARLY",
  pricing: MultiCurrencyTierPricing,
  options?: { currency?: string; mode?: PlanMode },
): ResolvedPricing {
  const rawPrice =
    billingCycle === "YEARLY" ? pricing.yearly : pricing.monthly;
  return {
    price: typeof rawPrice === "number" ? rawPrice : 0,
    currency: options?.currency || DEFAULT_CURRENCY,
    mode: options?.mode ?? "FULL",
  };
}

// ===== Trial / payment flow =====

export interface PlanPaymentConfig {
  onboardingId: string;
  tier: string;
  billingCycle: "MONTHLY" | "YEARLY";
  currency: string;
  planMode: PlanMode;
  clinicDetails: Partial<ClinicDetails>;
  customer: { email: string; name?: string | null };
}

export async function processPlanPaymentFlow(
  config: PlanPaymentConfig,
  deps: {
    openCheckout: (options: Record<string, unknown>) => Promise<RazorpayCheckoutResult>;
    // ^ The exact type (RazorpayOptions) → Promise<RazorpayCheckoutResult> is
    // enforced at the call site; we keep a relaxed type here for isolation.
    onTrialEligible: () => void;
    onPaymentCompleted: (response: RazorpayResponse) => void;
  },
): Promise<"canceled" | "failed" | "completed"> {
  const trialEligible = await getOnboardingTrialEligibility(config.onboardingId);
  if (trialEligible) {
    deps.onTrialEligible();
    return "completed";
  }

  toast.info(ERROR_TRIAL_USED);
  const checkoutResult = await openOnboardingPlanCheckout({
    onboardingId: config.onboardingId,
    tier: config.tier,
    billingCycle: config.billingCycle,
    currency: config.currency,
    planMode: config.planMode,
    clinicDetails: config.clinicDetails,
    customer: config.customer,
    openCheckout: deps.openCheckout as never,
    onPaymentCompleted: deps.onPaymentCompleted,
  });

  if (checkoutResult.status === "canceled") return "canceled";
  if (checkoutResult.status === "failed") {
    showUserFacingErrorToast(undefined, ERROR_PAYMENT_COMPLETE, "payment");
    return "failed";
  }
  return "completed";
}

// ===== Onboarding ID validation error handling =====

export function handleOnboardingValidateError(error: unknown): void {
  if (
    error instanceof ApiError &&
    error.statusCode !== 400 &&
    error.statusCode !== 404
  ) {
    throw new Error(ERROR_CONTINUE_SETUP);
  }
  if (!isRestartableOnboardingError(error)) throw error;
}

// ===== Submit registration error handling =====

export function handleSubmitRegistrationError(
  error: unknown,
  restartOnboarding: () => void,
): void {
  if (isRestartableOnboardingError(error)) {
    restartOnboarding();
    showUserFacingErrorToast(null, ERROR_SETUP_RESTART, "form");
    return;
  }
  showUserFacingErrorToast(
    error,
    getUserFacingErrorMessage(error, {
      fallback: ERROR_SETUP_RETRY,
      context: "form",
    }),
    "form",
  );
}
