"use client";

import {
  Collapsible,
  CollapsibleContent,
} from "@workspace/ui/components/overlay/collapsible";
import { cn } from "@workspace/ui/lib/utils";
import {
  PatientCardHeader,
  PatientAllergiesBanner,
  PatientConditionsSection,
  PatientMedicationsSection,
  PatientVitalsSection,
  PatientLastVisitSection,
  PatientCardActions,
  type PatientContextData,
} from "./PatientContextCardUISections";

export type { PatientContextData } from "./PatientContextCardUISections";

export interface PatientContextCardUIProps {
  patient: PatientContextData;
  isExpanded: boolean;
  onToggleExpand: () => void;
  className?: string;
  showVitalsTrend?: boolean;
}

export function PatientContextCardUI({
  patient,
  isExpanded,
  onToggleExpand,
  className,
}: PatientContextCardUIProps) {
  const hasAllergies = (patient.allergies?.length ?? 0) > 0;

  return (
    <div
      className={cn(
        "border border-border/70 rounded-[var(--radius)] bg-card shadow-sm overflow-hidden",
        hasAllergies && "border-l-4 border-l-red-500",
        className,
      )}
    >
      <div className="p-3 border-b bg-muted/30">
        <PatientCardHeader
          patient={patient}
          isExpanded={isExpanded}
          onToggleExpand={onToggleExpand}
          hasAllergies={hasAllergies}
        />
      </div>

      {hasAllergies && (
        <PatientAllergiesBanner allergies={patient.allergies ?? []} />
      )}

      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <CollapsibleContent>
          <div className="p-3 space-y-4">
            <PatientConditionsSection conditions={patient.conditions} />
            <PatientMedicationsSection
              medications={patient.currentMedications}
            />
            <PatientVitalsSection recentVitals={patient.recentVitals} />
            {patient.lastVisit && (
              <PatientLastVisitSection
                lastVisit={patient.lastVisit}
                lastVisitReason={patient.lastVisitReason}
              />
            )}
            <PatientCardActions patientId={patient.id} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
