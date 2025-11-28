import { useState, useEffect } from "react";
import { toast } from "sonner";
import { apiHooks } from "@/lib/api-hooks";

interface UseVitalsFormProps {
  appointmentId: string;
  onVitalsSaved?: () => void;
}

interface VitalsFormData {
  height: string;
  weight: string;
  bloodPressure: string;
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
  const saveVitals = apiHooks.useSaveVitals(appointmentId);
  const { data: appointment } = apiHooks.useAppointment(appointmentId);

  const [formData, setFormData] = useState<VitalsFormData>({
    height: "",
    weight: "",
    bloodPressure: "",
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
      setFormData({
        height: vitals.height?.toString() || "",
        weight: vitals.weight?.toString() || "",
        bloodPressure: vitals.bloodPressure || "",
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
      await saveVitals.mutateAsync({
        height: formData.height ? parseFloat(formData.height) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        bloodPressure: formData.bloodPressure || undefined,
        pulse: formData.pulse ? parseInt(formData.pulse) : undefined,
        respiratoryRate: formData.respiratoryRate
          ? parseInt(formData.respiratoryRate)
          : undefined,
        temperature: formData.temperature
          ? parseFloat(formData.temperature)
          : undefined,
        spo2: formData.spo2 ? parseFloat(formData.spo2) : undefined,
        painScore: formData.painScore
          ? parseInt(formData.painScore)
          : undefined,
        bloodGlucose: formData.bloodGlucose
          ? parseFloat(formData.bloodGlucose)
          : undefined,
        notes: formData.notes || undefined,
      });

      onVitalsSaved?.();
      onSuccess?.();
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
