"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ClinicRegistrationData,
  defaultClinicRegistrationData,
} from "@/features/onboarding/components/types";
import {
  clearOnboardingSession,
  getPersistedFormData,
  getPersistedOnboardingId,
  getPersistedStep,
  persistFormData,
  persistOnboardingId,
  persistStep,
} from "./onboarding-session-storage";

export function useClinicRegistrationState() {
  const [step, setStepState] = useState<number>(() => getPersistedStep());
  const [onboardingId, setOnboardingIdState] = useState<string | null>(() =>
    getPersistedOnboardingId(),
  );
  const validatedOnboardingIdRef = useRef<string | null>(null);
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

  return {
    step,
    setStep,
    onboardingId,
    setOnboardingId,
    validatedOnboardingIdRef,
    formData,
    setFormData,
    restartOnboarding,
  };
}
