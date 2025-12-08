"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { Pill, Plus, X, Save, AlertTriangle } from "lucide-react";
import { usePrescriptionForm } from "@/hooks/use-prescription-form";
import { MedicineAutocomplete } from "@/components/medicines/medicine-autocomplete";
import { IcdCodeSearch } from "@/components/medical-coding/icd-code-search";
import { DiagnosisList } from "@/components/medical-coding/diagnosis-list";
import { PrescriptionTemplateManager } from "@/components/prescription/prescription-template-manager";
import type { Diagnosis, IcdCode, PrescriptionTemplate } from "@/types";
import { api } from "@/lib/api-client";
import { apiHooks } from "@/lib/api-hooks";

interface PrescriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  patientName?: string;
  initialDiagnoses?: Diagnosis[];
  onSaved?: () => void;
}

export function PrescriptionModal({
  open,
  onOpenChange,
  appointmentId,
  patientId,
  doctorId,
  patientName,
  initialDiagnoses = [],
  onSaved,
}: PrescriptionModalProps) {
  // Diagnosis State - initialized with any passed diagnoses
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>(initialDiagnoses);

  // Sync diagnoses when initialDiagnoses changes (e.g., when opening modal for different appointment)
  useEffect(() => {
    setDiagnoses(initialDiagnoses);
  }, [initialDiagnoses]);

  // Template loading
  const { refetch: loadTemplates } = apiHooks.useTemplates();

  // Prescription Form Hook
  const {
    loading,
    instructions: rxInstructions,
    setInstructions: setRxInstructions,
    medications,
    validations: medicationValidations,
    addMedication,
    removeMedication,
    updateMedication,
    handleSubmit,
  } = usePrescriptionForm({
    appointmentId,
    patientId,
    doctorId,
    onPrescriptionSaved: () => {
      onSaved?.();
      onOpenChange(false);
    },
  });

  const handleAddDiagnosis = (code: IcdCode) => {
    if (diagnoses.some((d) => d.icdCode?.code === code.code)) {
      toast.error("Diagnosis already added");
      return;
    }

    const newDiagnosis: Diagnosis = {
      id: Math.random().toString(36).substr(2, 9),
      icdCodeId: code.id || code.code,
      icdCode: code,
      isPrimary: diagnoses.length === 0,
      createdAt: new Date().toISOString(),
    };

    setDiagnoses([...diagnoses, newDiagnosis]);
    toast.success("Diagnosis added");
  };

  const handleRemoveDiagnosis = (index: number) => {
    const newDiagnoses = [...diagnoses];
    newDiagnoses.splice(index, 1);
    if (
      diagnoses[index]?.isPrimary &&
      newDiagnoses.length > 0 &&
      newDiagnoses[0]
    ) {
      newDiagnoses[0].isPrimary = true;
    }
    setDiagnoses(newDiagnoses);
  };

  const handleUpdateDiagnosisNote = (index: number, note: string) => {
    const newDiagnoses = [...diagnoses];
    if (newDiagnoses[index]) {
      newDiagnoses[index].notes = note;
    }
    setDiagnoses(newDiagnoses);
  };

  const handleTogglePrimaryDiagnosis = (index: number) => {
    const newDiagnoses = diagnoses.map((d, i) => ({
      ...d,
      isPrimary: i === index,
    }));
    setDiagnoses(newDiagnoses);
  };

  const handleApplyPrescriptionTemplate = (template: PrescriptionTemplate) => {
    template.medications.forEach(() => {
      addMedication();
    });
    setTimeout(() => {
      template.medications.forEach((med, index) => {
        updateMedication(index, "name", med.name);
        updateMedication(index, "dosage", med.dosage);
        updateMedication(index, "frequency", med.frequency);
        updateMedication(index, "duration", med.duration);
      });
      if (template.instructions) {
        setRxInstructions(template.instructions);
      }
    }, 100);
  };

  const handleSaveAsTemplate = async () => {
    if (medications.length === 0) {
      toast.error("Add at least one medication to save as template");
      return;
    }

    const templateName = prompt("Enter a name for this template:");
    if (!templateName) return;

    try {
      await api.post("/prescription-templates", {
        name: templateName,
        medications: medications,
        instructions: rxInstructions,
      });
      toast.success("Template saved successfully");
      loadTemplates();
    } catch (error) {
      console.error("Failed to save template:", error);
      toast.error("Failed to save template");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Pill className="h-5 w-5 text-green-600" />
            Prescription
            {patientName && (
              <span className="text-muted-foreground font-normal">
                - {patientName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(e);
          }}
          className="space-y-6 py-4"
        >
          {/* Diagnoses Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">
                Diagnoses (ICD-10)
              </Label>
              <div className="w-[280px]">
                <IcdCodeSearch onSelect={handleAddDiagnosis} />
              </div>
            </div>
            <DiagnosisList
              diagnoses={diagnoses}
              onRemove={handleRemoveDiagnosis}
              onUpdateNotes={handleUpdateDiagnosisNote}
              onTogglePrimary={handleTogglePrimaryDiagnosis}
            />
          </div>

          <div className="h-px bg-border" />

          {/* Medications Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Medications</Label>
              <div className="flex gap-2">
                <PrescriptionTemplateManager
                  onTemplateSelect={handleApplyPrescriptionTemplate}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMedication}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" /> Add Medication
                </Button>
              </div>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {medications.map((med, index) => {
                const validation = medicationValidations.find(
                  (v) => v.medicationIndex === index,
                );
                return (
                  <div key={index} className="space-y-2">
                    <div className="p-4 border rounded-lg bg-card space-y-4 relative group">
                      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMedication(index)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Medicine Name</Label>
                          <MedicineAutocomplete
                            value={med.name}
                            onChange={(val) =>
                              updateMedication(index, "name", val)
                            }
                            placeholder="Search medicine..."
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-2">
                            <Label>Dosage</Label>
                            <Input
                              placeholder="500mg"
                              value={med.dosage}
                              onChange={(e) =>
                                updateMedication(
                                  index,
                                  "dosage",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Freq</Label>
                            <Input
                              placeholder="2x daily"
                              value={med.frequency}
                              onChange={(e) =>
                                updateMedication(
                                  index,
                                  "frequency",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Duration</Label>
                            <Input
                              placeholder="7 days"
                              value={med.duration}
                              onChange={(e) =>
                                updateMedication(
                                  index,
                                  "duration",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    {validation && (
                      <div className="text-xs p-3 rounded border flex items-start gap-2 mt-2 border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20 text-yellow-600 dark:text-yellow-400">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <ul className="space-y-1">
                            {validation.warnings.map((warning, widx) => (
                              <li key={widx}>• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {medications.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                  No medications added. Click &quot;Add Medication&quot; to
                  start.
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="rx-instructions">Instructions</Label>
            <Textarea
              id="rx-instructions"
              placeholder="Special instructions (e.g., take after food)..."
              value={rxInstructions}
              onChange={(e) => setRxInstructions(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveAsTemplate}
              disabled={medications.length === 0}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save as Template
            </Button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save Prescription
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
