import { useStartConsultationWithToast } from "@/hooks/use-start-consultation-with-toast";

interface UseStartNextPatientInput {
  nextAppointmentId?: string | null;
}

/**
 * Owns the "start next patient" flow for the Today bottom bar.
 * Delegates to the shared `useStartConsultationWithToast` hook that
 * handles the mutation, navigation, and error toast. The redundant
 * `startingNext` local state was removed — `isMutationPending` is
 * the canonical in-flight indicator from the mutation.
 */
export function useStartNextPatient({
  nextAppointmentId,
}: UseStartNextPatientInput) {
  const { start, isPending } = useStartConsultationWithToast();

  const handleStartNextPatient = async () => {
    if (!nextAppointmentId) return;
    await start(nextAppointmentId);
  };

  return {
    isMutationPending: isPending,
    handleStartNextPatient,
  };
}
