import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  AlertTriangle,
  Coffee,
  Heart,
  History,
  Pencil,
  Plus,
  Scissors,
  Users,
  X,
  Stethoscope,
  Smile,
  Eye,
  Baby,
} from "lucide-react";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Badge } from "@workspace/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  ALCOHOL_USE_STATUS_LABELS,
  AlcoholUseStatus,
  PatientAllergy,
  PatientFamilyHistory,
  PatientMedicalCondition,
  PatientSocialHistory,
  PatientSurgicalHistory,
  PatientWithMedicalHistory,
  SMOKING_STATUS_LABELS,
  SmokingStatus,
} from "@workspace/types";

// Specialty Components
import { DentalChartUI } from "@/features/consultation/components/specialty/DentalChartUI";
import { VisionExamUI } from "@/features/consultation/components/specialty/VisionExamUI";
import { GrowthChartUI } from "@/features/consultation/components/specialty/GrowthChartUI";

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

      if (clinicType === 'DENTAL') {
          title = "Baseline Dental Chart";
          icon = <Smile className="h-5 w-5 text-teal-600" />;
          component = (
              <DentalChartUI 
                  value={customData.dentalChart || {}} 
                  onChange={(val) => onCustomDataUpdate?.('dentalChart', val)} // Only allows updating if prop provided
                  readOnly={readOnly}
              />
          );
      } else if (clinicType === 'OPHTHALMOLOGY') {
          title = "Baseline Vision Exam";
          icon = <Eye className="h-5 w-5 text-blue-600" />;
           component = (
              <VisionExamUI 
                  value={customData.ophthalmologyExam || {}} 
                  onChange={(val) => onCustomDataUpdate?.('ophthalmologyExam', val)}
                  readOnly={readOnly}
              />
          );
      } else if (clinicType === 'PEDIATRIC') {
          title = "Growth Data";
          icon = <Baby className="h-5 w-5 text-pink-500" />;
          component = (
              <GrowthChartUI 
                  value={customData.growthData || {}} 
                  onChange={(val) => onCustomDataUpdate?.('growthData', val)}
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
           <CardContent>
              {component}
           </CardContent>
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
              Add or remove conditions directly. Changes are saved
              automatically.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Problem List */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Heart className="h-4 w-4 text-primary" />
              Problem List
            </div>
            <div className="flex flex-wrap gap-2">
              {patient.medicalConditions?.map((condition) => (
                <Badge
                  key={condition.id}
                  variant="outline"
                  className="pl-2 pr-1 py-1 h-7 bg-background hover:bg-muted/50 transition-colors flex items-center gap-2 border-primary/20"
                >
                  <span className="font-medium">{condition.conditionName}</span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => onRemoveCondition(condition.id!)}
                      className="ml-1 hover:text-destructive transition-colors focus:outline-none"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
              {(!patient.medicalConditions ||
                patient.medicalConditions.length === 0) && (
                <span className="text-sm text-muted-foreground italic">
                  No active problems
                </span>
              )}
            </div>
            {!readOnly && (
              <div className="flex gap-2 max-w-sm mt-1">
                <Input
                  placeholder="Add problem..."
                  value={newCondition}
                  onChange={(e) => onNewConditionChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onAddCondition();
                    }
                  }}
                  className="h-8 text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={onAddCondition}
                  disabled={!newCondition.trim()}
                  className="h-8"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <div className="h-px bg-border/50" />

          {/* Allergies */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Allergies
            </div>
            <div className="flex flex-wrap gap-2">
              {patient.patientAllergies?.map((allergy) => (
                <Badge
                  key={allergy.id}
                  variant="destructive"
                  className="pl-2 pr-1 py-1 h-7 bg-red-100 text-red-800 hover:bg-red-200 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 flex items-center gap-2"
                >
                  <span className="font-medium">{allergy.allergen}</span>
                  {!readOnly && (
                    <div className="flex items-center ml-1 border-l border-red-300 dark:border-red-700 pl-1 gap-1">
                      <button
                        type="button"
                        onClick={() => onEditAllergy(allergy)}
                        className="hover:text-red-950 dark:hover:text-red-100 transition-colors focus:outline-none"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveAllergy(allergy.id!)}
                        className="hover:text-red-950 dark:hover:text-red-100 transition-colors focus:outline-none"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </Badge>
              ))}
              {(!patient.patientAllergies ||
                patient.patientAllergies.length === 0) && (
                <span className="text-sm text-muted-foreground italic">
                  NKA (No Known Allergies)
                </span>
              )}
            </div>
            {!readOnly && (
              <div className="flex gap-2 max-w-sm mt-1">
                <Input
                  placeholder="Add allergy..."
                  value={newAllergy}
                  onChange={(e) => onNewAllergyChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onAddAllergy();
                    }
                  }}
                  className="h-8 text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={onAddAllergy}
                  disabled={!newAllergy.trim()}
                  className="h-8"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <div className="h-px bg-border/50" />

          {/* Surgical History */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Scissors className="h-4 w-4 text-blue-500" />
              Surgical History
            </div>
            <div className="space-y-2">
              {patient.surgicalHistory?.map((surgery) => (
                <div
                  key={surgery.id}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/40 text-sm group"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{surgery.procedureName}</span>
                    {surgery.procedureDate && (
                      <span className="text-muted-foreground text-xs">
                        ({new Date(surgery.procedureDate).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => onRemoveSurgery(surgery.id!)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {(!patient.surgicalHistory ||
                patient.surgicalHistory.length === 0) && (
                <span className="text-sm text-muted-foreground italic">
                  No surgeries recorded
                </span>
              )}
            </div>
            {!readOnly && (
              <div className="flex gap-2 items-center mt-1">
                <Input
                  placeholder="Procedure name"
                  value={newSurgery}
                  onChange={(e) => onNewSurgeryChange(e.target.value)}
                  className="h-8 text-sm flex-1"
                />
                <Input
                  type="date"
                  value={newSurgeryDate}
                  onChange={(e) => onNewSurgeryDateChange(e.target.value)}
                  className="h-8 text-sm w-32"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={onAddSurgery}
                  disabled={!newSurgery.trim()}
                  className="h-8"
                >
                  Add
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Family History */}
      <Card className="mt-6">
        <CardHeader className="py-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-500" />
            Family History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {patient.familyHistory?.map((history) => (
                <Badge
                  key={history.id}
                  variant="outline"
                  className="pl-2 pr-1 py-1 h-auto bg-background hover:bg-muted/50 transition-colors flex items-center gap-2 border-primary/20"
                >
                  <div className="flex flex-col text-xs">
                    <span className="font-semibold">{history.condition}</span>
                    <span className="text-muted-foreground">
                      ({history.relationship})
                    </span>
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => onRemoveFamilyHistory(history.id!)}
                      className="ml-1 hover:text-destructive transition-colors focus:outline-none"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
              {(!patient.familyHistory ||
                patient.familyHistory.length === 0) && (
                <span className="text-sm text-muted-foreground italic">
                  No family history recorded
                </span>
              )}
            </div>
            {!readOnly && (
              <div className="flex gap-2 items-center mt-1">
                <Input
                  placeholder="Condition (e.g. Diabetes)"
                  value={newFamilyCondition}
                  onChange={(e) => onNewFamilyConditionChange(e.target.value)}
                  className="h-8 text-sm flex-1"
                />
                <Input
                  placeholder="Relationship (e.g. Mother)"
                  value={newFamilyRelation}
                  onChange={(e) => onNewFamilyRelationChange(e.target.value)}
                  className="h-8 text-sm w-32"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={onAddFamilyHistory}
                  disabled={
                    !newFamilyCondition.trim() || !newFamilyRelation.trim()
                  }
                  className="h-8"
                >
                  Add
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Social History */}
      <Card className="mt-6">
        <CardHeader className="py-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Coffee className="h-5 w-5 text-amber-600" />
            Social History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smokingStatus">Smoking Status</Label>
              <Select
                value={patient.socialHistory?.smokingStatus || "UNKNOWN"}
                onValueChange={(value) =>
                  onSocialHistoryUpdate("smokingStatus", value)
                }
                disabled={readOnly}
              >
                <SelectTrigger id="smokingStatus">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SMOKING_STATUS_LABELS) as SmokingStatus[]).map(
                    (status) => (
                      <SelectItem key={status} value={status}>
                        {SMOKING_STATUS_LABELS[status]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alcoholUse">Alcohol Use</Label>
              <Select
                value={patient.socialHistory?.alcoholUse || "UNKNOWN"}
                onValueChange={(value) =>
                  onSocialHistoryUpdate("alcoholUse", value)
                }
                disabled={readOnly}
              >
                <SelectTrigger id="alcoholUse">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.keys(ALCOHOL_USE_STATUS_LABELS) as AlcoholUseStatus[]
                  ).map((status) => (
                    <SelectItem key={status} value={status}>
                      {ALCOHOL_USE_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="occupation">Occupation</Label>
              <Input
                id="occupation"
                placeholder="Occupation"
                value={patient.socialHistory?.occupation || ""}
                onChange={(e) =>
                  onSocialHistoryUpdate("occupation", e.target.value)
                }
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dietaryRestrictions">Dietary Restrictions</Label>
              <Input
                id="dietaryRestrictions"
                placeholder="e.g. Vegetarian, Gluten-free"
                value={patient.socialHistory?.dietaryRestrictions || ""}
                onChange={(e) =>
                  onSocialHistoryUpdate("dietaryRestrictions", e.target.value)
                }
                disabled={readOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Allergy Dialog */}
      <Dialog
        open={!!editingAllergy}
        onOpenChange={(open) => !open && onCancelEditAllergy()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Allergy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Allergen</Label>
              <Input
                value={editingAllergy?.allergen || ""}
                onChange={(e) =>
                  onEditingAllergyChange({
                    ...editingAllergy!,
                    allergen: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select
                value={editingAllergy?.severity || "MODERATE"}
                onValueChange={(v: string) =>
                  onEditingAllergyChange({
                    ...editingAllergy!,
                    severity: v as
                      | "MILD"
                      | "MODERATE"
                      | "SEVERE"
                      | "LIFE_THREATENING",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MILD">Mild</SelectItem>
                  <SelectItem value="MODERATE">Moderate</SelectItem>
                  <SelectItem value="SEVERE">Severe</SelectItem>
                  <SelectItem value="LIFE_THREATENING">
                    Life-Threatening (Anaphylaxis Risk)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={editingAllergy?.allergyType || "DRUG"}
                onValueChange={(v: string) =>
                  onEditingAllergyChange({
                    ...editingAllergy!,
                    allergyType: v as
                      | "DRUG"
                      | "FOOD"
                      | "ENVIRONMENTAL"
                      | "LATEX"
                      | "INSECT"
                      | "CONTRAST"
                      | "OTHER",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRUG">Drug/Medication</SelectItem>
                  <SelectItem value="FOOD">Food</SelectItem>
                  <SelectItem value="ENVIRONMENTAL">
                    Environmental (Pollen, Dust)
                  </SelectItem>
                  <SelectItem value="LATEX">Latex</SelectItem>
                  <SelectItem value="INSECT">Insect Stings/Bites</SelectItem>
                  <SelectItem value="CONTRAST">Contrast Dye</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reaction</Label>
              <Input
                placeholder="e.g., Anaphylaxis, Rash, Hives, Swelling"
                value={editingAllergy?.reaction || ""}
                onChange={(e) =>
                  onEditingAllergyChange({
                    ...editingAllergy!,
                    reaction: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onCancelEditAllergy}>
              Cancel
            </Button>
            <Button onClick={onUpdateAllergy}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
