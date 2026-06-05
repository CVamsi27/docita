"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { Button } from "@workspace/ui/components/form/button";
import { toast } from "sonner";
import {
  useCreatePrescription,
  usePatientPrescriptions,
} from "@workspace/data-access";
import { Pill } from "lucide-react";
import { ApiError } from "@/lib/errors";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  MedicationsSection,
  type Medication,
} from "./PrescriptionModalSections";

export type { Medication } from "./PrescriptionModalSections";

const getPrescriptionComplianceErrorMessage = (
  error: unknown,
): string | null => {
  if (!(error instanceof ApiError)) {
    return null;
  }

  if (error.code === "DOCTOR_SIGNATURE_REQUIRED") {
    return "Add your signature before creating a prescription";
  }

  if (error.code === "DOCTOR_VERIFICATION_REQUIRED") {
    return "Finish your doctor verification before creating a prescription";
  }

  return null;
};

export interface ModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  appointmentId?: string;
  patientId?: string;
  patientName?: string;
  doctorId?: string;
  onSaved?: () => void;
}

export function PrescriptionModal({
  open,
  onOpenChange,
  appointmentId,
  patientId,
  onSaved,
}: ModalProps) {
  const [medications, setMedications] = useState<Medication[]>([
    {
      name: "",
      dosage: "",
      frequency: "",
      duration: "",
      route: "ORAL",
      prnInstructions: "",
    },
  ]);

  const createPrescription = useCreatePrescription();

  const { data: lastRxData } = usePatientPrescriptions(
    patientId || "",
    { limit: 1 },
    { enabled: !!patientId },
  );

  const lastRx = lastRxData?.[0];

  const handleRepeatLastRx = () => {
    if (lastRx && lastRx.medications) {
      const medicationsFromLastRx = lastRx.medications.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        route: m.route || "ORAL",
        prnInstructions: "",
      }));
      setMedications(medicationsFromLastRx);
      toast.success("Loaded medications from last prescription");
    } else {
      showUserFacingErrorToast(
        "There is no previous prescription to copy for this patient",
      );
    }
  };

  const handleSave = async () => {
    try {
      if (!appointmentId || !patientId) return;

      const validMedications = medications.filter((m) => m.name.trim() !== "");

      if (validMedications.length === 0) {
        showUserFacingErrorToast(
          "Add at least one medicine before saving this prescription",
        );
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
        {
          name: "",
          dosage: "",
          frequency: "",
          duration: "",
          route: "ORAL",
          prnInstructions: "",
        },
      ]);
    } catch (err) {
      const complianceMessage = getPrescriptionComplianceErrorMessage(err);
      showUserFacingErrorToast(
        complianceMessage ||
          "We could not create this prescription. Please try again.",
      );
    }
  };

  const addMedication = () => {
    setMedications([
      ...medications,
      {
        name: "",
        dosage: "",
        frequency: "",
        duration: "",
        route: "ORAL",
        prnInstructions: "",
      },
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
      setMedications([
        {
          name: "",
          dosage: "",
          frequency: "",
          duration: "",
          route: "ORAL",
          prnInstructions: "",
        },
      ]);
    } else {
      setMedications(medications.filter((_, i) => i !== index));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            Create Prescription
          </DialogTitle>
          <DialogDescription>
            Add one or more medicines with dosage and duration.
          </DialogDescription>
        </DialogHeader>

        <MedicationsSection
          medications={medications}
          hasLastRx={!!lastRx}
          onRepeatLastRx={handleRepeatLastRx}
          onAdd={addMedication}
          onUpdate={updateMedication}
          onRemove={removeMedication}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={createPrescription.isPending}>
            {createPrescription.isPending ? "Saving…" : "Save Prescription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
