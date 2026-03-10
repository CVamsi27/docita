import { useState } from "react";
import { toast } from "sonner";
import { fetchAPI } from "@/lib/api-core";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface MedicationValidation {
  name?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
}

interface UsePrescriptionFormProps {
  patientId: string;
  appointmentId?: string;
  doctorName?: string;
  doctorEmail?: string;
  doctorSpecialization?: string;
  onSuccess?: () => void;
}

export function usePrescriptionForm({
  patientId,
  appointmentId,
  doctorName,
  doctorEmail,
  doctorSpecialization,
  onSuccess,
}: UsePrescriptionFormProps) {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [medications, setMedications] = useState<Medication[]>([
    {
      name: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
    },
  ]);

  const [validations, setValidations] = useState<MedicationValidation[]>([]);

  const addMedication = () => {
    setMedications([
      ...medications,
      {
        name: "",
        dosage: "",
        frequency: "",
        duration: "",
        instructions: "",
      },
    ]);
  };

  const removeMedication = (index: number) => {
    if (medications.length > 1) {
      setMedications(medications.filter((_, i) => i !== index));
    }
  };

  const updateMedication = (
    index: number,
    field: keyof Medication,
    value: string,
  ) => {
    const updated = [...medications];
    if (updated[index]) {
      updated[index] = { ...updated[index], [field]: value };
      setMedications(updated);
    }
  };

  const resetForm = () => {
    setMedications([
      {
        name: "",
        dosage: "",
        frequency: "",
        duration: "",
        instructions: "",
      },
    ]);
    setShowForm(false);
    setValidations([]);
  };

  const validateForm = () => {
    const newValidations: MedicationValidation[] = medications.map((med) => {
      const v: MedicationValidation = {};
      if (!med.name.trim()) v.name = "Required";
      if (!med.dosage.trim()) v.dosage = "Required";
      if (!med.frequency.trim()) v.frequency = "Required";
      if (!med.duration.trim()) v.duration = "Required";
      return v;
    });

    setValidations(newValidations);
    return newValidations.every((v) => Object.keys(v).length === 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fill in all required medication fields");
      return;
    }

    setLoading(true);
    try {
      await fetchAPI(`/prescriptions`, {
        method: "POST",
        body: JSON.stringify({
          patientId,
          appointmentId,
          medications: medications.map((med) => ({
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            duration: med.duration,
            instructions: med.instructions,
          })),
          doctorName,
          doctorEmail,
          doctorSpecialization,
        }),
      });

      toast.success("Prescription created successfully");
      resetForm();
      if (onSuccess) onSuccess();
    } catch {

      toast.error("Failed to create prescription");
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    medications,
    validations,
    showForm,
    setShowForm,
    addMedication,
    removeMedication,
    updateMedication,
    handleSubmit,
    resetForm,
  };
}
