import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppointment } from "@/hooks/api/use-appointments";
import { useSaveVitals } from "@/hooks/api/use-clinical";
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
  const saveVitals = useSaveVitals(appointmentId);
  const { data: appointment } = useAppointment(appointmentId);

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

  useEffect(() => {
    if (appointment?.vitalSign) {
      const vitals = appointment.vitalSign;

      let sys = vitals.systolicBP?.toString() || "";
      let dia = vitals.diastolicBP?.toString() || "";

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

      let legacyBP: string | undefined = undefined;
      if (systolic && diastolic) {
        legacyBP = `${systolic}/${diastolic}`;
      }

      const vitalsPayload = {
        height: formData.height ? parseFloat(formData.height) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        systolicBP: systolic,
        diastolicBP: diastolic,
        bloodPressure: legacyBP,
        pulse: formData.pulse ? parseInt(formData.pulse) : undefined,
        respiratoryRate: formData.respiratoryRate
          ? parseInt(formData.respiratoryRate)
          : undefined,
        temperature: formData.temperature
          ? parseFloat(formData.temperature)
          : undefined,
        spo2: formData.spo2 ? parseInt(formData.spo2) : undefined,
        painScore: formData.painScore
          ? parseInt(formData.painScore)
          : undefined,
        bloodGlucose: formData.bloodGlucose
          ? parseFloat(formData.bloodGlucose)
          : undefined,
        notes: formData.notes || undefined,
      };

      await saveVitals.mutateAsync(vitalsPayload);

      await queryClient.invalidateQueries({
        queryKey: ["appointments"],
        refetchType: "active",
      });

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
