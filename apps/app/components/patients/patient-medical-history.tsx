"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";
import { History, Plus, X, AlertTriangle, Heart, Scissors } from "lucide-react";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import { apiHooks } from "@/lib/api-hooks";
import type { Patient } from "@workspace/types";

// Types matching the backend/extended schema
export interface PatientMedicalCondition {
  id: string;
  patientId: string;
  conditionName: string;
  conditionType: "CHRONIC" | "ACUTE" | "CONGENITAL" | "ACQUIRED";
  status: "ACTIVE" | "RESOLVED" | "CHRONIC" | "IN_REMISSION";
  icdCode?: string;
  diagnosedDate?: string;
}

export interface PatientAllergy {
  id: string;
  patientId: string;
  allergen: string;
  severity: "MILD" | "MODERATE" | "SEVERE" | "LIFE_THREATENING";
  reaction?: string;
}

export interface PatientSurgicalHistory {
  id: string;
  patientId: string;
  procedureName: string;
  procedureDate?: string;
}

export interface PatientFamilyHistory {
  id: string;
  patientId: string;
  condition: string;
  relationship: string;
}

export interface PatientSocialHistory {
  id: string;
  patientId: string;
  smokingStatus?: string;
  alcoholUse?: string;
  occupation?: string;
}

export interface PatientWithHistory extends Patient {
  medicalConditions?: PatientMedicalCondition[];
  patientAllergies?: PatientAllergy[];
  surgicalHistory?: PatientSurgicalHistory[];
  familyHistory?: PatientFamilyHistory[];
  socialHistory?: PatientSocialHistory[];
}

interface PatientMedicalHistoryProps {
  patient: PatientWithHistory;
  readOnly?: boolean;
  className?: string;
}

export function PatientMedicalHistory({
  patient,
  readOnly = false,
  className,
}: PatientMedicalHistoryProps) {
  const { mutate: updatePatient } = apiHooks.useUpdatePatient(patient.id || "");

  // Local state for inputs
  const [newCondition, setNewCondition] = useState("");
  const [newAllergy, setNewAllergy] = useState("");
  const [newSurgery, setNewSurgery] = useState("");
  const [newSurgeryDate, setNewSurgeryDate] = useState("");

  const handleUpdate = (updates: Partial<PatientWithHistory>) => {
    // Cast to any because the strictly typed UpdatePatientInput might not include these arrays
    // yet, but we rely on the backend accepting them (as seen in runtime data).
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
                      onClick={() => removeCondition(condition.id)}
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
                    <button
                      type="button"
                      onClick={() => removeAllergy(allergy.id)}
                      className="ml-1 hover:text-red-950 dark:hover:text-red-100 transition-colors focus:outline-none"
                    >
                      <X className="h-3 w-3" />
                    </button>
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
                      onClick={() => removeSurgery(surgery.id)}
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
    </div>
  );
}
