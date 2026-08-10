"use client";

import dynamic from "next/dynamic";
import { History } from "lucide-react";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Collapsible, CollapsibleContent } from "@workspace/ui/components/overlay/collapsible";
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
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-border/60 bg-card shadow-xs">
          <header className="flex items-center gap-2 border-b border-border/50 bg-muted/20 px-4 py-2.5">
            <History className="h-4 w-4 text-info" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground">
              Past medical history
            </h3>
          </header>
          <div className="p-4">
            {patientLoading && !patient ? (
              <div className="flex items-center justify-center py-6">
                <DocitaLoadingIndicator
                  variant="section"
                  iconClassName="h-7 w-7"
                />
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
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
