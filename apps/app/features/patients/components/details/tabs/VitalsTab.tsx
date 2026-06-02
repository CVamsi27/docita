"use client";

import { useMemo, useState, type ComponentType } from "react";
import { formatDate } from "@workspace/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Heart,
  Settings2,
  Thermometer,
  Weight,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import type { Appointment } from "@workspace/types";
import {
  calculateBMI,
  getBMIStatus,
  getLatestVitals,
} from "@/features/patients/rules/vitals-rules";
import { PatientMetricsHistoryUI } from "@/features/patients/components/details/PatientMetricsHistoryUI";

interface VitalsTabProps {
  patientId: string;
  appointments: Appointment[];
  canRecordPatientVitals: boolean;
}

interface VitalsRow {
  id: string;
  date: Date;
  bp: string | null;
  pulse: number | null;
  temperature: number | null;
  spo2: number | null;
  weight: number | null;
  height: number | null;
  bmi: number | null;
}

const formatNumber = (value: number | null | undefined, suffix = ""): string =>
  value === null || value === undefined ? "--" : `${value}${suffix}`;

export function VitalsTab({
  patientId,
  appointments,
  canRecordPatientVitals,
}: VitalsTabProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const latest = useMemo(() => getLatestVitals(appointments), [appointments]);
  const latestBmi =
    latest?.vitals.bmi ??
    (latest?.vitals.weight && latest?.vitals.height
      ? calculateBMI(latest.vitals.weight, latest.vitals.height)
      : null);
  const bmiStatus = getBMIStatus(latestBmi);
  const latestDateLabel = latest
    ? formatDate(latest.date, "EEE, d MMM yyyy")
    : null;

  const rows = useMemo<VitalsRow[]>(() => {
    const out: VitalsRow[] = [];
    appointments.forEach((appt) => {
      if (!appt.vitalSign || !appt.id) return;
      const v = appt.vitalSign;
      const startTime =
        typeof appt.startTime === "string"
          ? new Date(appt.startTime)
          : appt.startTime;
      if (!Number.isFinite(startTime.getTime())) return;
      out.push({
        id: appt.id,
        date: startTime,
        bp: v.bloodPressure ?? null,
        pulse: v.pulse ?? null,
        temperature: v.temperature ?? null,
        spo2: v.spo2 ?? null,
        weight: v.weight ?? null,
        height: v.height ?? null,
        bmi:
          v.bmi ??
          (v.weight && v.height ? calculateBMI(v.weight, v.height) : null),
      });
    });
    return out.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [appointments]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Latest vitals
            </CardTitle>
            {latestDateLabel && (
              <span className="text-xs text-muted-foreground">
                Recorded {latestDateLabel}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {latest ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <VitalCell
                icon={Activity}
                label="BP"
                value={latest.vitals.bloodPressure ?? "--/--"}
                unit="mmHg"
              />
              <VitalCell
                icon={Heart}
                label="Pulse"
                value={formatNumber(latest.vitals.pulse)}
                unit="bpm"
              />
              <VitalCell
                icon={Thermometer}
                label="Temp"
                value={formatNumber(latest.vitals.temperature)}
                unit="\u00b0C"
              />
              <VitalCell
                icon={Activity}
                label="SpO2"
                value={formatNumber(latest.vitals.spo2)}
                unit="%"
              />
              <VitalCell
                icon={Weight}
                label="Weight"
                value={formatNumber(latest.vitals.weight)}
                unit="kg"
              />
              <VitalCell
                icon={Activity}
                label="BMI"
                value={latestBmi !== null ? String(latestBmi) : "--"}
                secondary={bmiStatus?.label}
              />
            </div>
          ) : (
            <DataState
              status="empty"
              emptyIcon={Heart}
              emptyTitle="No vitals recorded"
              emptyDescription="Vitals captured during a visit will appear here."
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Vitals history</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <DataState
              status="empty"
              emptyIcon={Activity}
              emptyTitle="No vitals history"
              emptyDescription="Vitals captured during a visit will be listed here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground border-b">
                  <tr className="text-left">
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 pr-3 font-medium">BP</th>
                    <th className="py-2 pr-3 font-medium">Pulse</th>
                    <th className="py-2 pr-3 font-medium">Temp</th>
                    <th className="py-2 pr-3 font-medium">SpO2</th>
                    <th className="py-2 pr-3 font-medium">Weight</th>
                    <th className="py-2 pr-3 font-medium">BMI</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 12).map((row) => (
                    <tr key={row.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(row.date, "d MMM yyyy")}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {row.bp ?? "--"}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {formatNumber(row.pulse)}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {formatNumber(row.temperature)}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {formatNumber(row.spo2)}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {formatNumber(row.weight)}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {row.bmi !== null ? row.bmi : "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 12 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Showing latest 12 of {rows.length} entries.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-muted/20">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setShowAdvanced((v) => !v)}
          className="h-auto w-full justify-between gap-2 rounded-none px-4 py-3 text-sm font-medium"
        >
          <span className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            Advanced metric tracking
          </span>
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
        {showAdvanced && (
          <div className="border-t px-4 py-4">
            <PatientMetricsHistoryUI
              patientId={patientId}
              readOnly={!canRecordPatientVitals}
              categoryKey="vitals"
              title="Custom vitals tracking"
              emptyHistoryMessage="No custom vitals records yet."
              emptyDefinitionsMessage="Custom vitals fields will appear here once configured."
              showTracking={canRecordPatientVitals}
              showConfiguration={canRecordPatientVitals}
              showRecording={canRecordPatientVitals}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface VitalCellProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  unit?: string;
  secondary?: string;
}

function VitalCell({
  icon: Icon,
  label,
  value,
  unit,
  secondary,
}: VitalCellProps) {
  return (
    <div className={cn("rounded-lg border bg-card px-3 py-2.5")}>
      <p className="flex items-center gap-1 text-[var(--fs-2xs)] uppercase font-medium tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <div className="flex items-baseline gap-1 mt-1 flex-wrap">
        <span className="text-lg font-semibold tabular-nums leading-none">
          {value}
        </span>
        {unit && (
          <Badge
            variant="outline"
            className="text-[0.625rem] px-1 h-4 font-normal"
          >
            {unit}
          </Badge>
        )}
      </div>
      {secondary ? (
        <p className="mt-1 text-[0.625rem] text-muted-foreground leading-tight">
          {secondary}
        </p>
      ) : null}
    </div>
  );
}
