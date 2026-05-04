"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Activity,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileText,
  FlaskConical,
  Heart,
  Pill,
  Stethoscope,
  TrendingUp,
  User,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { formatDate } from "@workspace/utils";
import type { TimelineEvent, TimelineEventType } from "@workspace/types";

export const EVENT_TYPE_CONFIG: Record<
  TimelineEventType,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    friendlyName: string;
  }
> = {
  APPOINTMENT: {
    label: "Appointments",
    icon: Calendar,
    color: "text-primary",
    friendlyName: "Doctor Visit",
  },
  PRESCRIPTION: {
    label: "Prescriptions",
    icon: Pill,
    color: "text-success",
    friendlyName: "Medication Prescribed",
  },
  METRIC_RECORD: {
    label: "Metrics",
    icon: TrendingUp,
    color: "text-info",
    friendlyName: "Health Measurement",
  },
  LAB_TEST: {
    label: "Lab Tests",
    icon: FlaskConical,
    color: "text-warning",
    friendlyName: "Lab Test",
  },
  MEDICAL_DOCUMENT: {
    label: "Documents",
    icon: FileText,
    color: "text-muted-foreground",
    friendlyName: "Document Issued",
  },
  FOLLOW_UP: {
    label: "Follow-Ups",
    icon: Stethoscope,
    color: "text-primary",
    friendlyName: "Follow-Up",
  },
  IMMUNIZATION: {
    label: "Immunizations",
    icon: Activity,
    color: "text-destructive",
    friendlyName: "Vaccine Administered",
  },
  ADMISSION: {
    label: "Admissions",
    icon: User,
    color: "text-destructive",
    friendlyName: "Hospital Admission",
  },
  MEDICATION_DOSE: {
    label: "Doses",
    icon: Heart,
    color: "text-success",
    friendlyName: "Medication Dose",
  },
};

type VitalsMetadata = {
  bp?: string | null;
  pulse?: number | null;
  temp?: number | null;
  spo2?: number | null;
  weight?: number | null;
  height?: number | null;
};

type MedicationMetadata = {
  name: string;
  dosage?: string | null;
  frequency?: string | null;
};

type DiagnosisMetadata = {
  code?: string | null;
  description?: string | null;
  isPrimary?: boolean;
};

export interface VisitCardProps {
  event: TimelineEvent;
  mode: "full" | "compact" | "portal";
  defaultExpanded?: boolean;
}

