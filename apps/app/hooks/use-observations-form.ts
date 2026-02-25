import { useState } from "react";
import { toast } from "sonner";
import { useUpdateAppointmentObservations } from "@/hooks/api/use-appointments";
import { useQueryClient } from "@tanstack/react-query";

interface UseObservationsFormProps {
  appointmentId: string;
  initialObservations?: string;
  onObservationsSaved?: () => void;
  fieldName?: "observations" | "consultationNotes";
}

export function useObservationsForm({
  appointmentId,
  initialObservations = "",
  onObservationsSaved,
  fieldName = "consultationNotes",
}: UseObservationsFormProps) {
  const queryClient = useQueryClient();
  const updateObservations = useUpdateAppointmentObservations(appointmentId);
  const [observations, setObservations] = useState(initialObservations);

  const handleSubmit = async (e: React.FormEvent, onSuccess?: () => void) => {
    e.preventDefault();

    try {
      const payload =
        fieldName === "consultationNotes"
          ? { consultationNotes: observations }
          : { observations };

      await updateObservations.mutateAsync(payload);

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
