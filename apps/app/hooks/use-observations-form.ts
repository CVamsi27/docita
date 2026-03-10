import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAPIMutation } from "@/lib/api-core";

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
  const updateObservations = useAPIMutation<
    unknown,
    { consultationNotes?: string; observations?: string }
  >(`/appointments/${appointmentId}`, "PATCH", {
    invalidateKeys: [["appointments"], ["appointments", appointmentId]],
  });
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
    } catch {

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
