"use client";

import { AlertCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

interface MedicationValidationAlert {
  medicationIndex: number;
  medicationName: string;
  warnings: string[];
  hasErrors?: boolean;
  hasDosageWarning?: boolean;
  hasContraindicationWarning?: boolean;
}

interface MedicationValidationDisplayProps {
  validations: MedicationValidationAlert[];
}

export function MedicationValidationDisplay({
  validations,
}: MedicationValidationDisplayProps) {
  if (validations.length === 0) return null;

  const hasErrors = validations.some((v) => v.hasErrors);
  const hasWarnings = validations.some(
    (v) => !v.hasErrors && v.warnings.length > 0,
  );

  return (
    <div className="space-y-2">
      {hasErrors && (
        <Alert className="border-red-500/50 bg-red-50/50 dark:bg-red-950/20">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-600 dark:text-red-400">
            Critical medication issues detected. Please review before saving.
          </AlertDescription>
        </Alert>
      )}

      {hasWarnings && !hasErrors && (
        <Alert className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertDescription className="text-yellow-600 dark:text-yellow-400">
            Medication warnings detected. Review before saving.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        {validations.map((validation) => (
          <div
            key={validation.medicationIndex}
            className={cn(
              "p-3 rounded-lg border",
              validation.hasErrors
                ? "border-red-500/50 bg-red-50/50 dark:bg-red-950/20"
                : "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20",
            )}
          >
            <div className="flex items-start gap-2">
              {validation.hasErrors ? (
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {validation.medicationName || "Medication"}
                  </span>
                  {validation.hasErrors && (
                    <Badge variant="destructive" className="text-xs">
                      ERROR
                    </Badge>
                  )}
                  {!validation.hasErrors && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-yellow-500/20 text-yellow-700 dark:text-yellow-400"
                    >
                      WARNING
                    </Badge>
                  )}
                </div>
                <ul className="text-sm space-y-1">
                  {validation.warnings.map((warning, idx) => (
                    <li key={idx} className="text-xs leading-relaxed">
                      • {warning}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface MedicationValidationRowProps {
  validation?: {
    warnings: string[];
    hasErrors?: boolean;
  };
}

export function MedicationValidationRow({
  validation,
}: MedicationValidationRowProps) {
  if (!validation || validation.warnings.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "text-xs p-2 rounded border flex items-start gap-2 mt-1",
        validation.hasErrors
          ? "border-red-500/50 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400"
          : "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20 text-yellow-600 dark:text-yellow-400",
      )}
    >
      {validation.hasErrors ? (
        <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
      ) : (
        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
      )}
      <div className="flex-1">
        {validation.warnings.map((warning, idx) => (
          <div key={idx}>{warning}</div>
        ))}
      </div>
    </div>
  );
}
