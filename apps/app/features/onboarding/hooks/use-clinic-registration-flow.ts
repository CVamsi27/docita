"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  isPaymentCanceledError,
  notifyPaymentCanceled,
  useRazorpay,
} from "@/hooks/use-razorpay";
import { apiFetch } from "@/lib/api/api-client";
import { useAuth } from "@/lib/auth/auth-context";
import { buildCsrfHeaders, buildJsonHeaders } from "@/lib/auth/csrf";
import { ApiError } from "@/lib/errors";
import {
  type ClinicDetails,
  type ClinicRegistrationData,
  type ComplianceSettings,
  defaultClinicRegistrationData,
  type TeamMember,
} from "@/features/onboarding/components/types";
import { DEFAULT_CURRENCY, getUserFacingErrorMessage } from "@workspace/utils";
import type { PlanMode } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { parseClinicDetailsDraft } from "@/features/onboarding/components/forms/clinic-registration-form-helpers";
import {
  clearOnboardingSession,
  getPersistedFormData,
  getPersistedOnboardingId,
  getPersistedStep,
  isRestartableOnboardingError,
  persistFormData,
  persistOnboardingId,
  persistStep,
} from "./onboarding-session-storage";
import {
  buildRegistrationPayload,
  validateRegistrationRequirements,
} from "./onboarding-payload";
import {
  openOnboardingPlanCheckout,
  type PlanPricing,
  type PlanSelectionOptions,
} from "./onboarding-plan-checkout";
import { completeOnboardingRegistration } from "./onboarding-completion";

