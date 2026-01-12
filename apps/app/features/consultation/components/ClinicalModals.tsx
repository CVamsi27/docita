"use client";

import React, { FC, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { toast } from "sonner";
import { apiHooks } from "@/lib/api-hooks";
import { RotateCcw, X } from "lucide-react";
import type { Appointment, Patient, Prescription } from "@workspace/types";

// Types
interface ModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  appointmentId?: string;
  patientId?: string;
  patientName?: string;
  doctorId?: string;
  onSaved?: () => void;
}

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
}

// ============================================
// PRESCRIPTION MODAL
// ============================================

export const PrescriptionModal: FC<ModalProps> = ({
  open,
  onOpenChange,
  appointmentId,
  patientId,
  onSaved,
}) => {
  const [medications, setMedications] = useState<Medication[]>([
    { name: "", dosage: "", frequency: "", duration: "", route: "oral" },
  ]);
  const [instructions, setInstructions] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Fetch patient history for Repeat Rx feature
  const { data: patientHistory = [] } = apiHooks.usePatientAppointments(
    patientId || "",
  );

  const createPrescription = apiHooks.useCreatePrescription();

  if (!open) return null;

  const handleRepeatLastRx = () => {
    // Find the most recent appointment with a prescription, excluding the current one if somehow present
    const appointmentsArr = (Array.isArray(patientHistory) ? patientHistory : (patientHistory as any).items || []) as (Appointment & { patient?: Patient })[];
    
    const lastRxAppointment = appointmentsArr
      .sort(
        (a: Appointment, b: Appointment) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
      )
      .find(
        (appt: Appointment & { prescription?: Prescription }) =>
          appt.id !== appointmentId &&
          appt.prescription &&
          appt.prescription.medications &&
          appt.prescription.medications.length > 0,
      );

    if (lastRxAppointment && lastRxAppointment.prescription) {
      const prevMeds = lastRxAppointment.prescription.medications.map(
        (med: { name: string; dosage: string; frequency: string; duration: string; route?: string }) => ({
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          route: med.route || "oral", // Handle potential missing route
        }),
      );

      setMedications(prevMeds);
      if (lastRxAppointment.prescription.instructions) {
        setInstructions(lastRxAppointment.prescription.instructions);
      }
      toast.success("Loaded medications from last visit");
    } else {
      toast.info("No previous prescription found");
    }
  };

  const handleSave = async () => {
    const validMeds = medications.filter((m) => m.name.trim());
    if (validMeds.length === 0) {
      toast.error("Please add at least one medication");
      return;
    }

    setIsSaving(true);
    try {
      await createPrescription.mutateAsync({
        appointmentId: appointmentId ?? "",
        patientId: patientId ?? "",
        medications: validMeds,
        instructions,
      });
      toast.success("Prescription saved");
      onSaved?.();
      onOpenChange?.(false);
    } catch {
      toast.error("Failed to save prescription");
    } finally {
      setIsSaving(false);
    }
  };

  const addMedication = () => {
    setMedications([
      ...medications,
      { name: "", dosage: "", frequency: "", duration: "", route: "oral" },
    ]);
  };

  const updateMedication = (
    index: number,
    field: keyof Medication,
    value: string,
  ) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>New Prescription</CardTitle>
            <CardDescription>Add medications for the patient</CardDescription>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRepeatLastRx}
            className="gap-2"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Repeat Last Rx
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {medications.map((med, i) => (
            <div
              key={i}
              className="grid grid-cols-4 gap-2 p-3 rounded-lg bg-muted/30 relative group"
            >
              <Input
                placeholder="Medication"
                value={med.name}
                onChange={(e) => updateMedication(i, "name", e.target.value)}
              />
              <Input
                placeholder="Dosage"
                value={med.dosage}
                onChange={(e) => updateMedication(i, "dosage", e.target.value)}
              />
              <Input
                placeholder="Frequency"
                value={med.frequency}
                onChange={(e) =>
                  updateMedication(i, "frequency", e.target.value)
                }
              />
              <Input
                placeholder="Duration"
                value={med.duration}
                onChange={(e) =>
                  updateMedication(i, "duration", e.target.value)
                }
              />
              {/* Optional: Add remove button for each row if needed */}
              {medications.length > 1 && (
                <button
                  className="absolute -right-2 -top-2 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() =>
                    setMedications(medications.filter((_, idx) => idx !== i))
                  }
                  title="Remove medication"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addMedication}>
            + Add Medication
          </Button>
          <div className="space-y-2">
            <Label>Instructions</Label>
            <textarea
              className="w-full p-3 rounded-md border bg-background min-h-[80px]"
              placeholder="Special instructions..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange?.(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Prescription"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================
// VITALS MODAL
// ============================================

interface VitalsFormData {
  height: string;
  weight: string;
  systolicBP: string;
  diastolicBP: string;
  pulse: string;
  temperature: string;
  spo2: string;
  respiratoryRate: string;
}

export const VitalsModal: FC<ModalProps> = ({
  open,
  onOpenChange,
  appointmentId,
  patientName,
  onSaved,
}) => {
  const [vitals, setVitals] = useState<VitalsFormData>({
    height: "",
    weight: "",
    systolicBP: "",
    diastolicBP: "",
    pulse: "",
    temperature: "",
    spo2: "",
    respiratoryRate: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const saveVitals = apiHooks.useSaveVitals(appointmentId ?? "");

  if (!open) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveVitals.mutateAsync({
        id: "",
        height: vitals.height ? parseFloat(vitals.height) : undefined,
        weight: vitals.weight ? parseFloat(vitals.weight) : undefined,
        systolicBP: vitals.systolicBP ? parseInt(vitals.systolicBP) : undefined,
        diastolicBP: vitals.diastolicBP ? parseInt(vitals.diastolicBP) : undefined,
        bloodPressure: vitals.systolicBP && vitals.diastolicBP 
          ? `${vitals.systolicBP}/${vitals.diastolicBP}` 
          : undefined,
        pulse: vitals.pulse ? parseInt(vitals.pulse) : undefined,
        temperature: vitals.temperature ? parseFloat(vitals.temperature) : undefined,
        spo2: vitals.spo2 ? parseInt(vitals.spo2) : undefined,
      });
      toast.success("Vitals saved");
      onSaved?.();
      onOpenChange?.(false);
    } catch {
      toast.error("Failed to save vitals");
    } finally {
      setIsSaving(false);
    }
  };

  const updateVital = (field: keyof VitalsFormData, value: string) => {
    setVitals({ ...vitals, [field]: value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg m-4">
        <CardHeader>
          <CardTitle>Record Vitals</CardTitle>
          <CardDescription>{patientName ?? "Patient"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Height (cm)</Label>
              <Input
                type="number"
                value={vitals.height}
                onChange={(e) => updateVital("height", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Weight (kg)</Label>
              <Input
                type="number"
                value={vitals.weight}
                onChange={(e) => updateVital("weight", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Systolic BP</Label>
              <Input
                type="number"
                value={vitals.systolicBP}
                onChange={(e) => updateVital("systolicBP", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Diastolic BP</Label>
              <Input
                type="number"
                value={vitals.diastolicBP}
                onChange={(e) => updateVital("diastolicBP", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Pulse (bpm)</Label>
              <Input
                type="number"
                value={vitals.pulse}
                onChange={(e) => updateVital("pulse", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Temp (°F)</Label>
              <Input
                type="number"
                step="0.1"
                value={vitals.temperature}
                onChange={(e) => updateVital("temperature", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>SpO2 (%)</Label>
              <Input
                type="number"
                value={vitals.spo2}
                onChange={(e) => updateVital("spo2", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Resp Rate</Label>
              <Input
                type="number"
                value={vitals.respiratoryRate}
                onChange={(e) => updateVital("respiratoryRate", e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange?.(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Vitals"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================
// BILLING MODAL
// ============================================

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export const BillingModal: FC<ModalProps> = ({
  open,
  onOpenChange,
  appointmentId,
  patientId,
  onSaved,
}) => {
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "Consultation", quantity: 1, unitPrice: 500 },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const createInvoice = apiHooks.useCreateInvoice();

  if (!open) return null;

  const total = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await createInvoice.mutateAsync({
        patientId: patientId ?? "",
        appointmentId,
        items: lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          price: item.unitPrice,
        })),
        total: Math.round(total * 1.18),
        status: "pending",
      });
      toast.success("Invoice created");
      onSaved?.();
      onOpenChange?.(false);
    } catch {
      toast.error("Failed to create invoice");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg m-4">
        <CardHeader>
          <CardTitle>Create Invoice</CardTitle>
          <CardDescription>Add billing items</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineItems.map((item, i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <Input
                placeholder="Description"
                value={item.description}
                onChange={(e) => {
                  const updated = [...lineItems];
                  updated[i] = { ...item, description: e.target.value };
                  setLineItems(updated);
                }}
              />
              <Input
                type="number"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => {
                  const updated = [...lineItems];
                  updated[i] = { ...item, quantity: parseInt(e.target.value) || 1 };
                  setLineItems(updated);
                }}
              />
              <Input
                type="number"
                placeholder="Price"
                value={item.unitPrice}
                onChange={(e) => {
                  const updated = [...lineItems];
                  updated[i] = { ...item, unitPrice: parseFloat(e.target.value) || 0 };
                  setLineItems(updated);
                }}
              />
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: 0 }])}
          >
            + Add Item
          </Button>
          <div className="text-right text-lg font-bold">Total: ₹{total.toFixed(2)}</div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange?.(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================
// CONSULTATION NOTES MODAL
// ============================================

interface ConsultationNotesModalProps extends ModalProps {
  patientName?: string;
  onSaved?: () => Promise<void>;
}

export const ConsultationNotesModal: FC<ConsultationNotesModalProps> = ({
  open,
  onOpenChange,
  appointmentId,
  patientName,
  onSaved,
}) => {
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const updateAppointment = apiHooks.useUpdateAppointmentObservations(appointmentId ?? "");

  if (!open) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateAppointment.mutateAsync({ consultationNotes: notes });
      toast.success("Notes saved");
      onSaved?.();
      onOpenChange?.(false);
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg m-4">
        <CardHeader>
          <CardTitle>Consultation Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            className="w-full p-3 rounded-md border bg-background min-h-[200px]"
            placeholder="Enter consultation notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange?.(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Notes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export type { ModalProps, Medication, VitalsFormData, LineItem };
