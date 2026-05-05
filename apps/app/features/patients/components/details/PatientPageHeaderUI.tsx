"use client";

import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import type { Patient } from "@workspace/types";
import { useAskAi } from "@/features/_shared/components/ask-ai/ask-ai-context";

interface PatientPageHeaderUIProps {
  patient: Patient;
  onEdit?: () => void;
}

export function PatientPageHeaderUI({ patient, onEdit }: PatientPageHeaderUIProps) {
  const { openOverlay } = useAskAi();
  const patientName = `${patient.firstName} ${patient.lastName}`.trim();

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
        <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
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
            <Badge variant="outline">{patient.gender}</Badge>
            <span className="text-sm text-muted-foreground">
              ID: {patient.id?.slice(0, 8)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
          {onEdit && (
            <Button onClick={onEdit}>Edit Patient</Button>
          )}
        </div>
      </div>
    </div>
  );
}
