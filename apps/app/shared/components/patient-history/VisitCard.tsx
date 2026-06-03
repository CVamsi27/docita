"use client";

import { useState } from "react";
import { Card, CardContent } from "@workspace/ui/components/indicators/card";
import { cn } from "@workspace/ui/lib/utils";
import { formatDate } from "@workspace/utils";
import { EVENT_TYPE_CONFIG, type VisitCardProps, capitalizeFirstLetter, parseVisitCardMetadata } from "./visit-card-config";
import { CompactVisitCard, VisitCardHeader, VisitCardVitalsSection, VisitCardDiagnosisSection, VisitCardMedicationsSection, VisitCardProceduresSection } from "./VisitCardSections";

export { EVENT_TYPE_CONFIG, type VisitCardProps } from "./visit-card-config";

export function VisitCard({ event, mode, defaultExpanded = false }: VisitCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const config = EVENT_TYPE_CONFIG[event.type];
  const Icon = config.icon;
  const canExpand = mode !== "compact";
  const d = new Date(event.date);
  const dateStr = mode === "compact" ? formatDate(d, "d MMM") : mode === "portal" ? formatDate(d, "EEEE, d MMMM yyyy") : formatDate(d, "EEE, d MMM yyyy");

  const { doctorName, consultationId, vitals, medications, diagnoses, treatmentPlan, observations, status: statusBadge } = parseVisitCardMetadata(event.metadata);
  const primaryDiagnosis = diagnoses.find((dl) => dl.isPrimary) ?? diagnoses[0];
  const displayTitle = capitalizeFirstLetter(event.title);
  const displayPrimaryDiagnosis = capitalizeFirstLetter(primaryDiagnosis?.description ?? null);
  const displayEventDescription = capitalizeFirstLetter(event.description);

  const statusKey = (statusBadge ?? "").toLowerCase().replace(/_/g, "-");
  const isFutureAppointment = event.type === "APPOINTMENT" && d.getTime() > Date.now();
  const consultationHref = consultationId ? `/consultation/${consultationId}?from=patient` : `/consultation/${event.id}?from=patient`;
  const hasConsultation = Boolean(consultationId) || statusKey.includes("in-progress") || statusKey.includes("completed");

  const appointmentAction = event.type !== "APPOINTMENT" || mode !== "full" ? null
    : isFutureAppointment ? { label: "View appointment", href: `/appointments?id=${event.id}`, variant: "default" as const, disabled: false }
    : statusKey.includes("in-progress") || statusKey.includes("in progress") ? { label: "Edit consultation", href: `/consultation/${event.id}?from=patient`, variant: "default" as const, disabled: false }
    : statusKey.includes("completed") ? { label: "View consultation", href: `/consultation/${event.id}?from=patient`, variant: "outline" as const, disabled: false }
    : { label: "Start consultation", href: `/consultation/${event.id}?from=patient`, variant: "default" as const, disabled: false };

  const consultationAction = event.type === "APPOINTMENT" && mode === "full" && appointmentAction?.label !== "View consultation"
    ? { label: "View consultation", href: hasConsultation ? consultationHref : undefined, variant: "default" as const, disabled: !hasConsultation }
    : null;

  const typeLabel = mode === "portal" ? config.friendlyName : config.label.slice(0, -1);

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
