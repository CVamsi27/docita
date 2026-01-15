import { useState } from "react";
import { toast } from "sonner";
import { useUpdatePatient } from "@/hooks/api/use-patients";
import { useClinicSettings } from "@/hooks/api/use-settings";
import {
  PatientAllergy,
  PatientFamilyHistory,
  PatientMedicalCondition,
  PatientSocialHistory,
  PatientSurgicalHistory,
  PatientWithMedicalHistory,
} from "@workspace/types";
import { PatientMedicalHistoryUI } from "./PatientMedicalHistoryUI";

interface PatientMedicalHistoryContainerProps {
  patient: PatientWithMedicalHistory;
  readOnly?: boolean;
  className?: string;
}

export function PatientMedicalHistoryContainer({
  patient,
  readOnly = false,
  className,
}: PatientMedicalHistoryContainerProps) {
  const { mutate: updatePatient } = useUpdatePatient(patient.id || "");
  const [editingAllergy, setEditingAllergy] = useState<PatientAllergy | null>(
    null,
  );

  // Local state for inputs
  const [newCondition, setNewCondition] = useState("");
  const [newAllergy, setNewAllergy] = useState("");
  const [newSurgery, setNewSurgery] = useState("");
  const [newSurgeryDate, setNewSurgeryDate] = useState("");
  const [newFamilyCondition, setNewFamilyCondition] = useState("");
  const [newFamilyRelation, setNewFamilyRelation] = useState("");

  // Fetch clinic settings to get type
  const { data: clinic } = useClinicSettings();

  const handleUpdate = (updates: Partial<PatientWithMedicalHistory>) => {
    updatePatient(updates, {
      onSuccess: () => {
        toast.success("Medical history updated");
      },
      onError: () => {
        toast.error("Failed to update medical history");
      },
    });
  };

  const handleCustomDataUpdate = (key: string, value: unknown) => {
    const currentCustomData = patient.customData || {};
    handleUpdate({
      customData: {
        ...currentCustomData,
        [key]: value,
      },
    });
  };

  const addCondition = () => {
    if (!newCondition.trim()) return;
    const currentConditions = patient.medicalConditions || [];
    const newEntry: PatientMedicalCondition = {
      id: Math.random().toString(36).substr(2, 9),
      patientId: patient.id || "",
      conditionName: newCondition,
      conditionType: "CHRONIC",
      status: "ACTIVE",
      sourceType: "MANUAL",
    };
    handleUpdate({
      medicalConditions: [...currentConditions, newEntry],
    });
    setNewCondition("");
  };

  const removeCondition = (id: string) => {
    const currentConditions = patient.medicalConditions || [];
    handleUpdate({
      medicalConditions: currentConditions.filter((c) => c.id !== id),
    });
  };

  const addAllergy = () => {
    if (!newAllergy.trim()) return;
    const currentAllergies = patient.patientAllergies || [];
    const newEntry: PatientAllergy = {
      id: Math.random().toString(36).substr(2, 9),
      patientId: patient.id || "",
      allergen: newAllergy,
      severity: "MODERATE",
      allergyType: "DRUG",
      isVerified: false,
    };
    handleUpdate({
      patientAllergies: [...currentAllergies, newEntry],
    });
    setNewAllergy("");
  };

  const removeAllergy = (id: string) => {
    const currentAllergies = patient.patientAllergies || [];
    handleUpdate({
      patientAllergies: currentAllergies.filter((a) => a.id !== id),
    });
  };

  const handleUpdateAllergy = () => {
    if (!editingAllergy) return;
    const currentAllergies = patient.patientAllergies || [];
    const updated = currentAllergies.map((a) =>
      a.id === editingAllergy.id ? editingAllergy : a,
    );
    handleUpdate({ patientAllergies: updated });
    setEditingAllergy(null);
  };

  const addSurgery = () => {
    if (!newSurgery.trim()) return;
    const currentSurgeries = patient.surgicalHistory || [];
    const newEntry: PatientSurgicalHistory = {
      id: Math.random().toString(36).substr(2, 9),
      patientId: patient.id || "",
      procedureName: newSurgery,
      procedureDate: newSurgeryDate || undefined,
    };
    handleUpdate({
      surgicalHistory: [...currentSurgeries, newEntry],
    });
    setNewSurgery("");
    setNewSurgeryDate("");
  };

  const removeSurgery = (id: string) => {
    const currentSurgeries = patient.surgicalHistory || [];
    handleUpdate({
      surgicalHistory: currentSurgeries.filter((s) => s.id !== id),
    });
  };

  const addFamilyHistory = () => {
    if (!newFamilyCondition.trim() || !newFamilyRelation.trim()) return;
    const currentHistory = patient.familyHistory || [];
    const newEntry: PatientFamilyHistory = {
      id: Math.random().toString(36).substr(2, 9),
      patientId: patient.id || "",
      condition: newFamilyCondition,
      relationship: newFamilyRelation,
    };
    handleUpdate({
      familyHistory: [...currentHistory, newEntry],
    });
    setNewFamilyCondition("");
    setNewFamilyRelation("");
  };

  const removeFamilyHistory = (id: string) => {
    const currentHistory = patient.familyHistory || [];
    handleUpdate({
      familyHistory: currentHistory.filter((h) => h.id !== id),
    });
  };

  const handleSocialHistoryUpdate = (
    field: keyof PatientSocialHistory,
    value: string,
  ) => {
    const currentSocial = patient.socialHistory || {
      patientId: patient.id || "",
    };
    handleUpdate({
      socialHistory: {
        ...currentSocial,
        [field]: value,
      },
    });
  };

  return (
    <PatientMedicalHistoryUI
      patient={patient}
      readOnly={readOnly}
      className={className}
      clinicType={clinic?.type}
      onCustomDataUpdate={handleCustomDataUpdate}
      newCondition={newCondition}
      onNewConditionChange={setNewCondition}
      onAddCondition={addCondition}
      onRemoveCondition={removeCondition}
      newAllergy={newAllergy}
      onNewAllergyChange={setNewAllergy}
      onAddAllergy={addAllergy}
      onRemoveAllergy={removeAllergy}
      editingAllergy={editingAllergy}
      onEditAllergy={setEditingAllergy}
      onUpdateAllergy={handleUpdateAllergy}
      onCancelEditAllergy={() => setEditingAllergy(null)}
      onEditingAllergyChange={setEditingAllergy}
      newSurgery={newSurgery}
      newSurgeryDate={newSurgeryDate}
      onNewSurgeryChange={setNewSurgery}
      onNewSurgeryDateChange={setNewSurgeryDate}
      onAddSurgery={addSurgery}
      onRemoveSurgery={removeSurgery}
      newFamilyCondition={newFamilyCondition}
      newFamilyRelation={newFamilyRelation}
      onNewFamilyConditionChange={setNewFamilyCondition}
      onNewFamilyRelationChange={setNewFamilyRelation}
      onAddFamilyHistory={addFamilyHistory}
      onRemoveFamilyHistory={removeFamilyHistory}
      onSocialHistoryUpdate={handleSocialHistoryUpdate}
    />
  );
}
