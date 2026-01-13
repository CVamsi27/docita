import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  Baby,
  Eye,
  History,
  Smile,
} from "lucide-react";
import {
  PatientAllergy,
  PatientSocialHistory,
  PatientWithMedicalHistory,
} from "@workspace/types";

// Specialty Components
import { DentalChartUI } from "@/features/consultation/components/specialty/DentalChartUI";
import { VisionExamUI } from "@/features/consultation/components/specialty/VisionExamUI";
import { GrowthChartUI } from "@/features/consultation/components/specialty/GrowthChartUI";

// History Components
import { PatientConditions } from "./history/PatientConditions";
import { PatientAllergies } from "./history/PatientAllergies";
import { PatientSurgeries } from "./history/PatientSurgeries";
import { PatientFamilyHistory } from "./history/PatientFamilyHistory";
import { PatientSocialHistoryComp } from "./history/PatientSocialHistory";

interface PatientMedicalHistoryUIProps {
  patient: PatientWithMedicalHistory;
  readOnly: boolean;
  className?: string;
  clinicType?: string;
  onCustomDataUpdate?: (key: string, value: unknown) => void;

  // Conditions
  newCondition: string;
  onNewConditionChange: (value: string) => void;
  onAddCondition: () => void;
  onRemoveCondition: (id: string) => void;

  // Allergies
  newAllergy: string;
  onNewAllergyChange: (value: string) => void;
  onAddAllergy: () => void;
  onRemoveAllergy: (id: string) => void;
  editingAllergy: PatientAllergy | null;
  onEditAllergy: (allergy: PatientAllergy) => void;
  onUpdateAllergy: () => void;
  onCancelEditAllergy: () => void;
  onEditingAllergyChange: (allergy: PatientAllergy) => void;

  // Surgery
  newSurgery: string;
  newSurgeryDate: string;
  onNewSurgeryChange: (value: string) => void;
  onNewSurgeryDateChange: (value: string) => void;
  onAddSurgery: () => void;
  onRemoveSurgery: (id: string) => void;

  // Family History
  newFamilyCondition: string;
  newFamilyRelation: string;
  onNewFamilyConditionChange: (value: string) => void;
  onNewFamilyRelationChange: (value: string) => void;
  onAddFamilyHistory: () => void;
  onRemoveFamilyHistory: (id: string) => void;

  // Social History
  onSocialHistoryUpdate: (
    field: keyof PatientSocialHistory,
    value: string,
  ) => void;
}

export function PatientMedicalHistoryUI({
  patient,
  readOnly,
  className,
  clinicType,
  onCustomDataUpdate,
  newCondition,
  onNewConditionChange,
  onAddCondition,
  onRemoveCondition,
  newAllergy,
  onNewAllergyChange,
  onAddAllergy,
  onRemoveAllergy,
  editingAllergy,
  onEditAllergy,
  onUpdateAllergy,
  onCancelEditAllergy,
  onEditingAllergyChange,
  newSurgery,
  newSurgeryDate,
  onNewSurgeryChange,
  onNewSurgeryDateChange,
  onAddSurgery,
  onRemoveSurgery,
  newFamilyCondition,
  newFamilyRelation,
  onNewFamilyConditionChange,
  onNewFamilyRelationChange,
  onAddFamilyHistory,
  onRemoveFamilyHistory,
  onSocialHistoryUpdate,
}: PatientMedicalHistoryUIProps) {
  const renderSpecialtySection = () => {
    const customData = patient.customData || {};

    let component = null;
    let title = "";
    let icon = null;

    if (clinicType === "DENTAL") {
      title = "Baseline Dental Chart";
      icon = <Smile className="h-5 w-5 text-teal-600" />;
      component = (
        <DentalChartUI
          value={customData.dentalChart || {}}
          onChange={(val) => onCustomDataUpdate?.("dentalChart", val)} // Only allows updating if prop provided
          readOnly={readOnly}
        />
      );
    } else if (clinicType === "OPHTHALMOLOGY") {
      title = "Baseline Vision Exam";
      icon = <Eye className="h-5 w-5 text-blue-600" />;
      component = (
        <VisionExamUI
          value={customData.ophthalmologyExam || {}}
          onChange={(val) => onCustomDataUpdate?.("ophthalmologyExam", val)}
          readOnly={readOnly}
        />
      );
    } else if (clinicType === "PEDIATRIC") {
      title = "Growth Data";
      icon = <Baby className="h-5 w-5 text-pink-500" />;
      component = (
        <GrowthChartUI
          value={customData.growthData || {}}
          onChange={(val) => onCustomDataUpdate?.("growthData", val)}
          readOnly={readOnly}
        />
      );
    } else {
      return null;
    }

    return (
      <Card className="mb-6 border-l-4 border-l-primary/50">
        <CardHeader className="py-4">
          <CardTitle className="text-lg flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <CardDescription>
            Clinic-specific baseline records for this patient.
          </CardDescription>
        </CardHeader>
        <CardContent>{component}</CardContent>
      </Card>
    );
  };

  return (
    <div className={className}>
      {renderSpecialtySection()}
      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-blue-500" />
              Patient Medical History
            </CardTitle>
            {readOnly && (
              <Badge variant="outline" className="text-xs">
                Read Only
              </Badge>
            )}
          </div>
          {!readOnly && (
            <CardDescription>
              Add or remove conditions directly. Changes are saved automatically.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Problem List */}
          <PatientConditions
            patient={patient}
            readOnly={readOnly}
            newCondition={newCondition}
            onNewConditionChange={onNewConditionChange}
            onAddCondition={onAddCondition}
            onRemoveCondition={onRemoveCondition}
          />

          <div className="h-px bg-border/50" />

          {/* Allergies */}
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

          <div className="h-px bg-border/50" />

          {/* Surgical History */}
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
        </CardContent>
      </Card>

      {/* Family History */}
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

      {/* Social History */}
      <PatientSocialHistoryComp
        patient={patient}
        readOnly={readOnly}
        onSocialHistoryUpdate={onSocialHistoryUpdate}
      />
    </div>
  );
}
