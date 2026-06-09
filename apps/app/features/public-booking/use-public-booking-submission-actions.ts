"use client";

import { useCallback } from "react";
import type { PublicBookingMobileStep } from "@/features/public-booking/public-booking-constants";
import {
  clearSlotErrors,
  focusAndScrollToField,
  scrollToTop,
} from "@/features/public-booking/public-booking-page-state-helpers";

export function usePublicBookingSubmissionActions(
  handleSelectSlot: (start: string, end: string) => void,
  handleSelectSlotWithDoctor: (
    start: string,
    end: string,
    doctorId: string,
  ) => void,
  setSubmitFieldErrors: (
    errors: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>),
  ) => void,
  setMobileStep: (
    step: PublicBookingMobileStep | ((prev: PublicBookingMobileStep) => PublicBookingMobileStep),
  ) => void,
) {
  const goToStep = useCallback(
    (step: PublicBookingMobileStep, focusFieldId?: string) => {
      setMobileStep(step);
      if (focusFieldId) {
        focusAndScrollToField(focusFieldId);
        return;
      }
      scrollToTop();
    },
    [setMobileStep],
  );

  const handleSelectSlotCleared = useCallback(
    (start: string, end: string) => {
      handleSelectSlot(start, end);
      setSubmitFieldErrors(clearSlotErrors);
    },
    [handleSelectSlot, setSubmitFieldErrors],
  );

  const handleSelectSlotWithDoctorCleared = useCallback(
    (start: string, end: string, doctorId: string) => {
      handleSelectSlotWithDoctor(start, end, doctorId);
      setSubmitFieldErrors(clearSlotErrors);
    },
    [handleSelectSlotWithDoctor, setSubmitFieldErrors],
  );

  return {
    goToStep,
    handleSelectSlot: handleSelectSlotCleared,
    handleSelectSlotWithDoctor: handleSelectSlotWithDoctorCleared,
  };
}
