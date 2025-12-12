import { useState } from "react";
import { toast } from "sonner";
import { apiHooks } from "@/lib/api-hooks";
import { useQueryClient } from "@tanstack/react-query";

interface UseObservationsFormProps {
  appointmentId: string;
  initialObservations?: string;
  onObservationsSaved?: () => void;
}

export function useObservationsForm({
  appointmentId,
  initialObservations = "",
  onObservationsSaved,
}: UseObservationsFormProps) {
  const queryClient = useQueryClient();
  const updateObservations =
    apiHooks.useUpdateAppointmentObservations(appointmentId);
  const [observations, setObservations] = useState(initialObservations);

  const handleSubmit = async (e: React.FormEvent, onSuccess?: () => void) => {
    e.preventDefault();

    try {
      await updateObservations.mutateAsync({ observations });
      
      // Invalidate and refetch queries to refresh data immediately
      await queryClient.invalidateQueries({
        queryKey: ["appointments", appointmentId],
      });
      await queryClient.refetchQueries({
        queryKey: ["appointments", appointmentId],
        type: 'active',
      });
      
      if (onObservationsSaved) {
        await onObservationsSaved();
      }
      if (onSuccess) {
        await onSuccess();
      }
      toast.success("Observations saved successfully");
    } catch (error) {
      console.error("Failed to save observations:", error);
      toast.error("Failed to save observations");
    }
  };

  return {
    loading: updateObservations.isPending,
    observations,
    setObservations,
    handleSubmit,
  };
}
