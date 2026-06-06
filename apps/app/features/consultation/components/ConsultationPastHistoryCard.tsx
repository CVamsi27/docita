"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ChevronDown, History } from "lucide-react";
import { CategoryAvatar } from "@workspace/ui/components/indicators/category-avatar";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/overlay/collapsible";
import { cn } from "@workspace/ui/lib/utils";
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

interface ConsultationPastHistoryCardProps {
  patient?: PatientWithMedicalHistory;
  patientLoading?: boolean;
  readOnly?: boolean;
}

interface HistorySummary {
  hasAny: boolean;
  parts: string[];
}

/** Summarise existing history so the card can show what's on file and default open. */
function summariseHistory(patient?: PatientWithMedicalHistory): HistorySummary {
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
  if (surgeries > 0)
    parts.push(`${surgeries} surgical`);
  if (family > 0) parts.push(`${family} family`);
  if (patient.socialHistory) parts.push("social");
  return { hasAny: parts.length > 0, parts };
}

/**
 * Past medical history surfaced at the very top of the consultation, above
 * Subjective. Auto-expands when the patient already has history on file so the
 * doctor sees it without digging; collapses to a compact header otherwise.
 */
export function ConsultationPastHistoryCard({
  patient,
  patientLoading,
  readOnly,
}: ConsultationPastHistoryCardProps) {
  const summary = summariseHistory(patient);
  const [open, setOpen] = useState(summary.hasAny);
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="overflow-hidden rounded-[var(--radius-md)] border border-border/60 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]"
    >
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-muted/40 md:px-5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <CategoryAvatar
          icon={<History />}
          tone="neutral"
          size="sm"
          aria-label="Past medical history"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold leading-tight">
            Past medical history
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {summary.hasAny
              ? `On file: ${summary.parts.join(" · ")}`
              : "No history recorded yet"}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border/60 p-4 md:p-5">
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