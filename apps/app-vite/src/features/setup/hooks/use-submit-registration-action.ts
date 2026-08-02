"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/monitoring/logger";
import {
  type ClinicRegistrationData,
  type ComplianceSettings,
} from "@/features/setup/components/onboarding/types";
import { buildRegistrationPayload } from "./onboarding-payload";
import { completeOnboardingRegistration } from "./onboarding-completion";
import {
  ERROR_PENDING_ITEMS,
  handleSubmitRegistrationError,
  resolveOwnerRole,
  validateRegistrationData,
} from "./clinic-registration-helpers";
import { clearOnboardingSession } from "./onboarding-session-storage";

interface UseSubmitRegistrationActionParams {
  ensureOnboardingId: () => Promise<string>;
  formData: ClinicRegistrationData;
  refreshUser: () => Promise<void>;
  restartOnboarding: () => void;
  setStep: (step: number) => void;
  user?: { email?: string | null; name?: string | null; role?: string | null };
}

export function useSubmitRegistrationAction({
  ensureOnboardingId,
  formData,
  refreshUser,
  restartOnboarding,
  setStep,
  user,
}: UseSubmitRegistrationActionParams) {
  return useCallback(
    async (complianceData: ComplianceSettings, onSuccess: () => void) => {
      const validation = validateRegistrationData(
        formData.clinicDetails,
        user?.name ?? undefined,
        user?.email ?? undefined,
        complianceData,
      );
      if (!validation.valid) {
        setStep(validation.targetStep);
        throw new Error(validation.errorMessage ?? ERROR_PENDING_ITEMS);
      }
      if (!validation.parsedDetails) {
        setStep(1);
        throw new Error(ERROR_PENDING_ITEMS);
      }

      try {
        const payload = buildRegistrationPayload(
          formData,
          validation.parsedDetails,
          {
            name: user?.name ?? "",
            email: user?.email ?? "",
            role: resolveOwnerRole(user?.role ?? undefined),
          },
          complianceData,
        );
        const oid = await ensureOnboardingId();
        const shouldRefreshUser = await completeOnboardingRegistration(
          oid,
          payload,
        );
        if (shouldRefreshUser) {
          void refreshUser().catch((error) => {
            logger.warn("Failed to refresh user after onboarding completion", {
              error,
            });
          });
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
    [ensureOnboardingId, formData, refreshUser, restartOnboarding, setStep, user],
  );
}
