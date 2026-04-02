"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useRazorpay, type RazorpayResponse } from "@/hooks/use-razorpay";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { buildCsrfHeaders, buildJsonHeaders } from "@/lib/csrf";
import { ApiError } from "@/lib/errors";
import {
  type ClinicDetails,
  type ClinicRegistrationData,
  type ComplianceSettings,
  defaultClinicRegistrationData,
  type TeamMember,
} from "@/features/onboarding/components/types";
import { DEFAULT_CURRENCY } from "@workspace/utils";

interface PlanPricing {
  monthly: number | "custom";
  yearly: number | "custom";
}

interface PlanSelectionOptions {
  isCoreTrial?: boolean;
  currency?: string;
}

interface OnboardingCheckoutResponse {
  orderId: string;
  amountCents: number;
  currency: string;
  razorpayKeyId: string;
}
interface EnsureOnboardingIdOptions {
  forceRefresh?: boolean;
}

function formatMissingRequirements(missing: string[]): string {
  const unique = [...new Set(missing)];
  return unique.join(", ");
}

const SESSION_KEY = "docita_onboarding_step";
const SESSION_ONBOARDING_ID_KEY = "docita_onboarding_id";
const SESSION_FORM_DATA_KEY = "docita_onboarding_form_data";

function getPersistedStep(): number {
  if (typeof sessionStorage === "undefined") return 1;
  try {
    const v = sessionStorage.getItem(SESSION_KEY);
    const n = v ? parseInt(v, 10) : 1;
    const clamped = isNaN(n) ? 1 : Math.max(1, Math.min(n, 4));
    const persistedOnboardingId = sessionStorage.getItem(
      SESSION_ONBOARDING_ID_KEY,
    );

    // Step 4 requires an onboarding session ID (used for QR signature flow).
    // If an older/stale session has step 4 but no ID, recover to step 3.
    if (clamped >= 4 && !persistedOnboardingId) {
      return 3;
    }

    return clamped;
  } catch {
    return 1;
  }
}

function getPersistedOnboardingId(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    return sessionStorage.getItem(SESSION_ONBOARDING_ID_KEY);
  } catch {
    return null;
  }
}

function getPersistedFormData(): ClinicRegistrationData {
  if (typeof sessionStorage === "undefined") return defaultClinicRegistrationData;
  try {
    const raw = sessionStorage.getItem(SESSION_FORM_DATA_KEY);
    if (!raw) return defaultClinicRegistrationData;
    const parsed = JSON.parse(raw) as Partial<ClinicRegistrationData>;
    return {
      ...defaultClinicRegistrationData,
      ...parsed,
      clinicDetails: {
        ...defaultClinicRegistrationData.clinicDetails,
        ...(parsed.clinicDetails || {}),
      },
      compliance: {
        ...defaultClinicRegistrationData.compliance,
        ...(parsed.compliance || {}),
      },
      planSelection: {
        ...defaultClinicRegistrationData.planSelection,
        ...(parsed.planSelection || {}),
      },
      paymentDetails: {
        ...defaultClinicRegistrationData.paymentDetails,
        ...(parsed.paymentDetails || {}),
      },
      teamMembers: Array.isArray(parsed.teamMembers)
        ? parsed.teamMembers
        : defaultClinicRegistrationData.teamMembers,
    };
  } catch {
    return defaultClinicRegistrationData;
  }
}

