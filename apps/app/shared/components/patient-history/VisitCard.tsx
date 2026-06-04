"use client";

import { useState } from "react";
import { Card, CardContent } from "@workspace/ui/components/indicators/card";
import { cn } from "@workspace/ui/lib/utils";
import { type VisitCardProps } from "./visit-card-config";
import { CompactVisitCard, VisitCardHeader, VisitCardVitalsSection, VisitCardDiagnosisSection, VisitCardMedicationsSection, VisitCardProceduresSection } from "./VisitCardSections";
import { buildVisitCardViewModel } from "./visit-card-view-model";

export { EVENT_TYPE_CONFIG, type VisitCardProps } from "./visit-card-config";

export function VisitCard({ event, mode, defaultExpanded = false }: VisitCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const canExpand = mode !== "compact";
  const {
    config,
    Icon,
    dateStr,
    metadata,
    displayTitle,
    displayPrimaryDiagnosis,
    displayEventDescription,
    appointmentAction,
    consultationAction,
    typeLabel,
  } = buildVisitCardViewModel(event, mode);
  const {
    doctorName,
    vitals,
    medications,
    diagnoses,
    treatmentPlan,
    observations,
    status: statusBadge,
  } = metadata;

  if (mode === "compact") {
    return (
      <CompactVisitCard icon={Icon} color={config.color} displayTitle={displayTitle} dateStr={dateStr}
        isAppointment={event.type === "APPOINTMENT"} medications={medications}
        displayPrimaryDiagnosis={displayPrimaryDiagnosis} doctorName={doctorName} />
    );
  }

  const isAppointment = event.type === "APPOINTMENT";
  const isPrescription = event.type === "PRESCRIPTION";

  return (
    <Card className={cn("transition-shadow", canExpand && "cursor-pointer hover:shadow-sm")}
      onClick={canExpand ? () => setExpanded((v) => !v) : undefined}>
      <CardContent className="p-3">
        <div className="flex gap-3">
          <div className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-muted">
            <Icon className={cn("h-4 w-4", config.color)} />
          </div>
          <div className="min-w-0 flex-1">
            <VisitCardHeader displayTitle={displayTitle} dateStr={dateStr} canExpand={canExpand}
              expanded={expanded} mainAction={appointmentAction} consultationAction={consultationAction}
              typeLabel={typeLabel} statusBadge={statusBadge}
              medicationsCount={isAppointment ? medications.length : 0}
              doctorName={isAppointment ? doctorName : null}
              displayPrimaryDiagnosis={isAppointment ? displayPrimaryDiagnosis : ""} />
            {expanded && (
              <div className="mt-3 space-y-3 border-t pt-3">
                {isAppointment && (
                  <>
                    <VisitCardVitalsSection vitals={vitals} />
                    <VisitCardDiagnosisSection diagnoses={diagnoses} mode={mode} />
                    <VisitCardMedicationsSection medications={medications} />
                    <VisitCardProceduresSection treatmentPlan={treatmentPlan} observations={observations} />
                  </>
                )}
                {isPrescription && <VisitCardMedicationsSection medications={medications} />}
                {!isAppointment && !isPrescription && displayEventDescription && (
                  <p className="text-xs text-muted-foreground">{displayEventDescription}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
