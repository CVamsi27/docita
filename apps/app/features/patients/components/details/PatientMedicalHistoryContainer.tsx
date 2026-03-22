import { useState } from "react";
import { usePatientHistory } from "@/hooks/api/use-patient-history";
import { useClinicSettings } from "@/hooks/api/use-settings";
import {
  PatientAllergy,
  PatientSocialHistory,
  PatientWithMedicalHistory,
} from "@workspace/types";
import { PatientMedicalHistoryUI } from "./PatientMedicalHistoryUI";
import { PatientMetricsHistoryUI } from "./PatientMetricsHistoryUI";

interface PatientMedicalHistoryContainerProps {
  patient: PatientWithMedicalHistory;
  readOnly?: boolean;
  className?: string;
  variant?: "default" | "consultation";
}

export function PatientMedicalHistoryContainer({
  patient: initialPatient,
  readOnly = false,
  className,
  variant,
}: PatientMedicalHistoryContainerProps) {
  const { operations, patient: freshPatient } = usePatientHistory(
    initialPatient.id || "",
  );

  const [editingAllergy, setEditingAllergy] = useState<PatientAllergy | null>(
    null,
  );

  const [newCondition, setNewCondition] = useState("");
  const [newAllergy, setNewAllergy] = useState("");
  const [newSurgery, setNewSurgery] = useState("");
  const [newSurgeryDate, setNewSurgeryDate] = useState("");
  const [newFamilyCondition, setNewFamilyCondition] = useState("");
  const [newFamilyRelation, setNewFamilyRelation] = useState("");

  const { data: clinic } = useClinicSettings();

  if (variant !== "consultation") {
    return (
      <PatientMetricsHistoryUI
        patientId={initialPatient.id || ""}
        readOnly={readOnly}
        className={className}
      />
    );
  }

  const patient = freshPatient || initialPatient;

  const addCondition = () => {
    if (!newCondition.trim()) return;
    operations.addCondition(newCondition);
    setNewCondition("");
  };

  const addAllergy = () => {
    if (!newAllergy.trim()) return;
    operations.addAllergy(newAllergy);
    setNewAllergy("");
  };

  const handleUpdateAllergy = () => {
    if (!editingAllergy) return;
    operations.updateAllergy(editingAllergy);
    setEditingAllergy(null);
  };

  const addSurgery = () => {
    if (!newSurgery.trim()) return;
    operations.addSurgery(newSurgery, newSurgeryDate || undefined);
    setNewSurgery("");
    setNewSurgeryDate("");
  };

  const addFamilyHistory = () => {
    if (!newFamilyCondition.trim() || !newFamilyRelation.trim()) return;
    operations.addFamilyHistory(newFamilyCondition, newFamilyRelation);
    setNewFamilyCondition("");
    setNewFamilyRelation("");
  };

  const handleSocialHistoryUpdate = (
    field: keyof PatientSocialHistory,
    value: string,
  ) => {
    operations.updateSocialHistory(field, value);
  };

  return (
    <PatientMedicalHistoryUI
      patient={patient}
      readOnly={readOnly}
      className={className}
      clinicType={clinic?.type}
      onCustomDataUpdate={operations.updateCustomData}
      newCondition={newCondition}
      onNewConditionChange={setNewCondition}
      onAddCondition={addCondition}
      onRemoveCondition={operations.removeCondition}
      newAllergy={newAllergy}
      onNewAllergyChange={setNewAllergy}
      onAddAllergy={addAllergy}
      onRemoveAllergy={operations.removeAllergy}
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
      onRemoveSurgery={operations.removeSurgery}
      newFamilyCondition={newFamilyCondition}
      onNewFamilyConditionChange={setNewFamilyCondition}
      newFamilyRelation={newFamilyRelation}
      onNewFamilyRelationChange={setNewFamilyRelation}
      onAddFamilyHistory={addFamilyHistory}
      onRemoveFamilyHistory={operations.removeFamilyHistory}
      onSocialHistoryUpdate={handleSocialHistoryUpdate}
      variant={variant}
    />
  );
}
