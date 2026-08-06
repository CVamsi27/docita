import { useState } from "react";
import { toast } from "sonner";
import { useSaveVitals } from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

/** Vitals form data type for UI input fields - string values for form inputs */
export interface VitalsFormData {
  height: string;
  weight: string;
  systolicBP: string;
  diastolicBP: string;
  pulse: string;
  temperature: string;
  spo2: string;
  respiratoryRate: string;
}

const EMPTY_VITALS: VitalsFormData = {
  height: "",
  weight: "",
  systolicBP: "",
  diastolicBP: "",
  pulse: "",
  temperature: "",
  spo2: "",
  respiratoryRate: "",
};

interface UseVitalsFormParams {
  appointmentId?: string;
  onSaved?: () => void;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Owns the vitals form's full lifecycle — field state, the save mutation
 * (with the "at least one vital" guard and success/error toasts), and the
 * post-save reset. Extracted from `VitalsModal` so the form's state machine
 * lives independent of the modal's dialog/grid render wiring.
 */
export function useVitalsForm({
  appointmentId,
  onSaved,
  onOpenChange,
}: UseVitalsFormParams) {
  const [vitals, setVitals] = useState<VitalsFormData>(EMPTY_VITALS);
  const recordVitals = useSaveVitals(appointmentId || "");

  const updateVital = (field: keyof VitalsFormData, value: string) => {
    setVitals((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      if (!appointmentId) return;

      const payload: Record<string, unknown> = { appointmentId };
      Object.entries(vitals).forEach(([key, value]) => {
        if (value.trim() !== "") {
          payload[key] = parseFloat(value);
        }
      });

      if (Object.keys(payload).length <= 1) {
        showUserFacingErrorToast("Enter at least one vital sign before saving");
        return;
      }

      await recordVitals.mutateAsync(payload);

      toast.success("Vitals recorded");
      onSaved?.();
      onOpenChange?.(false);
      setVitals(EMPTY_VITALS);
    } catch {
      showUserFacingErrorToast(
        "We could not save these vital signs. Please try again.",
      );
    }
  };

  return {
    vitals,
    updateVital,
    handleSave,
    isSaving: recordVitals.isPending,
  };
}
