import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { toast } from "sonner";
import {
  useCreatePrescription,
  usePatientPrescriptions,
} from "@/hooks/api/use-clinical";
import { Pill, Plus, RotateCcw, X } from "lucide-react";

export interface ModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  appointmentId?: string;
  patientId?: string;
  patientName?: string;
  doctorId?: string;
  onSaved?: () => void;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
}

export function PrescriptionModal({
  open,
  onOpenChange,
  appointmentId,
  patientId,
  onSaved,
}: ModalProps) {
  const [medications, setMedications] = useState<Medication[]>([
    { name: "", dosage: "", frequency: "", duration: "", route: "ORAL" },
  ]);

  const createPrescription = useCreatePrescription();

  // For repeating last prescription
  const { data: lastRxData } = usePatientPrescriptions(
    patientId || "",
    { limit: 1 },
    { enabled: !!patientId },
  );

  const lastRx = lastRxData?.items?.[0];

  const handleRepeatLastRx = () => {
    if (lastRx && lastRx.medications) {
      const medicationsFromLastRx = lastRx.medications.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        route: m.route || "ORAL",
      }));
      setMedications(medicationsFromLastRx);
      toast.success("Loaded medications from last prescription");
    } else {
      toast.error("No previous prescription found");
    }
  };

  const handleSave = async () => {
    try {
      if (!appointmentId || !patientId) return;

      const validMedications = medications.filter((m) => m.name.trim() !== "");

      if (validMedications.length === 0) {
        toast.error("Please add at least one medication");
        return;
      }

      await createPrescription.mutateAsync({
        patientId,
        appointmentId,
        medications: validMedications,
        notes: "",
      });

      toast.success("Prescription created");

      onSaved?.();
      onOpenChange?.(false);
      setMedications([
        { name: "", dosage: "", frequency: "", duration: "", route: "ORAL" },
      ]);
    } catch (err) {
      toast.error("Failed to create prescription");
      console.error(err);
    }
  };

  const addMedication = () => {
    setMedications([
      ...medications,
      { name: "", dosage: "", frequency: "", duration: "", route: "ORAL" },
    ]);
  };

  const updateMedication = (
    index: number,
    field: keyof Medication,
    value: string,
  ) => {
    const newMeds = [...medications];
    newMeds[index] = { ...newMeds[index], [field]: value };
    setMedications(newMeds);
  };

  const removeMedication = (index: number) => {
    if (medications.length === 1) {
      // Don't remove the last one, just clear it
      setMedications([
        { name: "", dosage: "", frequency: "", duration: "", route: "ORAL" },
      ]);
    } else {
      setMedications(medications.filter((_, i) => i !== index));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-indigo-600" />
              Create Prescription
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="flex justify-end mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRepeatLastRx}
              disabled={!lastRx}
            >
              <RotateCcw className="mr-2 h-3.5 w-3.5" />
              Repeat Last Rx
            </Button>
          </div>

          {medications.map((med, index) => (
            <div key={index} className="space-y-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Medication #{index + 1}
                </span>
                {medications.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => removeMedication(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Input
                    placeholder="Medication Name (e.g. Amoxicillin 500mg)"
                    value={med.name}
                    onChange={(e) =>
                      updateMedication(index, "name", e.target.value)
                    }
                  />
                </div>
                <Input
                  placeholder="Dosage (e.g. 1 tab)"
                  value={med.dosage}
                  onChange={(e) =>
                    updateMedication(index, "dosage", e.target.value)
                  }
                />
                <Input
                  placeholder="Frequency (e.g. BID)"
                  value={med.frequency}
                  onChange={(e) =>
                    updateMedication(index, "frequency", e.target.value)
                  }
                />
                <Input
                  placeholder="Duration (e.g. 7 days)"
                  value={med.duration}
                  onChange={(e) =>
                    updateMedication(index, "duration", e.target.value)
                  }
                />
                <Input
                  placeholder="Route (e.g. ORAL)"
                  value={med.route}
                  onChange={(e) =>
                    updateMedication(index, "route", e.target.value)
                  }
                />
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={addMedication}
            className="w-full border-dashed"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Another Medication
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={createPrescription.isPending}>
            {createPrescription.isPending ? "Saving..." : "Save Prescription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