const capitalizeFirstLetter = (value?: string | null): string => {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

function medicationSummaryLine(meds: MedicationMetadata[]): string {
  if (!meds.length) return "";
  const names = meds.map((m) => m.name).filter(Boolean);
  if (!names.length) return "";
  const head = names.slice(0, 2).join(", ");
  const extra = names.length > 2 ? ` +${names.length - 2}` : "";
  return `Meds: ${head}${extra}`;
}

export function VisitCard({ event, mode, defaultExpanded = false }: VisitCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const config = EVENT_TYPE_CONFIG[event.type];
  const Icon = config.icon;
  const canExpand = mode !== "compact";

  const dateStr = (() => {
    const d = new Date(event.date);
    if (mode === "compact") return formatDate(d, "d MMM");
    if (mode === "portal") return formatDate(d, "EEEE, d MMMM yyyy");
    return formatDate(d, "EEE, d MMM yyyy");
  })();

  const meta = event.metadata as Record<string, unknown>;
  const doctorName = meta?.doctorName as string | null | undefined;
  const consultationId = meta?.consultationId as string | null | undefined;
  const vitals = meta?.vitals as VitalsMetadata | null | undefined;
  const medications = (meta?.medications ?? []) as MedicationMetadata[];
  const diagnoses = (meta?.diagnoses ?? []) as DiagnosisMetadata[];
  const treatmentPlan = meta?.treatmentPlan as string | null | undefined;
  const observations = meta?.observations as string | null | undefined;
  const primaryDiagnosis = diagnoses.find((d) => d.isPrimary) ?? diagnoses[0];
  const displayTitle = capitalizeFirstLetter(event.title);
  const displayPrimaryDiagnosis = capitalizeFirstLetter(
    primaryDiagnosis?.description ?? null,
  );
  const displayEventDescription = capitalizeFirstLetter(event.description);

  const statusBadge = meta?.status as string | null | undefined;
  const statusKey = (statusBadge ?? "").toLowerCase().replace(/_/g, "-");
  const isFutureAppointment =
    event.type === "APPOINTMENT" && new Date(event.date).getTime() > Date.now();
  const consultationHref = consultationId
    ? `/consultation/${consultationId}?from=patient`
    : `/consultation/${event.id}?from=patient`;
  const hasConsultation =
    Boolean(consultationId) ||
    statusKey.includes("in-progress") ||
    statusKey.includes("completed");

  const appointmentAction = (() => {
    if (event.type !== "APPOINTMENT" || mode !== "full") return null;
    if (isFutureAppointment) {
      return {
        label: "View appointment",
        href: `/appointments?id=${event.id}`,
        variant: "default" as const,
        disabled: false,
      };
    }
    if (statusKey.includes("in-progress") || statusKey.includes("in progress")) {
      return {
        label: "Edit consultation",
        href: `/consultation/${event.id}?from=patient`,
        variant: "default" as const,
        disabled: false,
      };
    }
    if (statusKey.includes("completed")) {
      return {
        label: "View consultation",
        href: `/consultation/${event.id}?from=patient`,
        variant: "outline" as const,
        disabled: false,
      };
    }
    return {
      label: "Start consultation",
      href: `/consultation/${event.id}?from=patient`,
      variant: "default" as const,
      disabled: false,
    };
  })();
  const consultationAction =
    event.type === "APPOINTMENT" &&
    mode === "full" &&
    appointmentAction?.label !== "View consultation"
      ? {
          label: "View consultation",
          href: hasConsultation ? consultationHref : undefined,
          variant: "default" as const,
          disabled: !hasConsultation,
        }
      : null;
  const typeLabel = mode === "portal" ? config.friendlyName : config.label.slice(0, -1);

  if (mode === "compact") {
    return (
      <div className="relative pl-6 pb-4 last:pb-0">
        <div className="absolute left-0 top-1 h-4 w-4 rounded-full border bg-muted flex items-center justify-center">
          <Icon className={cn("h-2.5 w-2.5", config.color)} />
        </div>
        <div className="flex items-start justify-between gap-1">
          <p
            className="text-xs font-medium truncate leading-tight"
            title={displayTitle}
          >
            {displayTitle}
          </p>
          <span className="text-[var(--fs-2xs)] text-muted-foreground shrink-0">{dateStr}</span>
        </div>
        {event.type === "APPOINTMENT" && (() => {
          const medLine = medicationSummaryLine(medications);
          const summaryParts = [
            displayPrimaryDiagnosis,
            medLine,
          ].filter((s): s is string => Boolean(s && s.trim()));
          if (summaryParts.length > 0) {
            return (
              <p className="text-[var(--fs-2xs)] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                {summaryParts.join(" · ")}
              </p>
            );
          }
          if (doctorName) {
            return (
              <p className="text-[var(--fs-2xs)] text-muted-foreground mt-0.5 truncate">
                Dr. {doctorName}
              </p>
            );
          }
          return null;
        })()}
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "transition-shadow",
        canExpand && "cursor-pointer hover:shadow-sm",
      )}
      onClick={canExpand ? () => setExpanded((v) => !v) : undefined}
    >
      <CardContent className="p-3">
        <div className="flex gap-3">
          <div className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-muted">
            <Icon className={cn("h-4 w-4", config.color)} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium truncate text-sm">{displayTitle}</p>
              <div className="flex items-center gap-1.5 shrink-0">
                {appointmentAction &&
                  (appointmentAction.href ? (
                    <Button
                      asChild
                      size="sm"
                      variant={appointmentAction.variant}
                      className="h-9 px-3 text-xs font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link href={appointmentAction.href}>
                        {appointmentAction.label}
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant={appointmentAction.variant}
                      className="h-9 px-3 text-xs font-medium"
                      disabled={appointmentAction.disabled}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {appointmentAction.label}
                    </Button>
                  ))}
                {consultationAction &&
                  (consultationAction.href ? (
                    <Button
                      asChild
                      size="sm"
                      variant={consultationAction.variant}
                      className="h-9 px-3 text-xs font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link href={consultationAction.href}>
                        {consultationAction.label}
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant={consultationAction.variant}
                      className="h-9 px-3 text-xs font-medium"
                      disabled={consultationAction.disabled}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {consultationAction.label}
                    </Button>
                  ))}
                <span className="text-xs text-muted-foreground">{dateStr}</span>
                {canExpand && (
                  expanded
                    ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <Badge variant="outline" className="text-xs h-4 px-1.5">
                {typeLabel}
              </Badge>
              {statusBadge && (
              <Badge variant="secondary" className="text-xs h-4 px-1.5">
                  {humanizeUiLabel(statusBadge)}
                </Badge>
              )}
              {event.type === "APPOINTMENT" && doctorName && (
                <span className="text-xs text-muted-foreground">Dr. {doctorName}</span>
              )}
              {event.type === "APPOINTMENT" && displayPrimaryDiagnosis && (
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                  &middot; {displayPrimaryDiagnosis}
                </span>
              )}
            </div>

            {expanded && (
              <div className="mt-3 space-y-3 border-t pt-3">
                {event.type === "APPOINTMENT" && (
                  <>
                    {vitals && Object.values(vitals).some(Boolean) && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Vitals</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                          {vitals.bp && (
                            <span className="text-xs">
                              <span className="text-muted-foreground">BP: </span>
                              {vitals.bp} mmHg
                            </span>
                          )}
                          {vitals.pulse && (
                            <span className="text-xs">
                              <span className="text-muted-foreground">HR: </span>
                              {vitals.pulse} bpm
                            </span>
                          )}
                          {vitals.temp && (
                            <span className="text-xs">
                              <span className="text-muted-foreground">Temp: </span>
                              {vitals.temp}&deg;C
                            </span>
                          )}
                          {vitals.spo2 && (
                            <span className="text-xs">
                              <span className="text-muted-foreground">SpO2: </span>
                              {vitals.spo2}%
                            </span>
                          )}
                          {vitals.weight && (
                            <span className="text-xs">
                              <span className="text-muted-foreground">Wt: </span>
                              {vitals.weight} kg
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {diagnoses.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Diagnoses</p>
                        <div className="flex flex-wrap gap-1">
                          {diagnoses.map((d, i) => (
                            <Badge
                              key={i}
                              variant={d.isPrimary ? "default" : "secondary"}
                              className="text-xs h-5"
                            >
                              {mode !== "portal" && d.code ? `${d.code} · ` : ""}
                              {d.description ?? d.code}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {medications.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Medications</p>
                        <div className="space-y-0.5">
                          {medications.map((m, i) => (
                            <p key={i} className="text-xs">
                              <span className="font-medium">{m.name}</span>
                              {m.dosage && (
                                <span className="text-muted-foreground"> &middot; {m.dosage}</span>
                              )}
                              {m.frequency && (
                                <span className="text-muted-foreground"> &middot; {m.frequency}</span>
                              )}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {treatmentPlan && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Treatment Plan</p>
                        <p className="text-xs text-muted-foreground">{treatmentPlan}</p>
                      </div>
                    )}

                    {observations && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Observations</p>
                        <p className="text-xs text-muted-foreground">{observations}</p>
                      </div>
                    )}
                  </>
                )}

                {event.type === "PRESCRIPTION" && medications.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Medications</p>
                    <div className="space-y-0.5">
                      {medications.map((m, i) => (
                        <p key={i} className="text-xs">
                          <span className="font-medium">{m.name}</span>
                          {m.dosage && (
                            <span className="text-muted-foreground"> &middot; {m.dosage}</span>
                          )}
                          {m.frequency && (
                            <span className="text-muted-foreground"> &middot; {m.frequency}</span>
                          )}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {event.type !== "APPOINTMENT" && event.type !== "PRESCRIPTION" && displayEventDescription && (
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
