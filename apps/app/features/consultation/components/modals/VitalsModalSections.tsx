"use client";

import {
  Input,
  Label
} from "@workspace/ui/components";
import type { VitalsFormData } from "./use-vitals-form";

interface VitalsFieldMeta {
  key: keyof VitalsFormData;
  label: string;
  placeholder: string;
  step?: string;
}

const VITALS_FIELDS: VitalsFieldMeta[] = [
  { key: "height", label: "Height (cm)", placeholder: "Height" },
  { key: "weight", label: "Weight (kg)", placeholder: "Weight" },
  { key: "systolicBP", label: "Systolic BP", placeholder: "Systolic BP" },
  { key: "diastolicBP", label: "Diastolic BP", placeholder: "Diastolic BP" },
  { key: "pulse", label: "Pulse (bpm)", placeholder: "Pulse" },
  {
    key: "temperature",
    label: "Temp (°C)",
    placeholder: "Temperature",
    step: "0.1",
  },
  { key: "spo2", label: "SpO2 (%)", placeholder: "SpO2" },
  {
    key: "respiratoryRate",
    label: "Resp. Rate",
    placeholder: "Respiratory rate",
  },
];

interface VitalsFieldGridProps {
  vitals: VitalsFormData;
  onFieldChange: (field: keyof VitalsFormData, value: string) => void;
}

/** The 8-field vitals grid — every field was a near-identical `Label` + numeric `Input` pair, differing only in key, label, placeholder, and (for temperature) its decimal step. The shared shape is named once and driven from `VITALS_FIELDS` instead of duplicated eight times. */
export function VitalsFieldGrid({
  vitals,
  onFieldChange,
}: VitalsFieldGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {VITALS_FIELDS.map((field) => (
        <div key={field.key} className="space-y-2">
          <Label>{field.label}</Label>
          <Input
            type="number"
            value={vitals[field.key]}
            onChange={(e) => onFieldChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            step={field.step}
          />
        </div>
      ))}
    </div>
  );
}
