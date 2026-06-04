// check-as-cast-density: allow-file — narrowing casts required by generic signatures or external types
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
import {
  type ClinicDetails,
  type ClinicRegistrationData,
  type ComplianceSettings,
  defaultClinicRegistrationData,
  type TeamMember,
} from "@/features/onboarding/components/types";
import { getTierName } from "@workspace/utils";
import { Tier, type MultiCurrencyTierPricing } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  clearOnboardingSession,
  getPersistedFormData,
  getPersistedOnboardingId,
  getPersistedStep,
  persistFormData,
  persistOnboardingId,
  persistStep,
} from "./onboarding-session-storage";
import { buildRegistrationPayload } from "./onboarding-payload";
import type { PlanSelectionOptions } from "./onboarding-plan-checkout";
import { completeOnboardingRegistration } from "./onboarding-completion";
import {
  ERROR_ACCOUNT_DETAILS,
  ERROR_ENTERPRISE_SALES,
  ERROR_PAYMENT_START,
  handleOnboardingValidateError,
  handleSubmitRegistrationError,
  processPlanPaymentFlow,
  resolveOwnerRole,
  resolvePlanPricing,
  validateRegistrationData,
} from "./clinic-registration-helpers";

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
          handleOnboardingValidateError(error);
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
      pricing: MultiCurrencyTierPricing,
      options?: PlanSelectionOptions,
    ) => {
      const { price, currency, mode } = resolvePlanPricing(
        billingCycle,
        pricing,
        options,
      );

      setFormData((prev) => ({
        ...prev,
        planSelection: {
          tier,
          billingCycle,
          price,
          currency,
          isCoreTrial: false,
          planMode: mode,
        },
      }));

      if (tier === getTierName(Tier.ENTERPRISE)) {
        toast.info(ERROR_ENTERPRISE_SALES);
        return;
      }
      if (!user?.email) {
        showUserFacingErrorToast(null, ERROR_ACCOUNT_DETAILS, "form");
        return;
      }

      try {
        setIsProcessingPayment(true);
        const oid = await ensureOnboardingId();
        await processPlanPaymentFlow(
          {
            onboardingId: oid,
            tier,
            billingCycle,
            currency,
            planMode: mode,
            clinicDetails: formData.clinicDetails,
            customer: { email: user.email, name: user.name },
          },
          {
            openCheckout: (opts) => openCheckout(opts as never),
            onTrialEligible: () => {
              setFormData((prev) => ({
                ...prev,
                paymentDetails: { skipPayment: true, autoPay: true },
              }));
              setStep(5);
            },
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
          },
        );
      } catch (error) {
        if (isPaymentCanceledError(error)) {
          notifyPaymentCanceled();
          return;
        }
        showUserFacingErrorToast(error, ERROR_PAYMENT_START, "payment");
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
      const ownerRole = resolveOwnerRole(user?.role);
      const ownerName = user?.name ?? "";
      const ownerEmail = user?.email ?? "";

      const validation = validateRegistrationData(
        formData.clinicDetails,
        user?.name,
        user?.email,
        complianceData,
      );
      if (!validation.valid) {
        setStep(validation.targetStep);
        throw new Error(validation.errorMessage!);
      }

      try {
        const payload = buildRegistrationPayload(
          formData,
          validation.parsedDetails!,
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
        handleSubmitRegistrationError(error, restartOnboarding);
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
