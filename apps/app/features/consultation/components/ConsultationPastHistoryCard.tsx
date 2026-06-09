"use client";

import dynamic from "next/dynamic";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import {
  Collapsible,
  CollapsibleContent,
} from "@workspace/ui/components/overlay/collapsible";
import type { PatientWithMedicalHistory } from "@workspace/types";

const PatientMedicalHistoryContainerLazy = dynamic(
  () =>
    import(
      "@/features/patients/components/details/PatientMedicalHistoryContainer"
    ).then((m) => m.PatientMedicalHistoryContainer),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-6">
        <DocitaLoadingIndicator variant="section" iconClassName="h-7 w-7" />
      </div>
    ),
  },
);

export interface HistorySummary {
  hasAny: boolean;
  parts: string[];
}

export function summariseHistory(
  patient?: PatientWithMedicalHistory,
): HistorySummary {
  if (!patient) return { hasAny: false, parts: [] };
  const parts: string[] = [];
  const conditions = patient.medicalConditions?.length ?? 0;
  const allergies = patient.patientAllergies?.length ?? 0;
  const surgeries = patient.surgicalHistory?.length ?? 0;
  const family = patient.familyHistory?.length ?? 0;
  if (conditions > 0)
    parts.push(`${conditions} condition${conditions > 1 ? "s" : ""}`);
  if (allergies > 0)
    parts.push(`${allergies} allerg${allergies > 1 ? "ies" : "y"}`);
  if (surgeries > 0) parts.push(`${surgeries} surgical`);
  if (family > 0) parts.push(`${family} family`);
  if (patient.socialHistory) parts.push("social");
  return { hasAny: parts.length > 0, parts };
}

interface ConsultationPastHistoryCardProps {
  patient?: PatientWithMedicalHistory;
  patientLoading?: boolean;
  readOnly?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConsultationPastHistoryCard({
  patient,
  patientLoading,
  readOnly,
  open,
  onOpenChange,
}: ConsultationPastHistoryCardProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleContent className="pb-3">
        {patientLoading && !patient ? (
          <div className="flex items-center justify-center py-6">
            <DocitaLoadingIndicator variant="section" iconClassName="h-7 w-7" />
          </div>
        ) : patient ? (
          <PatientMedicalHistoryContainerLazy
            patient={patient}
            readOnly={readOnly}
            variant="consultation"
          />
        ) : (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Could not load this patient&apos;s medical history.
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
