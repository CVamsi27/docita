"use client";

import { useMemo } from "react";
import type { Appointment } from "@workspace/types";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { ChevronRight, History } from "lucide-react";
import { PatientSnapshotStrip } from "@/features/_shared/components/patient-history";
import { usePatientSnapshot } from "@/hooks/api/use-patient-timeline";
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

  const recentAppointments = useMemo(() => {
    const nowMs = Date.now();
    return [...appointments]
      .filter((a) => includeInRecentVisits(a, nowMs))
      .sort((a, b) => toStartMs(b.startTime) - toStartMs(a.startTime))
      .slice(0, 5);
  }, [appointments]);

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
          {recentAppointments.length > 0 ? (
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
          {recentAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No visits to show here yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentAppointments.map((a) => {
                const label = a.startTime
                  ? formatLocaleDateShortMonthYear(a.startTime, "en-IN")
                  : "";
                const snippet = a.chiefComplaint ?? a.notes ?? null;
                return (
                  <li
                    key={a.id}
                    className="border-b border-border/60 pb-2 text-sm last:border-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-foreground">{label}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {humanizeUiLabel(a.status)}
                      </span>
                    </div>
                    {a.type ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {humanizeUiLabel(a.type)}
                      </p>
                    ) : null}
                    {snippet ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {snippet}
                      </p>
                    ) : null}
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