export function useClinicRegistrationFlow() {
  const { user, refreshUser } = useAuth();
  const [step, setStepState] = useState<number>(() => getPersistedStep());
  const [onboardingId, setOnboardingIdState] = useState<string | null>(() => getPersistedOnboardingId());
  const validatedOnboardingIdRef = useRef<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const { openCheckout } = useRazorpay();
  const [formData, setFormData] = useState<ClinicRegistrationData>(
    () => getPersistedFormData(),
  );

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_FORM_DATA_KEY, JSON.stringify(formData));
    } catch {
      // ignore storage failures
    }
  }, [formData]);

  const setStep = useCallback((n: number) => {
    setStepState(n);
    try { sessionStorage.setItem(SESSION_KEY, String(n)); } catch { /* ignore */ }
  }, []);

  const setOnboardingId = useCallback((id: string | null) => {
    setOnboardingIdState(id);
    validatedOnboardingIdRef.current = null;
    try {
      if (id) sessionStorage.setItem(SESSION_ONBOARDING_ID_KEY, id);
      else sessionStorage.removeItem(SESSION_ONBOARDING_ID_KEY);
    } catch { /* ignore */ }
  }, []);

  const restartOnboarding = useCallback(() => {
    setFormData(defaultClinicRegistrationData);
    setOnboardingId(null);
    setStep(1);
    try {
      sessionStorage.removeItem(SESSION_ONBOARDING_ID_KEY);
      sessionStorage.removeItem(SESSION_FORM_DATA_KEY);
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // ignore storage failures
    }
  }, [setOnboardingId, setStep]);

  const initializeOnboardingId = useCallback(async (): Promise<string> => {
    const initData = await apiFetch<{ onboardingId: string }>(
      "/onboarding/initialize",
      {
        method: "POST",
        headers: buildJsonHeaders(),
        body: JSON.stringify({}),
      },
    );
    setOnboardingId(initData.onboardingId);
    validatedOnboardingIdRef.current = initData.onboardingId;
    return initData.onboardingId;
  }, [setOnboardingId]);

  const ensureOnboardingId = useCallback(async (
    options?: EnsureOnboardingIdOptions,
  ): Promise<string> => {
    const forceRefresh = options?.forceRefresh === true;
    if (forceRefresh) {
      // Force refresh is used on critical transitions (for example QR signature setup)
      // where stale in-memory backend sessions can break progress. Always mint a new
      // onboarding session to guarantee server-side consistency.
      return initializeOnboardingId();
    }

    if (onboardingId) {
      if (validatedOnboardingIdRef.current === onboardingId) {
        return onboardingId;
      }

      try {
        await apiFetch(`/onboarding/${onboardingId}/progress`, {
          method: "GET",
          headers: buildJsonHeaders(),
          cache: "no-store",
        });

        validatedOnboardingIdRef.current = onboardingId;
        return onboardingId;
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.statusCode !== 400 &&
          error.statusCode !== 404
        ) {
          throw new Error(error.message || "Unable to validate onboarding session");
        }

        if (
          error instanceof Error &&
          !error.message.toLowerCase().includes("onboarding")
        ) {
          throw error;
        }
      }

      // Persisted onboardingId may exist in browser storage while in-memory API session was cleared.
      setOnboardingId(null);
    }

    return initializeOnboardingId();
  }, [initializeOnboardingId, onboardingId, setOnboardingId]);

  const uploadSlaSignature = useCallback(
    async (file: File): Promise<string> => {
      const currentOnboardingId = await ensureOnboardingId();

      const sessionData = await apiFetch<{ id: string }>(
        `/onboarding/${currentOnboardingId}/sla-signature-session`,
        {
          method: "POST",
          headers: buildJsonHeaders(),
          body: JSON.stringify({}),
        },
      );

      const uploadData = new FormData();
      uploadData.append("file", file);

      await apiFetch(
        `/onboarding/${currentOnboardingId}/sla-signature-session/${sessionData.id}`,
        {
          method: "POST",
          headers: buildCsrfHeaders(),
          body: uploadData,
        },
      );

      return sessionData.id;
    },
    [ensureOnboardingId],
  );

  const setClinicDetails = useCallback((data: ClinicDetails) => {
    setFormData((prev) => ({ ...prev, clinicDetails: data }));
    setStep(2);
  }, [setStep]);

  const setPlanSelection = useCallback(
    async (
      tier: string,
      billingCycle: "MONTHLY" | "YEARLY",
      pricing: PlanPricing,
      options?: PlanSelectionOptions,
    ) => {
      const price =
        billingCycle === "YEARLY" ? pricing.yearly : pricing.monthly;

      const isCoreTrial =
        tier === "ESSENTIAL" && options?.isCoreTrial !== false;
      const resolvedCurrency = options?.currency || DEFAULT_CURRENCY;

      setFormData((prev) => ({
        ...prev,
        planSelection: {
          tier,
          billingCycle,
          price: typeof price === "number" ? price : 0,
          currency: resolvedCurrency,
          isCoreTrial,
        },
      }));

      if (tier === "ENTERPRISE") {
        toast.info("Enterprise plans are handled by our sales team.");
        return;
      }

      if (tier === "STARTER" || isCoreTrial) {
        setFormData((prev) => ({
          ...prev,
          paymentDetails: {
            skipPayment: true,
            autoPay: true,
          },
        }));

        setStep(3);
        return;
      }

      if (!user?.email) {
        const missing: string[] = [];
        if (!user?.email) missing.push("owner email");
        if (!user?.name) missing.push("owner name");
        toast.error(
          `Missing required data: ${formatMissingRequirements(missing)}.`,
          {
            description:
              "Update your account profile details before starting payment.",
          },
        );
        return;
      }

      try {
        setIsProcessingPayment(true);
        const currentOnboardingId = await ensureOnboardingId();
        const checkoutData = await apiFetch<
          OnboardingCheckoutResponse & { message?: string }
        >(`/onboarding/${currentOnboardingId}/checkout`, {
          method: "POST",
          headers: buildJsonHeaders(),
          body: JSON.stringify({
            tier,
            billingCycle,
            currency: resolvedCurrency,
            gstin: formData.clinicDetails.gstin,
            customerEmail: user.email,
            customerName: user.name,
            customerPhone: formData.clinicDetails.phone,
          }),
        });

        await openCheckout({
          key: checkoutData.razorpayKeyId,
          amount: checkoutData.amountCents,
          currency: checkoutData.currency,
          name: "Docita Onboarding",
          description: `${tier} ${billingCycle} subscription`,
          order_id: checkoutData.orderId,
          handler: async (response: RazorpayResponse) => {
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
            setStep(3);
          },
          prefill: {
            name: user.name || "Clinic Owner",
            email: user.email,
            contact: formData.clinicDetails.phone || undefined,
          },
          theme: { color: "#0F172A" },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Payment failed";
        if (message === "Payment was cancelled") {
          toast.info(message);
        } else {
          toast.error(message);
        }
      } finally {
        setIsProcessingPayment(false);
      }
    },
    [ensureOnboardingId, formData.clinicDetails, openCheckout, user, setStep],
  );

  const setTeamMembers = useCallback(async (members: TeamMember[]) => {
    setFormData((prev) => ({ ...prev, teamMembers: members }));
    await ensureOnboardingId();
    setStep(4);
  }, [setStep, ensureOnboardingId]);

  const goBackFromCompliance = useCallback(() => {
    setStep(3);
  }, [setStep]);

  const submitRegistration = useCallback(
    async (complianceData: ComplianceSettings, onSuccess: () => void) => {
      const details = formData.clinicDetails as ClinicDetails;
      const ownerRole =
        user?.role === "ADMIN_DOCTOR" ? "ADMIN_DOCTOR" : "ADMIN";

      const missingRequirements: string[] = [];
      if (!details.name?.trim()) missingRequirements.push("clinic name (Step 1)");
      if (!details.email?.trim()) missingRequirements.push("clinic email (Step 1)");
      if (!details.phone?.trim()) missingRequirements.push("clinic phone (Step 1)");
      if (!details.address?.trim()) missingRequirements.push("clinic address (Step 1)");
      if (!details.type) missingRequirements.push("clinic type (Step 1)");
      if (!user?.name?.trim()) missingRequirements.push("owner name");
      if (!user?.email?.trim()) missingRequirements.push("owner email");
      if (!complianceData.slaSignatureSessionId?.trim()) {
        missingRequirements.push("SLA signature upload (Step 4)");
      }
      if (!complianceData.acceptedSLA) {
        missingRequirements.push("SLA agreement acceptance (Step 4)");
      }
      if (!complianceData.acceptedPrivacyPolicy) {
        missingRequirements.push("privacy policy acceptance (Step 4)");
      }
      if (!complianceData.acceptedDataProcessing) {
        missingRequirements.push("data processing agreement acceptance (Step 4)");
      }

      if (missingRequirements.length > 0) {
        toast.error(
          `Missing required data: ${formatMissingRequirements(missingRequirements)}.`,
          {
            description:
              "Progress could not be restored safely. Starting over from Step 1.",
          },
        );
        restartOnboarding();
        return;
      }

      const ownerName = user?.name ?? "";
      const ownerEmail = user?.email ?? "";

      try {
        const payload = {
          clinicDetails: details,
          adminAccount: {
            name: ownerName,
            email: ownerEmail,
            role: ownerRole,
          },
          planSelection: {
            tier: formData.planSelection.tier,
            billingCycle: formData.planSelection.billingCycle,
            currency: formData.planSelection.currency,
          },
          slaAgreement: {
            acceptedSLA: complianceData.acceptedSLA,
            acceptedPrivacyPolicy: complianceData.acceptedPrivacyPolicy,
            acceptedDataProcessingTerms: complianceData.acceptedDataProcessing,
            slaVersion: "1.0",
            acceptedBy: ownerName,
            signatureSessionId: complianceData.slaSignatureSessionId,
            ipAddress: "client-ip",
            userAgent: navigator.userAgent,
          },
          consentManagement: {
            enableWhatsAppCommunication: complianceData.enableWhatsApp,
            enableMarketingCommunications: false,
            patientConsentRequiredBeforeWhatsApp: complianceData.requireConsent,
            logAllConsentChanges: true,
            dataProcessingPurposes: ["TREATMENT", "BILLING"],
          },
          paymentDetails: {
            cardLast4:
              formData.paymentDetails?.cardLast4 ||
              formData.paymentDetails?.cardNumber,
            razorpayPaymentId: formData.paymentDetails?.razorpayPaymentId,
            razorpayOrderId: formData.paymentDetails?.razorpayOrderId,
            razorpaySignature: formData.paymentDetails?.razorpaySignature,
            autoPay: formData.paymentDetails?.autoPay,
            skipPayment: formData.paymentDetails?.skipPayment,
          },
          teamMembers: formData.teamMembers,
        };

        const currentOnboardingId = await ensureOnboardingId();
        const responseData = await apiFetch<{
          success?: boolean;
          message?: string;
          errors?: string[];
          access_token?: string;
          user?: unknown;
        }>(`/onboarding/${currentOnboardingId}/complete`, {
          method: "POST",
          headers: buildJsonHeaders(),
          body: JSON.stringify(payload),
        });

        if (responseData.success === false) {
          throw new Error(
            responseData.errors?.[0] ||
              responseData.message ||
              "Registration failed",
          );
        }

        if (responseData.access_token && responseData.user) {
          localStorage.setItem("docita_token", responseData.access_token);
          localStorage.setItem(
            "docita_user",
            JSON.stringify(responseData.user),
          );

          // Refresh in-memory auth state so pages using `useAuth` update immediately
          try {
            await refreshUser();
          } catch {
            // fallback: noop
          }
        }

        toast.success("Registration Successful", {
          description: "Your clinic has been registered. Redirecting...",
        });

        // Clear session persistence on successful completion
        try {
          sessionStorage.removeItem(SESSION_KEY);
          sessionStorage.removeItem(SESSION_ONBOARDING_ID_KEY);
          sessionStorage.removeItem(SESSION_FORM_DATA_KEY);
        } catch { /* ignore */ }

        onSuccess();
      } catch (error) {
        const message = (error as Error).message;
        const shouldRestartOnboarding =
          /onboarding session not found|expired|validation|missing required/i.test(
            message,
          );

        if (shouldRestartOnboarding) {
          restartOnboarding();
          toast.error("Registration data became invalid", {
            description: `${message}. Restarted from Step 1.`,
          });
          return;
        }

        toast.error("Registration Failed", {
          description: message,
        });
      }
    },
    [ensureOnboardingId, formData.clinicDetails, formData.paymentDetails?.autoPay, formData.paymentDetails?.cardLast4, formData.paymentDetails?.cardNumber, formData.paymentDetails?.razorpayOrderId, formData.paymentDetails?.razorpayPaymentId, formData.paymentDetails?.razorpaySignature, formData.paymentDetails?.skipPayment, formData.planSelection.billingCycle, formData.planSelection.currency, formData.planSelection.tier, formData.teamMembers, refreshUser, restartOnboarding, user?.email, user?.name, user?.role],
  );

  return {
    step,
    setStep,
    formData,
    onboardingId,
    restoreOnboardingId: setOnboardingId,
    setClinicDetails,
    setPlanSelection,
    isProcessingPayment,
    setTeamMembers,
    goBackFromCompliance,
    submitRegistration,
    uploadSlaSignature,
    ensureOnboardingId,
    restartOnboarding,
  };
}
