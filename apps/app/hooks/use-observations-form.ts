import { useState } from "react";
import { toast } from "sonner";
import { apiHooks } from "@/lib/api-hooks";

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
  const updateObservations =
    apiHooks.useUpdateAppointmentObservations(appointmentId);
  const [observations, setObservations] = useState(initialObservations);

  const handleSubmit = async (e: React.FormEvent, onSuccess?: () => void) => {
    e.preventDefault();

    try {
      await updateObservations.mutateAsync({ observations });
      onObservationsSaved?.();
      onSuccess?.();
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
