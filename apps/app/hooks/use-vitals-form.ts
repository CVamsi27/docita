import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiHooks } from "@/lib/api-hooks";
import { useQueryClient } from "@tanstack/react-query";

interface UseVitalsFormProps {
  appointmentId: string;
  onVitalsSaved?: () => void;
}

interface VitalsFormData {
  height: string;
  weight: string;
  systolicBP: string;
  diastolicBP: string;
  pulse: string;
  respiratoryRate: string;
  temperature: string;
  spo2: string;
  painScore: string;
  bloodGlucose: string;
  notes: string;
}

export function useVitalsForm({
  appointmentId,
  onVitalsSaved,
}: UseVitalsFormProps) {
  const queryClient = useQueryClient();
  const saveVitals = apiHooks.useSaveVitals(appointmentId);
  const { data: appointment } = apiHooks.useAppointment(appointmentId);

  const [formData, setFormData] = useState<VitalsFormData>({
    height: "",
    weight: "",
    systolicBP: "",
    diastolicBP: "",
    pulse: "",
    respiratoryRate: "",
    temperature: "",
    spo2: "",
    painScore: "",
    bloodGlucose: "",
    notes: "",
  });

  // Populate form with existing vital signs if available
  useEffect(() => {
    if (appointment?.vitalSign) {
      const vitals = appointment.vitalSign;

      // Handle legacy BP vs structured BP
      let sys = vitals.systolicBP?.toString() || "";
      let dia = vitals.diastolicBP?.toString() || "";

      // Fallback to parsing legacy string if structured is empty
      if ((!sys || !dia) && vitals.bloodPressure) {
        const parts = vitals.bloodPressure.split("/");
        if (parts.length === 2) {
          if (!sys) sys = parts[0] || "";
          if (!dia) dia = parts[1] || "";
        }
      }

      setFormData({
        height: vitals.height?.toString() || "",
        weight: vitals.weight?.toString() || "",
        systolicBP: sys,
        diastolicBP: dia,
        pulse: vitals.pulse?.toString() || "",
        respiratoryRate: vitals.respiratoryRate?.toString() || "",
        temperature: vitals.temperature?.toString() || "",
        spo2: vitals.spo2?.toString() || "",
        painScore: vitals.painScore?.toString() || "",
        bloodGlucose: vitals.bloodGlucose?.toString() || "",
        notes: vitals.notes || "",
      });
    }
  }, [appointment]);

  const updateField = (field: keyof VitalsFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent, onSuccess?: () => void) => {
    e.preventDefault();

    try {
      const systolic = formData.systolicBP
        ? parseInt(formData.systolicBP)
        : undefined;
      const diastolic = formData.diastolicBP
        ? parseInt(formData.diastolicBP)
        : undefined;

      // Construct legacy string for backward compatibility
      let legacyBP: string | undefined = undefined;
      if (systolic && diastolic) {
        legacyBP = `${systolic}/${diastolic}`;
      }

      await saveVitals.mutateAsync({
        height: formData.height ? parseFloat(formData.height) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        systolicBP: systolic,
        diastolicBP: diastolic,
        bloodPressure: legacyBP, // Keep synchronized
        pulse: formData.pulse ? parseInt(formData.pulse) : undefined,
        respiratoryRate: formData.respiratoryRate
          ? parseInt(formData.respiratoryRate)
          : undefined,
        temperature: formData.temperature
          ? parseFloat(formData.temperature)
          : undefined,
        spo2: formData.spo2 ? parseInt(formData.spo2) : undefined, // Changed to Int based on schema
        painScore: formData.painScore
          ? parseInt(formData.painScore)
          : undefined,
        bloodGlucose: formData.bloodGlucose
          ? parseFloat(formData.bloodGlucose)
          : undefined,
        notes: formData.notes || undefined,
      });

      // Invalidate queries to refresh all appointment views
      await queryClient.invalidateQueries({
        queryKey: ["appointments"],
        refetchType: "active",
      });

      // Also invalidate patient queries
      await queryClient.invalidateQueries({
        queryKey: ["patients"],
        refetchType: "active",
      });

      if (onVitalsSaved) {
        await onVitalsSaved();
      }
      if (onSuccess) {
        await onSuccess();
      }
      toast.success("Vitals saved successfully");
    } catch (error) {
      console.error("Failed to save vitals:", error);
      toast.error("Failed to save vitals");
    }
  };

  return {
    loading: saveVitals.isPending,
    formData,
    updateField,
    handleSubmit,
  };
}
