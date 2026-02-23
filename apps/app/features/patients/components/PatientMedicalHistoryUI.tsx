import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Baby, Eye, History, Smile } from "lucide-react";
import {
  GrowthChartData,
  OphthalmologyExamData,
  PatientAllergy,
  PatientSocialHistory,
  PatientWithMedicalHistory,
} from "@workspace/types";

// Specialty Components
import {
  DentalChartUI,
  DentalChartValue,
} from "@/features/consultation/components/specialty/DentalChartUI";
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
  onCustomDataUpdate?: (
    key: string,
    value: string | number | boolean | Record<string, unknown>,
  ) => void;

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
  // Social History
  onSocialHistoryUpdate: (
    field: keyof PatientSocialHistory,
    value: string,
  ) => void;
  variant?: "default" | "consultation";
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
  variant = "default",
}: PatientMedicalHistoryUIProps) {
  const isCompact = variant === "consultation";

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
          value={
            (customData.dentalChart as unknown as DentalChartValue) ||
            ({} as DentalChartValue)
          }
          onChange={(val) => onCustomDataUpdate?.("dentalChart", val)} // Only allows updating if prop provided
          readOnly={readOnly}
        />
      );
    } else if (clinicType === "OPHTHALMOLOGY") {
      title = "Baseline Vision Exam";
      icon = <Eye className="h-5 w-5 text-blue-600" />;
      component = (
        <VisionExamUI
          value={
            (customData.ophthalmologyExam as unknown as OphthalmologyExamData) ||
            ({} as OphthalmologyExamData)
          }
          onChange={(val) => onCustomDataUpdate?.("ophthalmologyExam", val)}
          readOnly={readOnly}
        />
      );
    } else if (clinicType === "PEDIATRIC") {
      title = "Growth Data";
      icon = <Baby className="h-5 w-5 text-pink-500" />;
      component = (
        <GrowthChartUI
          value={
            (customData.growthData as unknown as GrowthChartData) || {
              patientGender: patient.gender === "MALE" ? "MALE" : "FEMALE",
              measurements: [],
            }
          }
          onChange={(val) => onCustomDataUpdate?.("growthData", val)}
          readOnly={readOnly}
        />
      );
    } else {
      return null;
    }

    if (isCompact) {
      return (
        <div className="mb-6 space-y-2">
          <div className="flex items-center gap-2 font-medium">
            {icon}
            {title}
          </div>
          {component}
        </div>
      );
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

  const ContentWrapper = isCompact
    ? ({ children }: { children: React.ReactNode }) => (
        <div className="space-y-6">{children}</div>
      )
    : ({ children }: { children: React.ReactNode }) => (
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
                Add or remove conditions directly. Changes are saved
                automatically.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">{children}</CardContent>
        </Card>
      );

  return (
    <div className={className}>
      {renderSpecialtySection()}

      <ContentWrapper>
        {/* Problem List */}
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

        {isCompact ? (
          <div className="h-px bg-border/50" />
        ) : (
          <div className="h-px bg-border/50" />
        )}

        {/* Allergies */}
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

        {isCompact ? (
          <div className="h-px bg-border/50" />
        ) : (
          <div className="h-px bg-border/50" />
        )}

        {/* Surgical History */}
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
      </ContentWrapper>

      {/* Family History */}
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

      {/* Social History */}
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
    </div>
  );
}
