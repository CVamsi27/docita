import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStartConsultation } from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

export function useConsultationNavigation() {
  const router = useRouter();
  const startConsultation = useStartConsultation();

  const goToConsultationWorkspace = useCallback(
    (appointmentId: string) => {
      router.push(`/consultation/${appointmentId}`);
    },
    [router],
  );

  const handleStartConsultation = useCallback(
    async (appointmentId: string) => {
      try {
        const result = await startConsultation.mutateAsync({ appointmentId });
        goToConsultationWorkspace(result.appointmentId);
      } catch (error) {
        showUserFacingErrorToast(
          error,
          "We could not open this consultation right now. Please try again.",
          "save",
        );
      }
    },
    [goToConsultationWorkspace, startConsultation],
  );

  return {
    router,
    goToConsultationWorkspace,
    handleStartConsultation,
    isStartingConsultation: startConsultation.isPending,
  };
}
