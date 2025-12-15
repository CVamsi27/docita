import { useState } from "react";
import { toast } from "sonner";
import { apiHooks } from "@/lib/api-hooks";
import { useQueryClient } from "@tanstack/react-query";

interface UseObservationsFormProps {
  appointmentId: string;
  initialObservations?: string;
  onObservationsSaved?: () => void;
  fieldName?: "observations" | "consultationNotes"; // Which field to save to
}

export function useObservationsForm({
  appointmentId,
  initialObservations = "",
  onObservationsSaved,
  fieldName = "consultationNotes", // Default to consultationNotes for new implementation
}: UseObservationsFormProps) {
  const queryClient = useQueryClient();
  const updateObservations =
    apiHooks.useUpdateAppointmentObservations(appointmentId);
  const [observations, setObservations] = useState(initialObservations);

  const handleSubmit = async (e: React.FormEvent, onSuccess?: () => void) => {
    e.preventDefault();

    try {
      // Save to the appropriate field (consultationNotes or observations)
      const payload =
        fieldName === "consultationNotes"
          ? { consultationNotes: observations }
          : { observations };

      await updateObservations.mutateAsync(payload);

      // Invalidate and refetch queries to refresh data immediately
      await queryClient.invalidateQueries({
        queryKey: ["appointments", appointmentId],
      });
      await queryClient.refetchQueries({
        queryKey: ["appointments", appointmentId],
        type: "active",
      });

      if (onObservationsSaved) {
        await onObservationsSaved();
      }
      if (onSuccess) {
        await onSuccess();
      }
      toast.success("Notes saved successfully");
    } catch (error) {
      console.error("Failed to save notes:", error);
      toast.error("Failed to save notes");
    }
  };

  return {
    loading: updateObservations.isPending,
    observations,
    setObservations,
    handleSubmit,
  };
}
