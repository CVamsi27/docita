"use client";

import {
  Card,
  CardContent,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@workspace/ui/components";
import { AlertCircle } from "lucide-react";
import type { PatientSnapshot } from "@workspace/types";
import { formatDate } from "@/lib/formatters";
import {
  VerticalSnapshotContent,
  HorizontalSnapshotContent,
} from "./PatientSnapshotStripSections";

export { ALLERGY_SEVERITY_COLOR } from "./PatientSnapshotStripSections";

interface PatientSnapshotStripProps {
  snapshot: PatientSnapshot;
  layout: "horizontal" | "vertical";
  showVitals?: boolean;
  compact?: boolean;
}
export function PatientSnapshotStrip({
  snapshot,
  layout,
  showVitals = false,
  compact = false,
}: PatientSnapshotStripProps) {
  const { activeConditions, activeAllergies, activeMedications, latestVitals } =
    snapshot;
  if (layout === "vertical")
    return (
      <div className="space-y-4">
        <VerticalSnapshotContent
          activeAllergies={activeAllergies}
          activeConditions={activeConditions}
          activeMedications={activeMedications}
        />
      </div>
    );
  return (
    <Card>
      <CardContent className={compact ? "p-3" : "p-4"}>
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
                <TooltipContent>Clinical Snapshot</TooltipContent>
              </Tooltip>
            </div>
            {!compact ? (
              <p className="text-xs text-muted-foreground mt-0.5">
                This strip updates whenever the chart changes.
              </p>
            ) : null}
          </div>
          {showVitals && latestVitals?.recordedAt ? (
            <p className="text-[var(--fs-2xs)] text-muted-foreground shrink-0">
              Updated from vitals recorded on{" "}
              {formatDate(latestVitals.recordedAt)}
            </p>
          ) : null}
        </div>
        <HorizontalSnapshotContent
          activeConditions={activeConditions}
          activeAllergies={activeAllergies}
          activeMedications={activeMedications}
          latestVitals={latestVitals}
          showVitals={showVitals}
          compact={compact}
        />
      </CardContent>
    </Card>
  );
}