"use client";

import { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { validateVitalSign, type VitalSignValidation } from "@workspace/types";
import { cn } from "@workspace/ui/lib/utils";

interface VitalSignValidatorProps {
  sign:
    | "bp_systolic"
    | "bp_diastolic"
    | "hr"
    | "temp"
    | "spo2"
    | "rr"
    | "glucose";
  value: number | null;
  label: string;
  unit: string;
  onValidationChange?: (validation: VitalSignValidation) => void;
  showSuggestions?: boolean;
}

export function VitalSignValidator({
  sign,
  value,
  label,
  unit,
  onValidationChange,
  showSuggestions = true,
}: VitalSignValidatorProps) {
  const [validation, setValidation] = useState<VitalSignValidation | null>(
    null,
  );

  useEffect(() => {
    if (value === null || value === undefined) {
      setValidation(null);
      return;
    }

    const result = validateVitalSign(sign, value);
    setValidation(result);
    onValidationChange?.(result);
  }, [value, sign, onValidationChange]);

  if (!validation) return null;

  const severityColor = {
    warning: "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20",
    critical: "border-red-500/50 bg-red-50/50 dark:bg-red-950/20",
  };

  const severityIcon = {
    warning: (
      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
    ),
    critical: (
      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
    ),
  };

  if (validation.isNormal) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4" />
        <span>
          {label}: {value}
          {unit} - Normal
        </span>
      </div>
    );
  }

  return (
    <Alert
      className={cn(
        "border",
        validation.severity && severityColor[validation.severity],
      )}
    >
      <div className="flex gap-2">
        {validation.severity && severityIcon[validation.severity]}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{label}</span>
            <Badge
              variant={
                validation.severity === "critical" ? "destructive" : "secondary"
              }
              className="text-xs"
            >
              {validation.severity?.toUpperCase()}
            </Badge>
          </div>
          <AlertDescription className="mt-1 text-sm">
            {validation.message}
          </AlertDescription>
          {showSuggestions && validation.suggestion && (
            <div className="mt-2 text-xs text-muted-foreground bg-background/50 p-2 rounded">
              💡 {validation.suggestion}
            </div>
          )}
        </div>
      </div>
    </Alert>
  );
}

interface VitalSignsPanelProps {
  vitals: Partial<{
    bpSystolic: number | null;
    bpDiastolic: number | null;
    heartRate: number | null;
    temperature: number | null;
    spO2: number | null;
    respiratoryRate: number | null;
    glucose: number | null;
  }>;
  onValidationChange?: (results: Record<string, VitalSignValidation>) => void;
}

export function VitalSignsValidationPanel({
  vitals,
  onValidationChange,
}: VitalSignsPanelProps) {
  const [validations, setValidations] = useState<
    Record<string, VitalSignValidation>
  >({});

  const handleValidationChange = (
    sign: string,
    validation: VitalSignValidation,
  ) => {
    const updated = { ...validations, [sign]: validation };
    setValidations(updated);
    onValidationChange?.(updated);
  };

  const hasWarnings = Object.values(validations).some(
    (v) => v.severity === "warning",
  );
  const hasErrors = Object.values(validations).some(
    (v) => v.severity === "critical",
  );

  return (
    <div className="space-y-3">
      {hasErrors && (
        <Alert className="border-red-500/50 bg-red-50/50 dark:bg-red-950/20">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            Critical vital sign values detected. Please review before
            proceeding.
          </AlertDescription>
        </Alert>
      )}

      {hasWarnings && !hasErrors && (
        <Alert className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            Some vital signs are outside normal range. Clinical review
            recommended.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        {vitals.bpSystolic !== null && vitals.bpSystolic !== undefined && (
          <VitalSignValidator
            sign="bp_systolic"
            value={vitals.bpSystolic}
            label="Systolic BP"
            unit=" mmHg"
            onValidationChange={(v) => handleValidationChange("bp_systolic", v)}
          />
        )}

        {vitals.bpDiastolic !== null && vitals.bpDiastolic !== undefined && (
          <VitalSignValidator
            sign="bp_diastolic"
            value={vitals.bpDiastolic}
            label="Diastolic BP"
            unit=" mmHg"
            onValidationChange={(v) =>
              handleValidationChange("bp_diastolic", v)
            }
          />
        )}

        {vitals.heartRate !== null && vitals.heartRate !== undefined && (
          <VitalSignValidator
            sign="hr"
            value={vitals.heartRate}
            label="Heart Rate"
            unit=" bpm"
            onValidationChange={(v) => handleValidationChange("hr", v)}
          />
        )}

        {vitals.temperature !== null && vitals.temperature !== undefined && (
          <VitalSignValidator
            sign="temp"
            value={vitals.temperature}
            label="Temperature"
            unit="°C"
            onValidationChange={(v) => handleValidationChange("temp", v)}
          />
        )}

        {vitals.spO2 !== null && vitals.spO2 !== undefined && (
          <VitalSignValidator
            sign="spo2"
            value={vitals.spO2}
            label="SpO₂"
            unit="%"
            onValidationChange={(v) => handleValidationChange("spo2", v)}
          />
        )}

        {vitals.respiratoryRate !== null &&
          vitals.respiratoryRate !== undefined && (
            <VitalSignValidator
              sign="rr"
              value={vitals.respiratoryRate}
              label="Respiratory Rate"
              unit=" breaths/min"
              onValidationChange={(v) => handleValidationChange("rr", v)}
            />
          )}

        {vitals.glucose !== null && vitals.glucose !== undefined && (
          <VitalSignValidator
            sign="glucose"
            value={vitals.glucose}
            label="Blood Glucose"
            unit=" mg/dL"
            onValidationChange={(v) => handleValidationChange("glucose", v)}
          />
        )}
      </div>
    </div>
  );
}
