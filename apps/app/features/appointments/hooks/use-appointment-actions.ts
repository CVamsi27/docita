import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useCheckInAppointment,
  useStartConsultation,
} from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

interface UseAppointmentActionsParams {
  refetch: () => Promise<unknown>;
}

/**
 * Owns the three appointment mutation handlers (check-in, start-consultation,
 * appointment-added refresh) and their per-row pending state. Returns stable
 * callbacks plus the in-flight ids the table uses to render spinners.
 */
export function useAppointmentActions({
  refetch,
}: UseAppointmentActionsParams) {
  const router = useRouter();
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [startingConsultationId, setStartingConsultationId] = useState<
    string | null
  >(null);
  const checkInMutation = useCheckInAppointment();
  const startConsultationMutation = useStartConsultation();
  const handleStartConsultation = useCallback(
    async (appointmentId: string) => {
      setStartingConsultationId(appointmentId);
      try {
        const result = await startConsultationMutation.mutateAsync({
          appointmentId,
        });
        router.push(`/consultation/${result.appointmentId}`);
      } catch (error) {
        showUserFacingErrorToast(
          error,
          "We could not open this consultation right now. Please try again.",
          "save",
        );
      } finally {
        setStartingConsultationId(null);
      }
    },
    [router, startConsultationMutation],
  );
  const handleCheckIn = useCallback(
    async (appointmentId: string) => {
      setCheckingIn(appointmentId);
      try {
        await checkInMutation.mutateAsync(appointmentId);
        toast.success("Patient checked in to queue");
        await refetch();
      } catch (error) {
        showUserFacingErrorToast(
          error,
          "We could not check this patient in. Please try again.",
          "save",
        );
      } finally {
        setCheckingIn(null);
      }
    },
    [checkInMutation, refetch],
  );
  const handleAppointmentAdded = useCallback(
    async (_appointment: unknown) => {
      await refetch();
    },
    [refetch],
  );
  return {
    checkingIn,
    startingConsultationId,
    handleCheckIn,
    handleStartConsultation,
    handleAppointmentAdded,
  };
}