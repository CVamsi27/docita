"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Appointment } from "@workspace/types";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import {
  ChevronRight,
  History,
  Pill,
  Stethoscope,
} from "lucide-react";
import { PatientSnapshotStrip } from "@/components/patient-history";
import { parseVisitCardMetadata } from "@/components/patient-history/visit-card-config";
import { usePatientSnapshot, usePatientTimeline } from "@workspace/data-access";
import { formatLocaleDateShortMonthYear } from "@/lib/formatters";

function toStartMs(value: string | Date | undefined): number {
  if (!value) return 0;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isFinite(d.getTime()) ? d.getTime() : 0;
}

function includeInRecentVisits(a: Appointment, nowMs: number): boolean {
  if (a.status === "cancelled") return false;
  const t = toStartMs(a.startTime);
  if (!t) return false;
  if (a.status === "completed" || a.status === "no-show") return true;
  if (a.status === "in-progress") return true;
  if (
    t <= nowMs &&
    (a.status === "scheduled" ||
      a.status === "confirmed" ||
      a.status === "checked-in")
  ) {
    return true;
  }
  return false;
}

export interface PatientClinicalChartSummaryProps {
  patientId: string;
  appointments: Appointment[];
  onSeeAllVisits: () => void;
}

export function PatientClinicalChartSummary({
  patientId,
  appointments,
  onSeeAllVisits,
}: PatientClinicalChartSummaryProps) {
  const { data: snapshot } = usePatientSnapshot(patientId);
  const { data: timeline } = usePatientTimeline(patientId, {
    eventTypes: ["APPOINTMENT"],
    limit: 5,
    offset: 0,
  });

  const appointmentMeta = useMemo(() => {
    const map = new Map<string, Appointment>();
    for (const a of appointments) {
      if (a.id) map.set(a.id, a);
    }
    return map;
  }, [appointments]);

  // Prefer timeline events (rich diagnosis + Rx metadata). Fall back to raw
  // appointments while the timeline query is still loading.
  const recentRows = useMemo(() => {
    if (timeline?.events?.length) {
      return timeline.events.slice(0, 5).map((event) => {
        const meta = parseVisitCardMetadata(event.metadata);
        const apt = appointmentMeta.get(event.id);
        const primaryDiagnosis =
          meta.diagnoses.find((d) => d.isPrimary) ?? meta.diagnoses[0] ?? null;
        const status = (meta.status ?? apt?.status ?? "").toLowerCase();
        return {
          id: event.id,
          consultationId: meta.consultationId ?? event.id,
          dateLabel: formatLocaleDateShortMonthYear(event.date),
          status,
          type: apt?.type ?? null,
          doctorName: meta.doctorName ?? null,
          chiefComplaint:
            apt?.chiefComplaint ?? apt?.notes ?? event.description ?? null,
          primaryDiagnosis: primaryDiagnosis?.description ?? null,
          rxCount: meta.medications.length,
        };
      });
    }

    // Fallback while timeline loads — same shape, fewer fields populated.
    const nowMs = Date.now();
    return [...appointments]
      .filter((a) => includeInRecentVisits(a, nowMs))
      .sort((a, b) => toStartMs(b.startTime) - toStartMs(a.startTime))
      .slice(0, 5)
      .map((a) => ({
        id: a.id ?? "",
        consultationId: a.id ?? "",
        dateLabel: a.startTime ? formatLocaleDateShortMonthYear(a.startTime) : "",
        status: (a.status ?? "").toLowerCase(),
        type: a.type ?? null,
        doctorName: null,
        chiefComplaint: a.chiefComplaint ?? a.notes ?? null,
        primaryDiagnosis: null,
        rxCount: 0,
      }));
  }, [timeline, appointments, appointmentMeta]);

  return (
    <div
      className="mb-6 space-y-4"
      data-testid="patient-clinical-chart-summary"
    >
      {snapshot ? (
        <PatientSnapshotStrip
          snapshot={snapshot}
          layout="horizontal"
          showVitals
        />
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <History className="h-4 w-4 text-primary" aria-hidden />
            Recent visits
          </CardTitle>
          {recentRows.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="h-8 shrink-0 gap-1 text-xs"
              onClick={onSeeAllVisits}
            >
              See all
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="pt-0">
          {recentRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No visits to show here yet.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {recentRows.map((row) => {
                const isTerminal =
                  row.status === "completed" || row.status === "no-show";
                const isInProgress = row.status === "in-progress";
                const statusBadgeClass = isInProgress
                  ? "badge-info"
                  : isTerminal
                    ? "badge-muted"
                    : "badge-muted";
                const href = row.consultationId
                  ? `/consultation/${row.consultationId}?from=patient`
                  : null;

                const content = (
                  <div className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {row.dateLabel}
                        </span>
                        {row.type ? (
                          <span className="text-xs text-muted-foreground">
                            {humanizeUiLabel(row.type)}
                          </span>
                        ) : null}
                        {row.doctorName ? (
                          <span className="text-xs text-muted-foreground">
                            · Dr. {row.doctorName}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {row.primaryDiagnosis ? (
                          <Badge
                            variant="secondary"
                            className="badge-info gap-1 text-[length:var(--fs-2xs)]"
                          >
                            <Stethoscope className="h-3 w-3" aria-hidden />
                            <span className="max-w-[200px] truncate">
                              {row.primaryDiagnosis}
                            </span>
                          </Badge>
                        ) : null}
                        {row.rxCount > 0 ? (
                          <Badge
                            variant="secondary"
                            className="badge-success gap-1 text-[length:var(--fs-2xs)]"
                          >
                            <Pill className="h-3 w-3" aria-hidden />
                            {row.rxCount} Rx
                          </Badge>
                        ) : null}
                      </div>
                      {row.chiefComplaint ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {row.chiefComplaint}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`text-[length:var(--fs-2xs)] capitalize ${statusBadgeClass}`}
                      >
                        {humanizeUiLabel(row.status || "scheduled")}
                      </Badge>
                      {href ? (
                        <ChevronRight
                          className="h-4 w-4 text-muted-foreground"
                          aria-hidden
                        />
                      ) : null}
                    </div>
                  </div>
                );

                return (
                  <li key={row.id || row.dateLabel}>
                    {href ? (
                      <Link
                        href={href}
                        className="block rounded-md px-1 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div className="px-1">{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
