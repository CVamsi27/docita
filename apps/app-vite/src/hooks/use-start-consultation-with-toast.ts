import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useStartConsultation } from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

/**
 * Shared hook that wraps `useStartConsultation()` with navigation and error
 * handling — extracted so both the Today bottom bar and DoctorDashboardCards
 * reuse the same mutation + navigate + toast flow.
 */
export function useStartConsultationWithToast() {
  const navigate = useNavigate();
  const startConsultation = useStartConsultation();

  const start = useCallback(
    async (appointmentId: string) => {
      try {
        const result = await startConsultation.mutateAsync({ appointmentId });
        navigate(`/consultation/${result.appointmentId}`);
      } catch (error) {
        showUserFacingErrorToast(
          error,
          "We could not open this consultation. Please try again.",
          "save",
        );
      }
    },
    [navigate, startConsultation],
  );

  return {
    start,
    isPending: startConsultation.isPending,
  };
}
