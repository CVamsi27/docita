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
import { Label } from "@workspace/ui/components/label";
import { toast } from "sonner";
import { useSaveVitals } from "@/hooks/api/use-clinical";
import { HeartPulse } from "lucide-react";
import { ModalProps } from "./PrescriptionModal";

export interface VitalsFormData {
  height: string;
  weight: string;
  systolicBP: string;
  diastolicBP: string;
  pulse: string;
  temperature: string;
  spo2: string;
  respiratoryRate: string;
}

export function VitalsModal({
  open,
  onOpenChange,
  appointmentId,
  patientName,
  onSaved,
}: ModalProps) {
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

  const recordVitals = useSaveVitals(appointmentId || "");

  const handleSave = async () => {
    try {
      if (!appointmentId) return;

      const payload: Record<string, unknown> = { appointmentId };
      Object.entries(vitals).forEach(([key, value]) => {
        if (value.trim() !== "") {
          payload[key] = parseFloat(value);
        }
      });

      if (Object.keys(payload).length <= 1) {
        toast.error("Please enter at least one vital sign");
        return;
      }

      await recordVitals.mutateAsync(payload);

      toast.success("Vitals recorded");
      onSaved?.();
      onOpenChange?.(false);
      setVitals({
        height: "",
        weight: "",
        systolicBP: "",
        diastolicBP: "",
        pulse: "",
        temperature: "",
        spo2: "",
        respiratoryRate: "",
      });
    } catch (err) {
      toast.error("Failed to record vitals");

    }
  };

  const updateVital = (field: keyof VitalsFormData, value: string) => {
    setVitals((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-destructive" />
            Record Vitals for {patientName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Height (cm)</Label>
            <Input
              type="number"
              value={vitals.height}
              onChange={(e) => updateVital("height", e.target.value)}
              placeholder="e.g. 175"
            />
          </div>
          <div className="space-y-2">
            <Label>Weight (kg)</Label>
            <Input
              type="number"
              value={vitals.weight}
              onChange={(e) => updateVital("weight", e.target.value)}
              placeholder="e.g. 70"
            />
          </div>

          <div className="space-y-2">
            <Label>Systolic BP</Label>
            <Input
              type="number"
              value={vitals.systolicBP}
              onChange={(e) => updateVital("systolicBP", e.target.value)}
              placeholder="e.g. 120"
            />
          </div>
          <div className="space-y-2">
            <Label>Diastolic BP</Label>
            <Input
              type="number"
              value={vitals.diastolicBP}
              onChange={(e) => updateVital("diastolicBP", e.target.value)}
              placeholder="e.g. 80"
            />
          </div>

          <div className="space-y-2">
            <Label>Pulse (bpm)</Label>
            <Input
              type="number"
              value={vitals.pulse}
              onChange={(e) => updateVital("pulse", e.target.value)}
              placeholder="e.g. 72"
            />
          </div>
          <div className="space-y-2">
            <Label>Temp (°C)</Label>
            <Input
              type="number"
              value={vitals.temperature}
              onChange={(e) => updateVital("temperature", e.target.value)}
              placeholder="e.g. 37.0"
              step="0.1"
            />
          </div>

          <div className="space-y-2">
            <Label>SpO2 (%)</Label>
            <Input
              type="number"
              value={vitals.spo2}
              onChange={(e) => updateVital("spo2", e.target.value)}
              placeholder="e.g. 98"
            />
          </div>
          <div className="space-y-2">
            <Label>Resp. Rate</Label>
            <Input
              type="number"
              value={vitals.respiratoryRate}
              onChange={(e) => updateVital("respiratoryRate", e.target.value)}
              placeholder="e.g. 16"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={recordVitals.isPending}>
            {recordVitals.isPending ? "Saving..." : "Save Vitals"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