export function useClinicRegistrationFlow() {
  const { user, refreshUser } = useAuth();
  const [step, setStepState] = useState<number>(() => getPersistedStep());
  const [onboardingId, setOnboardingIdState] = useState<string | null>(() =>
    getPersistedOnboardingId(),
  );
  const validatedOnboardingIdRef = useRef<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const { openCheckout } = useRazorpay();
  const [formData, setFormData] = useState<ClinicRegistrationData>(() =>
    getPersistedFormData(),
  );

  useEffect(() => {
    persistFormData(formData);
  }, [formData]);

  const setStep = useCallback((n: number) => {
    setStepState(n);
    persistStep(n);
  }, []);

  const setOnboardingId = useCallback((id: string | null) => {
    setOnboardingIdState(id);
    validatedOnboardingIdRef.current = null;
    persistOnboardingId(id);
  }, []);

  const restartOnboarding = useCallback(() => {
    setFormData(defaultClinicRegistrationData);
    setOnboardingId(null);
    setStep(1);
    clearOnboardingSession();
    persistStep(1);
  }, [setOnboardingId, setStep]);

  const initializeOnboardingId = useCallback(async (): Promise<string> => {
    const data = await apiFetch<{ onboardingId: string }>(
      "/onboarding/initialize",
      { method: "POST", headers: buildJsonHeaders(), body: JSON.stringify({}) },
    );
    setOnboardingId(data.onboardingId);
    validatedOnboardingIdRef.current = data.onboardingId;
    return data.onboardingId;
  }, [setOnboardingId]);

  const ensureOnboardingId = useCallback(
    async (options?: { forceRefresh?: boolean }): Promise<string> => {
      if (options?.forceRefresh === true) return initializeOnboardingId();
      if (onboardingId) {
        if (validatedOnboardingIdRef.current === onboardingId)
          return onboardingId;
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
            throw new Error(
              "We could not continue setup right now. Please try again.",
            );
          }
          if (!isRestartableOnboardingError(error)) throw error;
        }
        setOnboardingId(null);
      }
      return initializeOnboardingId();
    },
    [initializeOnboardingId, onboardingId, setOnboardingId],
  );

  const uploadSlaSignature = useCallback(
    async (file: File): Promise<string> => {
      const oid = await ensureOnboardingId();
      const sessionData = await apiFetch<{ id: string; uploadSecret: string }>(
        `/onboarding/${oid}/sla-signature-session`,
        {
          method: "POST",
          headers: buildJsonHeaders(),
          body: JSON.stringify({}),
        },
      );
      const body = new FormData();
      body.append("file", file);
      await apiFetch(
        `/onboarding/${oid}/sla-signature-session/${sessionData.id}`,
        {
          method: "POST",
          headers: buildCsrfHeaders({
            "X-Upload-Secret": sessionData.uploadSecret,
          }),
          body,
        },
      );
      return sessionData.id;
    },
    [ensureOnboardingId],
  );

  const setClinicDetails = useCallback(
    (data: ClinicDetails) => {
      setFormData((prev) => ({ ...prev, clinicDetails: data }));
      setStep(2);
    },
    [setStep],
  );

  const setClinicWeeklyHours = useCallback(
    (rows: ClinicRegistrationData["clinicWeeklyHours"]) => {
      setFormData((prev) => ({ ...prev, clinicWeeklyHours: rows }));
      setStep(3);
    },
    [setStep],
  );

  const setPlanSelection = useCallback(
    async (
      tier: string,
      billingCycle: "MONTHLY" | "YEARLY",
      pricing: PlanPricing,
      options?: PlanSelectionOptions,
    ) => {
      const price =
        billingCycle === "YEARLY" ? pricing.yearly : pricing.monthly;
      const resolvedCurrency = options?.currency || DEFAULT_CURRENCY;
      const resolvedMode: PlanMode = options?.mode ?? "FULL";

      setFormData((prev) => ({
        ...prev,
        planSelection: {
          tier,
          billingCycle,
          price: typeof price === "number" ? price : 0,
          currency: resolvedCurrency,
          isCoreTrial: false,
          planMode: resolvedMode,
        },
      }));

      if (tier === "ENTERPRISE") {
        toast.info("Enterprise plans are handled by our sales team");
        return;
      }
      if (tier === "ESSENTIAL") {
        setFormData((prev) => ({
          ...prev,
          paymentDetails: { skipPayment: true, autoPay: true },
        }));
        setStep(5);
        return;
      }
      if (!user?.email) {
        showUserFacingErrorToast(
          null,
          "Please complete your account details before starting payment",
          "form",
        );
        return;
      }

      try {
        setIsProcessingPayment(true);
        const oid = await ensureOnboardingId();
        const checkoutResult = await openOnboardingPlanCheckout({
          onboardingId: oid,
          tier,
          billingCycle,
          currency: resolvedCurrency,
          planMode: resolvedMode,
          clinicDetails: formData.clinicDetails,
          customer: { email: user.email, name: user.name },
          openCheckout,
          onPaymentCompleted: (response) => {
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
        });

        if (checkoutResult.status === "canceled") {
          return;
        }
        if (checkoutResult.status === "failed") {
          showUserFacingErrorToast(
            undefined,
            "We could not complete this payment. Please try again.",
            "payment",
          );
          return;
        }
      } catch (error) {
        if (isPaymentCanceledError(error)) {
          notifyPaymentCanceled();
          return;
        }
        showUserFacingErrorToast(
          error,
          "We could not start payment right now. Please try again.",
          "payment",
        );
      } finally {
        setIsProcessingPayment(false);
      }
    },
    [ensureOnboardingId, formData.clinicDetails, openCheckout, user, setStep],
  );

  const setTeamMembers = useCallback(
    async (members: TeamMember[]) => {
      setFormData((prev) => ({ ...prev, teamMembers: members }));
      await ensureOnboardingId();
      setStep(4);
    },
    [setStep, ensureOnboardingId],
  );

  const goBackFromCompliance = useCallback(() => setStep(4), [setStep]);

  // Mirror compliance edits (agreement acceptance, signature session) into the
  // persisted form data so they survive a remount — e.g. returning to the wizard
  // after a phone signature upload. Without this the acceptance only lived in the
  // in-memory compliance form and was lost on re-init.
  const setComplianceDraft = useCallback(
    (compliance: Partial<ComplianceSettings>) => {
      setFormData((prev) => ({
        ...prev,
        compliance: { ...prev.compliance, ...compliance },
      }));
    },
    [],
  );

  const submitRegistration = useCallback(
    async (complianceData: ComplianceSettings, onSuccess: () => void) => {
      const ownerRole =
        user?.role === "ADMIN_DOCTOR" ? "ADMIN_DOCTOR" : "ADMIN";
      const ownerName = user?.name ?? "";
      const ownerEmail = user?.email ?? "";

      const { stepOneMissing, all: missing } = validateRegistrationRequirements(
        formData.clinicDetails,
        user?.name,
        user?.email,
        complianceData,
      );
      if (missing.length > 0) {
        setStep(stepOneMissing.length > 0 ? 1 : 5);
        throw new Error(
          `Complete the pending onboarding items before continuing: ${missing.join(", ")}`,
        );
      }
      const details = parseClinicDetailsDraft(formData.clinicDetails);
      if (!details) {
        setStep(1);
        throw new Error(
          "Complete the pending onboarding items before continuing: valid facility details",
        );
      }

      try {
        const payload = buildRegistrationPayload(
          formData,
          details,
          { name: ownerName, email: ownerEmail, role: ownerRole },
          complianceData,
        );
        const oid = await ensureOnboardingId();
        const shouldRefreshUser = await completeOnboardingRegistration(
          oid,
          payload,
        );
        if (shouldRefreshUser) {
          try {
            await refreshUser();
          } catch {
            /* ignore */
          }
        }

        toast.success("Registration Successful", {
          description: "Your facility has been registered. Redirecting…",
        });
        clearOnboardingSession();
        onSuccess();
      } catch (error) {
        if (isRestartableOnboardingError(error)) {
          restartOnboarding();
          showUserFacingErrorToast(
            null,
            "We could not finish setup. Please start again.",
            "form",
          );
          return;
        }
        showUserFacingErrorToast(
          error,
          getUserFacingErrorMessage(error, {
            fallback: "We could not finish setup. Please try again.",
            context: "form",
          }),
          "form",
        );
      }
    },
    [
      ensureOnboardingId,
      formData,
      refreshUser,
      restartOnboarding,
      setStep,
      user?.email,
      user?.name,
      user?.role,
    ],
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
    setClinicWeeklyHours,
    goBackFromCompliance,
    setComplianceDraft,
    submitRegistration,
    uploadSlaSignature,
    ensureOnboardingId,
    restartOnboarding,
  };
}
