"use client";

import { useCallback, useState } from "react";
import type { OnboardingData } from "@/features/onboarding/schemas/onboarding.schemas";
import { API_URL } from "@/lib/api-config";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`${API_URL}/onboarding/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [data]);

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
