"use client";

import { useCallback, useState } from "react";
import { getUserFacingErrorMessage } from "@workspace/types";
import { useMutation } from "@tanstack/react-query";
import type { OnboardingData } from "@/features/onboarding/schemas/onboarding.schemas";
import { apiFetch } from "@/lib/api-client";

interface UseOnboardingReturn {
  step: number;
  totalSteps: number;
  data: Partial<OnboardingData>;
  isSubmitting: boolean;
  error: string | null;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateData: <K extends keyof OnboardingData>(
    key: K,
    value: OnboardingData[K],
  ) => void;
  submit: () => Promise<void>;
  reset: () => void;
}

const TOTAL_STEPS = 4;

const initialData: Partial<OnboardingData> = {
  clinicDetails: undefined,
  planSelection: {
    tier: "CAPTURE",
    billingCycle: "MONTHLY",
  },
  teamInvites: { members: [] },
  compliance: {
    acceptedSLA: false,
    acceptedPrivacy: false,
    acceptedTerms: false,
  },
};

export function useOnboarding(): UseOnboardingReturn {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Partial<OnboardingData>>(initialData);
  const [error, setError] = useState<string | null>(null);
  const submitMutation = useMutation({
    mutationFn: () =>
      apiFetch("/onboarding/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  });
  const isSubmitting = submitMutation.isPending;

  const nextStep = useCallback(() => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    }
  }, [step]);

  const prevStep = useCallback(() => {
    if (step > 1) {
      setStep(step - 1);
    }
  }, [step]);

  const updateData = useCallback(
    <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
      setData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const submit = useCallback(async () => {
    try {
      setError(null);
      await submitMutation.mutateAsync();
    } catch (err) {
      setError(
        getUserFacingErrorMessage(err, {
          fallback: "We could not complete setup. Please try again.",
          context: "form",
        }),
      );
      throw err;
    }
  }, [submitMutation]);

  const reset = useCallback(() => {
    setStep(1);
    setData(initialData);
    setError(null);
  }, []);

  return {
    step,
    totalSteps: TOTAL_STEPS,
    data,
    isSubmitting,
    error,
    setStep,
    nextStep,
    prevStep,
    updateData,
    submit,
    reset,
  };
}
