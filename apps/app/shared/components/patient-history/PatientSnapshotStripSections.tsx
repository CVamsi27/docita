"use client";

import { Badge } from "@workspace/ui/components/indicators/badge";
import {
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

interface VerticalSnapshotContentProps {
  activeAllergies: PatientSnapshot["activeAllergies"];
  activeConditions: PatientSnapshot["activeConditions"];
  activeMedications: PatientSnapshot["activeMedications"];
}

export function VerticalSnapshotContent({
  activeAllergies,
  activeConditions,
  activeMedications,
}: VerticalSnapshotContentProps) {
  return (
    <>
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
              <Badge
                key={c.id}
                variant="secondary"
                className="text-xs font-normal"
              >
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
    </>
  );
}

interface HorizontalSnapshotContentProps {
  activeConditions: PatientSnapshot["activeConditions"];
  activeAllergies: PatientSnapshot["activeAllergies"];
  activeMedications: PatientSnapshot["activeMedications"];
  latestVitals: PatientSnapshot["latestVitals"];
  showVitals?: boolean;
  compact?: boolean;
}

export function HorizontalSnapshotContent({
  activeConditions,
  activeAllergies,
  activeMedications,
  latestVitals,
  showVitals = false,
  compact = false,
}: HorizontalSnapshotContentProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 xl:flex-row xl:items-stretch xl:gap-2",
        compact ? "mt-2" : "mt-4",
      )}
    >
        <SnapshotCell
          icon={Heart}
          label="Conditions"
          value={
            activeConditions.length === 0
              ? "None recorded"
              : activeConditions
                  .slice(0, 3)
                  .map((c) => c.conditionName)
                  .join(", ")
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
              : activeAllergies
                  .slice(0, 3)
                  .map((a) => a.allergen)
                  .join(", ")
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
    </>
  );
}

interface SnapshotCellProps {
  icon: LucideIcon;
  label: string;
  value: string;
  overflow?: string;
}

export function SnapshotCell({
  icon: Icon,
  label,
  value,
  overflow,
}: SnapshotCellProps) {
  return (
    <div className="flex-1 rounded-lg border bg-muted/20 px-3 py-2">
      <p className="flex items-center gap-1 text-[var(--fs-2xs)] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground leading-snug">
        {value}
      </p>
      {overflow ? (
        <p className="mt-1 text-xs text-muted-foreground">{overflow}</p>
      ) : null}
    </div>
  );
}
