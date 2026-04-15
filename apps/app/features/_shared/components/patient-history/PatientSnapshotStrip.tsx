"use client";

import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
} from "@workspace/ui/components/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { AlertCircle, AlertTriangle, Heart, Pill } from "lucide-react";
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
  const { activeConditions, activeAllergies, activeMedications, latestVitals } = snapshot;

  if (layout === "vertical") {
    return (
      <div className="space-y-4">
        {(activeAllergies.length > 0) && (
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
                    ALLERGY_SEVERITY_COLOR[a.severity] ?? "bg-muted text-muted-foreground",
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
                <div key={m.medicationId} className="flex items-center justify-between text-xs">
                  <span className="truncate font-medium">{m.name}</span>
                  <span className="text-muted-foreground shrink-0 ml-2">
                    {m.dosage}
                    {m.isPRN && " (PRN)"}
                  </span>
                </div>
              ))}
              {activeMedications.length > 4 && (
                <p className="text-xs text-muted-foreground">+{activeMedications.length - 4} more</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
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
                  Updated from active conditions, allergies, medications, and the latest recorded
                  vitals.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Quick view of key clinical details for this patient.
            </p>
          </div>
          {showVitals && latestVitals?.recordedAt ? (
            <p className="text-[11px] text-muted-foreground shrink-0">
              Vitals as of {new Date(latestVitals.recordedAt).toLocaleDateString()}
            </p>
          ) : null}
        </div>

        <div
          className={cn(
            "mt-3 grid gap-2",
            showVitals ? "grid-cols-1 md:grid-cols-4" : "grid-cols-1 md:grid-cols-3",
          )}
        >
          <div className="rounded-md border bg-muted/20 px-2.5 py-2">
            <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" />
              Conditions
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {activeConditions.length === 0 ? (
                <span className="text-xs text-muted-foreground">None recorded</span>
              ) : (
                <>
                  {activeConditions.slice(0, 4).map((c) => (
                    <Badge key={c.id} variant="secondary" className="text-xs h-5">
                      {c.conditionName}
                    </Badge>
                  ))}
                  {activeConditions.length > 4 && (
                    <Badge variant="outline" className="text-xs h-5">
                      +{activeConditions.length - 4}
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="rounded-md border bg-muted/20 px-2.5 py-2">
            <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Allergies
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {activeAllergies.length === 0 ? (
                <span className="text-xs text-muted-foreground">No known allergies</span>
              ) : (
                <>
                  {activeAllergies.slice(0, 4).map((a) => (
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
                  {activeAllergies.length > 4 && (
                    <Badge variant="outline" className="text-xs h-5">
                      +{activeAllergies.length - 4}
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="rounded-md border bg-muted/20 px-2.5 py-2">
            <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Pill className="h-3.5 w-3.5" />
              Current Medications
            </p>
            <div className="mt-1 space-y-0.5">
              {activeMedications.length === 0 ? (
                <span className="text-xs text-muted-foreground">None active</span>
              ) : (
                <>
                  {activeMedications.slice(0, 2).map((m) => (
                    <div key={m.medicationId} className="min-w-0">
                      <p className="text-xs font-medium truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {m.dosage}
                        {m.frequency ? ` · ${m.frequency}` : ""}
                        {m.isPRN && " (PRN)"}
                      </p>
                    </div>
                  ))}
                  {activeMedications.length > 2 && (
                    <p className="text-xs text-muted-foreground">
                      +{activeMedications.length - 2} more
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {showVitals && (
            <div className="rounded-md border bg-muted/20 px-2.5 py-2">
              <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" />
                Latest Vitals
              </p>
              {!latestVitals ? (
                <p className="mt-1 text-xs text-muted-foreground">No vitals recorded</p>
              ) : (
                <div className="mt-1 space-y-0.5">
                  {latestVitals.systolicBP && latestVitals.diastolicBP && (
                    <p className="text-xs">
                      <span className="text-muted-foreground">BP: </span>
                      {latestVitals.systolicBP}/{latestVitals.diastolicBP} mmHg
                    </p>
                  )}
                  {latestVitals.pulse && (
                    <p className="text-xs">
                      <span className="text-muted-foreground">HR: </span>
                      {latestVitals.pulse} bpm
                    </p>
                  )}
                  {latestVitals.temperature && (
                    <p className="text-xs">
                      <span className="text-muted-foreground">Temp: </span>
                      {latestVitals.temperature}&deg;C
                    </p>
                  )}
                  {latestVitals.spo2 && (
                    <p className="text-xs">
                      <span className="text-muted-foreground">SpO2: </span>
                      {latestVitals.spo2}%
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
