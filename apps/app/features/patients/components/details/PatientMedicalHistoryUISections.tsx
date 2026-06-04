"use client";

import {
  PatientAllergy,
  PatientSocialHistory,
  PatientWithMedicalHistory,
} from "@workspace/types";
import { PatientConditions } from "./history/PatientConditions";
import { PatientAllergies } from "./history/PatientAllergies";
import { PatientSurgeries } from "./history/PatientSurgeries";
import { PatientFamilyHistory } from "./history/PatientFamilyHistory";
import { PatientSocialHistoryComp } from "./history/PatientSocialHistory";

export interface PatientConditionsBlockProps {
  patient: PatientWithMedicalHistory;
  readOnly: boolean;
  isCompact: boolean;
  newCondition: string;
  onNewConditionChange: (value: string) => void;
  onAddCondition: () => void;
  onRemoveCondition: (id: string) => void;
}

export function PatientConditionsBlock({
  patient,
  readOnly,
  isCompact,
  newCondition,
  onNewConditionChange,
  onAddCondition,
  onRemoveCondition,
}: PatientConditionsBlockProps) {
  return (
    <div className="space-y-4">
      {!isCompact ? null : (
        <div className="font-semibold text-sm text-foreground/70 uppercase tracking-wider">
          Conditions
        </div>
      )}
      <PatientConditions
        patient={patient}
        readOnly={readOnly}
        newCondition={newCondition}
        onNewConditionChange={onNewConditionChange}
        onAddCondition={onAddCondition}
        onRemoveCondition={onRemoveCondition}
      />
    </div>
  );
}

export interface PatientAllergiesBlockProps {
  patient: PatientWithMedicalHistory;
  readOnly: boolean;
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
  patient,
  readOnly,
  isCompact,
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
    <div className="space-y-4">
      {!isCompact ? null : (
        <div className="font-semibold text-sm text-foreground/70 uppercase tracking-wider">
          Allergies
        </div>
      )}
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
    </div>
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
  isCompact,
  newSurgery,
  newSurgeryDate,
  onNewSurgeryChange,
  onNewSurgeryDateChange,
  onAddSurgery,
  onRemoveSurgery,
}: PatientSurgeriesBlockProps) {
  return (
    <div className="space-y-4">
      {!isCompact ? null : (
        <div className="font-semibold text-sm text-foreground/70 uppercase tracking-wider">
          Surgeries
        </div>
      )}
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
    </div>
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
    <div className="mt-8">
      {!isCompact ? null : (
        <div className="font-semibold text-sm text-foreground/70 uppercase tracking-wider mb-4">
          Family History
        </div>
      )}
      <PatientFamilyHistory
        patient={patient}
        readOnly={readOnly}
        newFamilyCondition={newFamilyCondition}
        newFamilyRelation={newFamilyRelation}
        onNewFamilyConditionChange={onNewFamilyConditionChange}
        onNewFamilyRelationChange={onNewFamilyRelationChange}
        onAddFamilyHistory={onAddFamilyHistory}
        onRemoveFamilyHistory={onRemoveFamilyHistory}
      />
    </div>
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
    <div className="mt-8">
      {!isCompact ? null : (
        <div className="font-semibold text-sm text-foreground/70 uppercase tracking-wider mb-4">
          Social History
        </div>
      )}
      <PatientSocialHistoryComp
        patient={patient}
        readOnly={readOnly}
        onSocialHistoryUpdate={onSocialHistoryUpdate}
      />
    </div>
  );
}
