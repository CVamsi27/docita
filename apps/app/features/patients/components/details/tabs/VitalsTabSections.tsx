"use client";

// jscpd:ignore-start
import { useState, type ComponentType } from "react";
import { useTranslations } from "next-intl";
import { formatDate } from "@workspace/utils";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataState
} from "@workspace/ui/components";
import {
  Activity,
// jscpd:ignore-end
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

/**
 * Phase 3 (per-feature): apps/app Patient detail > Vitals tab
 * — the latest vitals card + the history table + the advanced
 * metric tracking section. 9 literals converted to
 * useTranslations("Patients.vitalsTab").
 */
function useVitalsTabTranslations() {
  return useTranslations("Patients.vitalsTab");
}

export function LatestVitalsCard({
  latest,
  latestDateLabel,
  latestBmi,
  bmiStatus,
}: LatestVitalsCardProps) {
  const t = useVitalsTabTranslations();
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            {t("latestVitalsTitle")}
          </CardTitle>
          {latestDateLabel && (
            <span className="text-xs text-muted-foreground">
              {t("recordedLabel", { date: latestDateLabel })}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {latest ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <VitalCell icon={Activity} label={t("bpLabel")} value={latest.vitals.bloodPressure ?? "--/--"} unit={t("unitMmHg")} />
            <VitalCell icon={Heart} label={t("pulseLabel")} value={formatVitalNumber(latest.vitals.pulse)} unit={t("unitBpm")} />
            <VitalCell icon={Activity} label={t("spo2Label")} value={formatVitalNumber(latest.vitals.spo2)} unit={t("unitPercent")} />
            <VitalCell icon={Thermometer} label={t("tempLabel")} value={formatVitalNumber(latest.vitals.temperature)} unit={t("unitCelsius")} />
            <VitalCell icon={Weight} label={t("weightLabel")} value={formatVitalNumber(latest.vitals.weight)} unit={t("unitKg")} />
            <VitalCell icon={Activity} label={t("bmiLabel")} value={latestBmi !== null ? String(latestBmi) : "--"} secondary={bmiStatus?.label ?? undefined} />
          </div>
        ) : (
          <DataState status="empty" emptyIcon={Heart} emptyTitle={t("emptyVitalsTitle")} emptyDescription={t("emptyVitalsDescription")} />
        )}
      </CardContent>
    </Card>
  );
}

interface VitalsHistoryTableProps {
  rows: VitalsRow[];
}

export function VitalsHistoryTable({ rows }: VitalsHistoryTableProps) {
  const t = useVitalsTabTranslations();
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("historyTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataState status="empty" emptyIcon={Activity} emptyTitle={t("emptyHistoryTitle")} emptyDescription={t("emptyHistoryDescription")} />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("historyTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground border-b">
              <tr className="text-left">
                <th className="py-2 pr-3 font-medium">{t("colDate")}</th>
                <th className="py-2 pr-3 font-medium">{t("bpLabel")}</th>
                <th className="py-2 pr-3 font-medium">{t("pulseLabel")}</th>
                <th className="py-2 pr-3 font-medium">{t("tempLabel")}</th>
                <th className="py-2 pr-3 font-medium">{t("spo2Label")}</th>
                <th className="py-2 pr-3 font-medium">{t("weightLabel")}</th>
                <th className="py-2 pr-3 font-medium">{t("bmiLabel")}</th>
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
              {t("historyFooter", { shown: 12, total: rows.length })}
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
  const t = useVitalsTabTranslations();
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
          {t("advancedMetricTrackingLabel")}
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
            title={t("customVitalsTitle")}
            emptyHistoryMessage={t("emptyCustomVitalsHistory")}
            emptyDefinitionsMessage={t("emptyCustomVitalsDefinitions")}
            showTracking={canRecordPatientVitals}
            showConfiguration={canRecordPatientVitals}
            showRecording={canRecordPatientVitals}
          />
        </div>
      )}
    </div>
  );
}
