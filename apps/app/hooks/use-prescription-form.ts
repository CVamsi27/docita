import { useState } from "react";
import { toast } from "sonner";
import {
  Medication,
  type DosageValidation,
  type Specialization,
  type HospitalRole,
} from "@workspace/types";
import { apiHooks } from "@/lib/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import {
  validateDosage,
  checkMedicationContraindications,
} from "@workspace/types";

interface UsePrescriptionFormProps {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  patientAllergies?: string[];
  patientConditions?: string[];
  currentMedications?: string[];
  isPregnant?: boolean;
  onPrescriptionSaved?: () => void;
  doctorName?: string;
  doctorEmail?: string;
  doctorPhone?: string;
  doctorSpecialization?: Specialization;
  doctorRole?: HospitalRole;
  doctorRegistrationNumber?: string;
  doctorLicenseNumber?: string;
}

interface MedicationValidation {
  medicationIndex: number;
  dosageValidation?: DosageValidation;
  contraindications?: any[];
  warnings: string[];
}

export function usePrescriptionForm({
  appointmentId,
  patientId,
  doctorId,
  patientAllergies = [],
  patientConditions = [],
  currentMedications = [],
  isPregnant = false,
  onPrescriptionSaved,
  doctorName,
  doctorEmail,
  doctorPhone,
  doctorSpecialization,
  doctorRole,
  doctorRegistrationNumber,
  doctorLicenseNumber,
}: UsePrescriptionFormProps) {
  const queryClient = useQueryClient();
  const createPrescription = apiHooks.useCreatePrescription();
  const [instructions, setInstructions] = useState("");
  const [medications, setMedications] = useState<Medication[]>([
    { name: "", dosage: "", frequency: "", duration: "", route: "PO" },
  ]);
  const [validations, setValidations] = useState<MedicationValidation[]>([]);

  const addMedication = () => {
    setMedications([
      ...medications,
      { name: "", dosage: "", frequency: "", duration: "", route: "PO" },
    ]);
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
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

      // Validate if medication name or dosage changed
      if (field === "name" || field === "dosage") {
        validateMedicationAtIndex(index, updated[index]);
      }
    }
  };

  const validateMedicationAtIndex = (index: number, med: Medication) => {
    const warnings: string[] = [];

    // Validate dosage
    let dosageValidation: DosageValidation | undefined;
    if (med.name && med.dosage) {
      dosageValidation = validateDosage(med.name, med.dosage);
      if (!dosageValidation.isValid) {
        warnings.push(`${med.name}: ${dosageValidation.message}`);
      }
    }

    // Check contraindications
    let contraindications: any[] = [];
    if (med.name) {
      contraindications = checkMedicationContraindications(med.name, {
        allergies: patientAllergies.map((name) => ({
          name,
          severity: "moderate",
        })),
        conditions: patientConditions.map((name) => ({ icdCode: "", name })),
        currentMedications: [
          ...currentMedications,
          ...medications
            .filter((_, i) => i !== index && _.name)
            .map((m) => m.name),
        ],
        isPregnant,
      });

      const criticalIssues = contraindications.filter(
        (c: any) => c.severity === "critical",
      );
      if (criticalIssues.length > 0) {
        warnings.push(`${med.name}: ${criticalIssues[0].message}`);
      }
    }

    // Update validations
    setValidations((prev) => {
      const filtered = prev.filter((v) => v.medicationIndex !== index);
      if (
        warnings.length > 0 ||
        dosageValidation ||
        contraindications.length > 0
      ) {
        filtered.push({
          medicationIndex: index,
          dosageValidation,
          contraindications,
          warnings,
        });
      }
      return filtered;
    });
  };

  const handleSubmit = async (e: React.FormEvent, onSuccess?: () => void) => {
    e.preventDefault();

    try {
      // Filter out empty medications
      const validMedications = medications.filter(
        (med) => med.name.trim() !== "",
      );

      // Check for critical validation errors
      const criticalErrors = validations.filter((v) => {
        const hasDosageError =
          v.dosageValidation && !v.dosageValidation.isValid;
        const hasCriticalContraindication = v.contraindications?.some(
          (c: any) => c.severity === "critical",
        );
        return hasDosageError || hasCriticalContraindication;
      });

      if (criticalErrors.length > 0) {
        const firstError = criticalErrors[0]!;
        const errorMsg =
          firstError.warnings.length > 0
            ? firstError.warnings[0]
            : "Validation errors found";
        toast.error(`Cannot save prescription: ${errorMsg}`);
        return;
      }

      // Show warning if there are minor issues
      const warnings = validations.flatMap((v) => v.warnings);
      if (warnings.length > 0) {
        toast.warning(`Prescription has warnings: ${warnings.join(", ")}`);
      }

      await createPrescription.mutateAsync({
        appointmentId,
        patientId,
        doctorId,
        medications: validMedications,
        instructions: instructions || undefined,
        doctorName,
        doctorEmail,
        doctorPhone,
        doctorSpecialization,
        doctorRole,
        doctorRegistrationNumber,
        doctorLicenseNumber,
      });

      // Invalidate and refetch queries to refresh data immediately
      await queryClient.invalidateQueries({
        queryKey: ["appointments", appointmentId],
      });
      await queryClient.refetchQueries({
        queryKey: ["appointments", appointmentId],
        type: "active",
      });

      setMedications([
        { name: "", dosage: "", frequency: "", duration: "", route: "PO" },
      ]);
      setInstructions("");
      setValidations([]);
      if (onPrescriptionSaved) {
        await onPrescriptionSaved();
      }
      if (onSuccess) {
        await onSuccess();
      }
      toast.success("Prescription saved successfully");
    } catch (error) {
      console.error("Failed to save prescription:", error);
      toast.error("Failed to save prescription");
    }
  };

  return {
    loading: createPrescription.isPending,
    instructions,
    setInstructions,
    medications,
    validations,
    addMedication,
    removeMedication,
    updateMedication,
    handleSubmit,
  };
}
