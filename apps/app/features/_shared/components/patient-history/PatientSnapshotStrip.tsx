"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import {
  AlertCircle,
  AlertTriangle,
  Heart,
  Pill,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import type { PatientSnapshot } from "@workspace/types";

export const ALLERGY_SEVERITY_COLOR: Record<string, string> = {
  LIFE_THREATENING: "bg-destructive/10 text-destructive border-destructive/20",
  SEVERE: "bg-destructive/10 text-destructive border-destructive/20",
  MODERATE: "bg-warning/10 text-warning border-warning/20",
  MILD: "bg-success/10 text-success border-success/20",
};

interface PatientSnapshotStripProps {
  snapshot: PatientSnapshot;
  layout: "horizontal" | "vertical";
  showVitals?: boolean;
}

export function PatientSnapshotStrip({
  snapshot,
  layout,
  showVitals = false,
}: PatientSnapshotStripProps) {
  const { activeConditions, activeAllergies, activeMedications, latestVitals } =
    snapshot;

  if (layout === "vertical") {
    return (
      <div className="space-y-4">
        {activeAllergies.length > 0 && (
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
              <AlertTriangle className="h-3 w-3" />
              Allergies
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {activeAllergies.map((a) => (
                <span
                  key={a.id}
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                    ALLERGY_SEVERITY_COLOR[a.severity] ??
                      "bg-muted text-muted-foreground",
                  )}
                >
                  {a.allergen}
                </span>
              ))}
            </div>
          </div>
        )}

        {activeConditions.length > 0 && (
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
              <Heart className="h-3 w-3" />
              Conditions
            </h3>
            <div className="flex flex-wrap gap-1">
              {activeConditions.map((c) => (
                <Badge key={c.id} variant="secondary" className="text-xs font-normal">
                  {c.conditionName}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {activeMedications.length > 0 && (
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
              <Pill className="h-3 w-3" />
              Current Medications
            </h3>
            <div className="space-y-1">
              {activeMedications.slice(0, 4).map((m) => (
                <div
                  key={m.medicationId}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="truncate font-medium">{m.name}</span>
                  <span className="text-muted-foreground shrink-0 ml-2">
                    {m.dosage}
                    {m.isPRN && " (PRN)"}
                  </span>
                </div>
              ))}
              {activeMedications.length > 4 && (
                <p className="text-xs text-muted-foreground">
                  +{activeMedications.length - 4} more
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Clinical Snapshot
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center text-muted-foreground hover:text-foreground"
                    aria-label="What is this?"
                  >
                    <AlertCircle className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  Pulled from active conditions, allergy history, current
                  medications, and the latest recorded vitals.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              This strip updates whenever the chart changes.
            </p>
          </div>
          {showVitals && latestVitals?.recordedAt ? (
            <p className="text-[11px] text-muted-foreground shrink-0">
              Updated from vitals recorded on{" "}
              {new Date(latestVitals.recordedAt).toLocaleDateString()}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-2 xl:flex-row xl:items-stretch xl:gap-2">
          <SnapshotCell
            icon={Heart}
            label="Conditions"
            value={
              activeConditions.length === 0
                ? "None recorded"
                : activeConditions.slice(0, 3).map((c) => c.conditionName).join(", ")
            }
            overflow={
              activeConditions.length > 3
                ? `+${activeConditions.length - 3} more`
                : undefined
            }
          />
          <SnapshotCell
            icon={AlertTriangle}
            label="Allergies"
            value={
              activeAllergies.length === 0
                ? "No known allergies"
                : activeAllergies.slice(0, 3).map((a) => a.allergen).join(", ")
            }
            overflow={
              activeAllergies.length > 3
                ? `+${activeAllergies.length - 3} more`
                : undefined
            }
          />
          <SnapshotCell
            icon={Pill}
            label="Current medications"
            value={
              activeMedications.length === 0
                ? "None active"
                : activeMedications
                    .slice(0, 2)
                    .map((m) => `${m.name}${m.dosage ? ` ${m.dosage}` : ""}`)
                    .join(" • ")
            }
            overflow={
              activeMedications.length > 2
                ? `+${activeMedications.length - 2} more`
                : undefined
            }
          />
          {showVitals && (
            <SnapshotCell
              icon={Heart}
              label="Latest vitals"
              value={
                latestVitals
                  ? [
                      latestVitals.systolicBP && latestVitals.diastolicBP
                        ? `${latestVitals.systolicBP}/${latestVitals.diastolicBP} mmHg`
                        : null,
                      latestVitals.pulse ? `${latestVitals.pulse} bpm` : null,
                      latestVitals.temperature
                        ? `${latestVitals.temperature}°C`
                        : null,
                      latestVitals.weight ? `${latestVitals.weight} kg` : null,
                      latestVitals.spo2 ? `${latestVitals.spo2}% SpO2` : null,
                    ]
                      .filter(Boolean)
                      .join(" • ") || "No vitals recorded"
                  : "No vitals recorded"
              }
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface SnapshotCellProps {
  icon: LucideIcon;
  label: string;
  value: string;
  overflow?: string;
}

function SnapshotCell({ icon: Icon, label, value, overflow }: SnapshotCellProps) {
  return (
    <div className="flex-1 rounded-lg border bg-muted/20 px-3 py-2">
      <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground leading-snug">
        {value}
      </p>
      {overflow ? <p className="mt-1 text-xs text-muted-foreground">{overflow}</p> : null}
    </div>
  );
}
