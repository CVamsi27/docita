import { PatientAllergy, PatientSocialHistory, PatientWithMedicalHistory } from "@workspace/types";
import { PatientConditions } from "./history/PatientConditions";
import { PatientAllergies } from "./history/PatientAllergies";
import { PatientSurgeries } from "./history/PatientSurgeries";
import { PatientFamilyHistory } from "./history/PatientFamilyHistory";
import { PatientSocialHistoryComp } from "./history/PatientSocialHistory";

export interface PatientConditionsBlockProps {
  patient: PatientWithMedicalHistory;
  readOnly: boolean;
// jscpd:ignore-start
  isCompact: boolean;
  newCondition: string;
  onNewConditionChange: (value: string) => void;
  onAddCondition: () => void;
  onRemoveCondition: (id: string) => void;
}
// jscpd:ignore-end

export function PatientConditionsBlock({
  patient,
  readOnly,
  newCondition,
  onNewConditionChange,
  onAddCondition,
  onRemoveCondition,
}: PatientConditionsBlockProps) {
  return (
    <PatientConditions
      patient={patient}
      readOnly={readOnly}
      newCondition={newCondition}
      onNewConditionChange={onNewConditionChange}
      onAddCondition={onAddCondition}
      onRemoveCondition={onRemoveCondition}
    />
  );
}

export interface PatientAllergiesBlockProps {
  patient: PatientWithMedicalHistory;
  readOnly: boolean;
// jscpd:ignore-start
  isCompact: boolean;
  newAllergy: string;
  onNewAllergyChange: (value: string) => void;
  onAddAllergy: () => void;
  onRemoveAllergy: (id: string) => void;
  editingAllergy: PatientAllergy | null;
  onEditAllergy: (allergy: PatientAllergy) => void;
  onUpdateAllergy: () => void;
  onCancelEditAllergy: () => void;
  onEditingAllergyChange: (allergy: PatientAllergy) => void;
}

export function PatientAllergiesBlock({
// jscpd:ignore-end
  patient,
  readOnly,
  newAllergy,
  onNewAllergyChange,
  onAddAllergy,
  onRemoveAllergy,
  editingAllergy,
  onEditAllergy,
  onUpdateAllergy,
  onCancelEditAllergy,
  onEditingAllergyChange,
}: PatientAllergiesBlockProps) {
  return (
    <PatientAllergies
      patient={patient}
      readOnly={readOnly}
      newAllergy={newAllergy}
      onNewAllergyChange={onNewAllergyChange}
      onAddAllergy={onAddAllergy}
      onRemoveAllergy={onRemoveAllergy}
      editingAllergy={editingAllergy}
      onEditAllergy={onEditAllergy}
      onUpdateAllergy={onUpdateAllergy}
      onCancelEditAllergy={onCancelEditAllergy}
      onEditingAllergyChange={onEditingAllergyChange}
    />
  );
}

export interface PatientSurgeriesBlockProps {
  patient: PatientWithMedicalHistory;
  readOnly: boolean;
  isCompact: boolean;
  newSurgery: string;
  newSurgeryDate: string;
  onNewSurgeryChange: (value: string) => void;
  onNewSurgeryDateChange: (value: string) => void;
  onAddSurgery: () => void;
  onRemoveSurgery: (id: string) => void;
}

export function PatientSurgeriesBlock({
  patient,
  readOnly,
  newSurgery,
  newSurgeryDate,
  onNewSurgeryChange,
  onNewSurgeryDateChange,
  onAddSurgery,
  onRemoveSurgery,
}: PatientSurgeriesBlockProps) {
  return (
    <PatientSurgeries
      patient={patient}
      readOnly={readOnly}
      newSurgery={newSurgery}
      newSurgeryDate={newSurgeryDate}
      onNewSurgeryChange={onNewSurgeryChange}
      onNewSurgeryDateChange={onNewSurgeryDateChange}
      onAddSurgery={onAddSurgery}
      onRemoveSurgery={onRemoveSurgery}
    />
  );
}

export interface PatientFamilyHistoryBlockProps {
  patient: PatientWithMedicalHistory;
  readOnly: boolean;
  isCompact: boolean;
  newFamilyCondition: string;
  newFamilyRelation: string;
  onNewFamilyConditionChange: (value: string) => void;
  onNewFamilyRelationChange: (value: string) => void;
  onAddFamilyHistory: () => void;
  onRemoveFamilyHistory: (id: string) => void;
}

export function PatientFamilyHistoryBlock({
  patient,
  readOnly,
  isCompact,
  newFamilyCondition,
  newFamilyRelation,
  onNewFamilyConditionChange,
  onNewFamilyRelationChange,
  onAddFamilyHistory,
  onRemoveFamilyHistory,
}: PatientFamilyHistoryBlockProps) {
  return (
    <PatientFamilyHistory
      patient={patient}
      readOnly={readOnly}
      isCompact={isCompact}
      newFamilyCondition={newFamilyCondition}
      newFamilyRelation={newFamilyRelation}
      onNewFamilyConditionChange={onNewFamilyConditionChange}
      onNewFamilyRelationChange={onNewFamilyRelationChange}
      onAddFamilyHistory={onAddFamilyHistory}
      onRemoveFamilyHistory={onRemoveFamilyHistory}
    />
  );
}

export interface PatientSocialHistoryBlockProps {
  patient: PatientWithMedicalHistory;
  readOnly: boolean;
  isCompact: boolean;
  onSocialHistoryUpdate: (
    field: keyof PatientSocialHistory,
    value: string,
  ) => void;
}

export function PatientSocialHistoryBlock({
  patient,
  readOnly,
  isCompact,
  onSocialHistoryUpdate,
}: PatientSocialHistoryBlockProps) {
  return (
    <PatientSocialHistoryComp
      patient={patient}
      readOnly={readOnly}
      isCompact={isCompact}
      onSocialHistoryUpdate={onSocialHistoryUpdate}
    />
  );
}
