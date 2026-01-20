/**
 * Patient Medical History Container
 * Refactored to use shared usePatientHistory hook following Single Responsibility Principle
 * The hook handles all CRUD operations, this container manages UI state
 */

import { useState } from "react";
import { usePatientHistory } from "@/hooks/api/use-patient-history";
import { useClinicSettings } from "@/hooks/api/use-settings";
import {
  PatientAllergy,
  PatientSocialHistory,
  PatientWithMedicalHistory,
} from "@workspace/types";
import { PatientMedicalHistoryUI } from "./PatientMedicalHistoryUI";

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
  // Use shared history hook for all CRUD operations and FRESH data
  const { operations, patient: freshPatient } = usePatientHistory(
    initialPatient.id || "",
  );

  // Use fresh patient data if available, otherwise fall back to initial
  const patient = freshPatient || initialPatient;

  // Local state for editing allergy
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

  // Wrapper handlers that use shared operations and reset local state
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
