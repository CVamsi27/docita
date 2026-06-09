"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStartConsultation } from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

interface UseStartNextPatientInput {
  nextAppointmentId?: string | null;
}

/**
 * Owns the "start next patient" flow for the Today bottom bar — the in-flight
 * flag plus the start-consultation mutation, navigation, and error toast.
 * Extracted from `TodayPageContent` so the async try/catch lives independent
 * of the render wiring.
 */
export function useStartNextPatient({
  nextAppointmentId,
}: UseStartNextPatientInput) {
  const router = useRouter();
  const startConsultation = useStartConsultation();
  const [startingNext, setStartingNext] = useState(false);

  const handleStartNextPatient = async () => {
    if (!nextAppointmentId) return;
    try {
      setStartingNext(true);
      const result = await startConsultation.mutateAsync({
        appointmentId: nextAppointmentId,
      });
      router.push(`/consultation/${result.appointmentId}`);
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not open this consultation. Please try again.",
        "save",
      );
    } finally {
      setStartingNext(false);
    }
  };

  return {
    startingNext,
    isMutationPending: startConsultation.isPending,
    handleStartNextPatient,
  };
}
