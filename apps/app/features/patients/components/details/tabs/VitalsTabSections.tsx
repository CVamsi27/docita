"use client";

import { useState, type ComponentType } from "react";
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
import { PatientMetricsHistoryUI } from "@/features/patients/components/details/PatientMetricsHistoryUI";

export interface VitalsRow {
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

export const formatVitalNumber = (
  value: number | null | undefined,
  suffix = "",
): string =>
  value === null || value === undefined ? "--" : `${value}${suffix}`;

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

interface LatestVitalsCardProps {
  latest: {
    date: Date | string;
    vitals: {
      bloodPressure?: string | null;
      pulse?: number | null;
      temperature?: number | null;
      spo2?: number | null;
      weight?: number | null;
      height?: number | null;
      bmi?: number | null;
    };
  } | null;
  latestDateLabel: string | null;
  latestBmi: number | null;
  bmiStatus: { label: string; color: string } | null;
}

export function LatestVitalsCard({
  latest,
  latestDateLabel,
  latestBmi,
  bmiStatus,
}: LatestVitalsCardProps) {
  return (
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
            <VitalCell icon={Activity} label="BP" value={latest.vitals.bloodPressure ?? "--/--"} unit="mmHg" />
            <VitalCell icon={Heart} label="Pulse" value={formatVitalNumber(latest.vitals.pulse)} unit="bpm" />
            <VitalCell icon={Activity} label="SpO2" value={formatVitalNumber(latest.vitals.spo2)} unit="%" />
            <VitalCell icon={Thermometer} label="Temp" value={formatVitalNumber(latest.vitals.temperature)} unit={"\u00b0C"} />
            <VitalCell icon={Weight} label="Weight" value={formatVitalNumber(latest.vitals.weight)} unit="kg" />
            <VitalCell icon={Activity} label="BMI" value={latestBmi !== null ? String(latestBmi) : "--"} secondary={bmiStatus?.label ?? undefined} />
          </div>
        ) : (
          <DataState status="empty" emptyIcon={Heart} emptyTitle="No vitals recorded" emptyDescription="Vitals captured during a visit will appear here." />
        )}
      </CardContent>
    </Card>
  );
}

interface VitalsHistoryTableProps {
  rows: VitalsRow[];
}

export function VitalsHistoryTable({ rows }: VitalsHistoryTableProps) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Vitals history</CardTitle>
        </CardHeader>
        <CardContent>
          <DataState status="empty" emptyIcon={Activity} emptyTitle="No vitals history" emptyDescription="Vitals captured during a visit will be listed here." />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Vitals history</CardTitle>
      </CardHeader>
      <CardContent>
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
                  <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{formatDate(row.date, "d MMM yyyy")}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.bp ?? "--"}</td>
                  <td className="py-2 pr-3 tabular-nums">{formatVitalNumber(row.pulse)}</td>
                  <td className="py-2 pr-3 tabular-nums">{formatVitalNumber(row.temperature)}</td>
                  <td className="py-2 pr-3 tabular-nums">{formatVitalNumber(row.spo2)}</td>
                  <td className="py-2 pr-3 tabular-nums">{formatVitalNumber(row.weight)}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.bmi !== null ? row.bmi : "--"}</td>
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
      </CardContent>
    </Card>
  );
}

interface AdvancedMetricTrackingProps {
  patientId: string;
  canRecordPatientVitals: boolean;
}

export function AdvancedMetricTracking({
  patientId,
  canRecordPatientVitals,
}: AdvancedMetricTrackingProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
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
  );
}
