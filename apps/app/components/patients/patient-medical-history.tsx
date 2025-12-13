"use client";

/**
 * PatientMedicalHistory Component
 *
 * @description Full-featured medical history editor/viewer with comprehensive CRUD operations.
 * This is the primary component for managing structured patient medical history data.
 *
 * @use-cases
 * - Patient Detail Page (full edit mode)
 * - Patient Profile Management
 * - Comprehensive medical history data entry
 * - Historical medical records review
 *
 * @features
 * - Structured data models (conditions, allergies, family history, social history, surgical history)
 * - Full CRUD operations (Create, Read, Update, Delete)
 * - Form validation and error handling
 * - Dialog-based editing interface
 * - Consistent shadcn/ui components
 * - Read-only mode support
 *
 * @props
 * - patient: PatientWithMedicalHistory - Full patient object with medical history
 * - readOnly: boolean - Set to true for view-only mode (default: false)
 * - className: string - Additional CSS classes
 *
 * @example
 * // Editable mode on patient detail page
 * <PatientMedicalHistory
 *   patient={patientData}
 *   readOnly={false}
 * />
 *
 * // Read-only mode for viewing
 * <PatientMedicalHistory
 *   patient={patientData}
 *   readOnly={true}
 * />
 *
 * @see MedicalHistorySummary for compact sidebar/summary view
 */

import { useState } from "react";
import { toast } from "sonner";
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
import { apiHooks } from "@/lib/api-hooks";
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

interface PatientMedicalHistoryProps {
  patient: PatientWithMedicalHistory;
  readOnly?: boolean;
  className?: string;
}

export function PatientMedicalHistory({
  patient,
  readOnly = false,
  className,
}: PatientMedicalHistoryProps) {
  const { mutate: updatePatient } = apiHooks.useUpdatePatient(patient.id || "");
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

  const addCondition = () => {
    if (!newCondition.trim()) return;
    const currentConditions = patient.medicalConditions || [];
    const newEntry: PatientMedicalCondition = {
      id: Math.random().toString(36).substr(2, 9),
      patientId: patient.id || "",
      conditionName: newCondition,
      conditionType: "CHRONIC", // Default
      status: "ACTIVE", // Default
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
      severity: "MODERATE", // Default
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

  // Social History Handlers
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
    <div className={className}>
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
          {/* Medical Conditions */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Heart className="h-4 w-4 text-primary" />
              Medical Conditions
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
                      onClick={() => removeCondition(condition.id!)}
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
                  No active conditions
                </span>
              )}
            </div>
            {!readOnly && (
              <div className="flex gap-2 max-w-sm mt-1">
                <Input
                  placeholder="Add condition..."
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCondition();
                    }
                  }}
                  className="h-8 text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={addCondition}
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
                        onClick={() => setEditingAllergy(allergy)}
                        className="hover:text-red-950 dark:hover:text-red-100 transition-colors focus:outline-none"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAllergy(allergy.id!)}
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
                  onChange={(e) => setNewAllergy(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addAllergy();
                    }
                  }}
                  className="h-8 text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={addAllergy}
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
                      onClick={() => removeSurgery(surgery.id!)}
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
                  onChange={(e) => setNewSurgery(e.target.value)}
                  className="h-8 text-sm flex-1"
                />
                <Input
                  type="date"
                  value={newSurgeryDate}
                  onChange={(e) => setNewSurgeryDate(e.target.value)}
                  className="h-8 text-sm w-32"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={addSurgery}
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
                      onClick={() => removeFamilyHistory(history.id!)}
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
                  onChange={(e) => setNewFamilyCondition(e.target.value)}
                  className="h-8 text-sm flex-1"
                />
                <Input
                  placeholder="Relationship (e.g. Mother)"
                  value={newFamilyRelation}
                  onChange={(e) => setNewFamilyRelation(e.target.value)}
                  className="h-8 text-sm w-32"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={addFamilyHistory}
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
                  handleSocialHistoryUpdate("smokingStatus", value)
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
                  handleSocialHistoryUpdate("alcoholUse", value)
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
                  handleSocialHistoryUpdate("occupation", e.target.value)
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
                  handleSocialHistoryUpdate(
                    "dietaryRestrictions",
                    e.target.value,
                  )
                }
                disabled={readOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!editingAllergy}
        onOpenChange={(open) => !open && setEditingAllergy(null)}
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
                  setEditingAllergy((prev) =>
                    prev ? { ...prev, allergen: e.target.value } : null,
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select
                value={editingAllergy?.severity || "MODERATE"}
                onValueChange={(v: string) =>
                  setEditingAllergy((prev) =>
                    prev
                      ? {
                          ...prev,
                          severity: v as "MILD" | "MODERATE" | "SEVERE",
                        }
                      : null,
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MILD">Mild</SelectItem>
                  <SelectItem value="MODERATE">Moderate</SelectItem>
                  <SelectItem value="SEVERE">Severe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={editingAllergy?.allergyType || "DRUG"}
                onValueChange={(v: string) =>
                  setEditingAllergy((prev) =>
                    prev
                      ? {
                          ...prev,
                          allergyType: v as
                            | "DRUG"
                            | "FOOD"
                            | "ENVIRONMENTAL"
                            | "OTHER",
                        }
                      : null,
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRUG">Drug</SelectItem>
                  <SelectItem value="FOOD">Food</SelectItem>
                  <SelectItem value="ENVIRONMENTAL">Environmental</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAllergy(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAllergy}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
