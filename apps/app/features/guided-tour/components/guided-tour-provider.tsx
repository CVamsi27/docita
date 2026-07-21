"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useGuidedTourState, useUpdateGuidedTour } from "@workspace/data-access";
import { useAuth } from "@/lib/auth/auth-context";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { GUIDED_TOUR_FLAG } from "@/features/guided-tour/config/feature-flag";
import { TOUR_STEPS, type TourStep } from "@/features/guided-tour/config/tour-steps";
import { shouldAutoStartTour, shouldShowChecklist } from "@/features/guided-tour/lib/guided-tour-eligibility";

interface GuidedTourContextValue {
  isTourActive: boolean;
  currentStep: TourStep | null;
  currentStepIndex: number;
  totalSteps: number;
  next: () => void;
  back: () => void;
  skip: () => void;
  /** Called by the on-/today launcher (its mount asserts the new-clinic state). */
  autoStartIfEligible: () => void;
  isChecklistVisible: boolean;
  dismissChecklist: () => void;
}

const GuidedTourContext = createContext<GuidedTourContextValue | null>(null);

/**
 * Owns the welcome-tour state machine + getting-started-checklist visibility,
 * backed by server-authoritative state (`/users/guided-tour`). Mounted once in
 * the protected providers wrapper. Deliberately does NOT fetch dashboard stats
 * (that would poll on every protected page) — the `/today` launcher supplies
 * the new-clinic signal by virtue of where it is mounted.
 */
export function GuidedTourProvider({ children }: { children: ReactNode }) {
  const flagEnabled = useFeatureFlag(GUIDED_TOUR_FLAG);
  const { user, isAdmin } = useAuth();
  const gatingActive = flagEnabled === true && isAdmin;

  const { data: tourState } = useGuidedTourState({ enabled: gatingActive });
  const updateTour = useUpdateGuidedTour();

  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const autoStartedRef = useRef(false);

  const totalSteps = TOUR_STEPS.length;
  const onboardingCompleted = user?.onboardingStep === "COMPLETED";

  const persistStep = useCallback(
    (index: number) => updateTour.mutate({ lastStep: index }),
    [updateTour],
  );

  const finish = useCallback(
    (status: "COMPLETED" | "SKIPPED") => {
      setIsTourActive(false);
      updateTour.mutate({ status });
    },
    [updateTour],
  );

  const next = useCallback(() => {
    setCurrentStepIndex((idx) => {
      const nextIdx = idx + 1;
      if (nextIdx >= totalSteps) {
        finish("COMPLETED");
        return idx;
      }
      persistStep(nextIdx);
      return nextIdx;
    });
  }, [totalSteps, finish, persistStep]);

  const back = useCallback(() => {
    setCurrentStepIndex((idx) => {
      const prev = Math.max(0, idx - 1);
      if (prev !== idx) persistStep(prev);
      return prev;
    });
  }, [persistStep]);

  const skip = useCallback(() => finish("SKIPPED"), [finish]);

  const autoStartIfEligible = useCallback(() => {
    if (autoStartedRef.current) return;
    const eligible = shouldAutoStartTour({
      flagEnabled,
      isAdmin,
      onboardingCompleted,
      // Asserted by the launcher's mount location (/today new-clinic branch).
      isNewClinic: true,
      serverStatus: tourState?.status,
    });
    if (!eligible) return;
    autoStartedRef.current = true;
    setCurrentStepIndex(tourState?.lastStep ?? 0);
    setIsTourActive(true);
    updateTour.mutate({ status: "IN_PROGRESS" });
  }, [
    flagEnabled,
    isAdmin,
    onboardingCompleted,
    tourState?.status,
    tourState?.lastStep,
    updateTour,
  ]);

  const checklistDismissed = Boolean(tourState?.checklistDismissedAt);
  const isChecklistVisible = shouldShowChecklist({
    flagEnabled,
    isAdmin,
    checklistDismissed,
  });
  const dismissChecklist = useCallback(
    () => updateTour.mutate({ checklistDismissed: true }),
    [updateTour],
  );

  const value = useMemo<GuidedTourContextValue>(
    () => ({
      isTourActive,
      currentStep: isTourActive ? (TOUR_STEPS[currentStepIndex] ?? null) : null,
      currentStepIndex,
      totalSteps,
      next,
      back,
      skip,
      autoStartIfEligible,
      isChecklistVisible,
      dismissChecklist,
    }),
    [
      isTourActive,
      currentStepIndex,
      totalSteps,
      next,
      back,
      skip,
      autoStartIfEligible,
      isChecklistVisible,
      dismissChecklist,
    ],
  );

  return (
    <GuidedTourContext.Provider value={value}>
      {children}
    </GuidedTourContext.Provider>
  );
}

export function useGuidedTour(): GuidedTourContextValue {
  const ctx = useContext(GuidedTourContext);
  if (!ctx)
    throw new Error("useGuidedTour must be used within a GuidedTourProvider");
  return ctx;
}
