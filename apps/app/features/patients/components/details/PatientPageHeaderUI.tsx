"use client";

import { getPatientFullName } from "@workspace/utils";

import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";
import {
  Badge,
  Button
} from "@workspace/ui/components";
import type { Patient } from "@workspace/types";
import { useAskAi } from "@/components/ask-ai/ask-ai-context";
import { formatGenderLabel } from "@/lib/formatters";
import { AI_FEATURES_ENABLED } from "@/lib/config/ai-features";

interface PatientPageHeaderUIProps {
  patient: Patient;
  onEdit?: () => void;
}

export function PatientPageHeaderUI({
  patient,
  onEdit,
}: PatientPageHeaderUIProps) {
  const { openOverlay } = useAskAi();
  const patientName = getPatientFullName(patient).trim();

  const askAiForPatient = () => {
    openOverlay({
      id: `patient:${patient.id}`,
      label: `on ${patientName || "this patient"}`,
      payload: { kind: "patient", patientId: patient.id },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="-ml-2 text-muted-foreground"
        >
          <Link href="/patients">
            <ChevronLeft className="h-4 w-4" />
            Patients
          </Link>
        </Button>
      </div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="ui-page-title">{patientName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{formatGenderLabel(patient.gender)}</Badge>
            <span className="text-sm text-muted-foreground">
              ID: {patient.id?.slice(0, 8)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {AI_FEATURES_ENABLED && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={askAiForPatient}
              data-testid="patient-ask-ai"
              className="gap-2"
              aria-label={`Ask AI about ${patientName || "this patient"}`}
            >
              <Sparkles className="size-4 text-primary" aria-hidden />
              Ask AI
            </Button>
          )}
          {onEdit && <Button onClick={onEdit}>Edit Patient</Button>}
        </div>
      </div>
    </div>
  );
}
