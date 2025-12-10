"use client";

import { CRUDDialog } from "@workspace/ui/components/crud-dialog.js";
import { Button } from "@workspace/ui/components/button.js";
import { Input } from "@workspace/ui/components/input.js";
import { Label } from "@workspace/ui/components/label.js";
import { Activity, Save } from "lucide-react";
import { useVitalsForm } from "@/hooks/use-vitals-form";
import { VitalSignsValidationPanel } from "@/components/vital-signs/vital-signs-validator";

interface VitalsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  patientName?: string;
  onSaved?: () => void;
}

export function VitalsModal({
  open,
  onOpenChange,
  appointmentId,
  patientName,
  onSaved,
}: VitalsModalProps) {
  const {
    loading,
    formData: vitalsData,
    updateField: updateVitals,
    handleSubmit,
  } = useVitalsForm({
    appointmentId,
    onVitalsSaved: () => {
      onSaved?.();
      onOpenChange(false);
    },
  });

  const hasVitalsData =
    vitalsData.systolicBP ||
    vitalsData.diastolicBP ||
    vitalsData.pulse ||
    vitalsData.temperature ||
    vitalsData.spo2;

  const handleVitalsSubmit = () => {
    handleSubmit({ preventDefault: () => {} } as React.FormEvent);
  };

  return (
    <CRUDDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Record Vitals${patientName ? ` - ${patientName}` : ""}`}
      isLoading={loading}
      onSubmit={handleVitalsSubmit}
      submitLabel={loading ? "Saving..." : "Save Vitals"}
      contentClassName="max-w-2xl max-h-[90vh] overflow-y-auto"
    >
      <form className="space-y-6 py-4">
        {/* Physical Stats Section */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
          <h3 className="font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Physical Stats
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                step="0.1"
                placeholder="170"
                value={vitalsData.height}
                onChange={(e) => updateVitals("height", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                placeholder="70"
                value={vitalsData.weight}
                onChange={(e) => updateVitals("weight", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Vital Signs Section */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
          <h3 className="font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-red-500" /> Vital Signs
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bp-sys">Systolic BP</Label>
              <Input
                id="bp-sys"
                placeholder="120"
                value={vitalsData.systolicBP}
                onChange={(e) => updateVitals("systolicBP", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bp-dia">Diastolic BP</Label>
              <Input
                id="bp-dia"
                placeholder="80"
                value={vitalsData.diastolicBP}
                onChange={(e) => updateVitals("diastolicBP", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pulse">Pulse (bpm)</Label>
              <Input
                id="pulse"
                type="number"
                placeholder="72"
                value={vitalsData.pulse}
                onChange={(e) => updateVitals("pulse", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="temp">Temperature (°F)</Label>
              <Input
                id="temp"
                type="number"
                step="0.1"
                placeholder="98.6"
                value={vitalsData.temperature}
                onChange={(e) => updateVitals("temperature", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spo2">SpO2 (%)</Label>
              <Input
                id="spo2"
                type="number"
                step="0.1"
                placeholder="98"
                value={vitalsData.spo2}
                onChange={(e) => updateVitals("spo2", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Vital Signs Validation */}
        {hasVitalsData && (
          <VitalSignsValidationPanel
            vitals={{
              bpSystolic: vitalsData.systolicBP
                ? parseInt(vitalsData.systolicBP)
                : null,
              bpDiastolic: vitalsData.diastolicBP
                ? parseInt(vitalsData.diastolicBP)
                : null,
              heartRate: vitalsData.pulse ? parseInt(vitalsData.pulse) : null,
              temperature: vitalsData.temperature
                ? parseFloat(vitalsData.temperature)
                : null,
              spO2: vitalsData.spo2 ? parseFloat(vitalsData.spo2) : null,
              respiratoryRate: null,
              glucose: null,
            }}
          />
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
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
                <Save className="h-4 w-4" /> Save Vitals
              </>
            )}
          </Button>
        </div>
      </form>
    </CRUDDialog>
  );
}
