"use client";

import { Card, CardContent } from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/overlay/collapsible";
import { Clock, ChevronDown, User, X } from "lucide-react";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import { cn } from "@workspace/ui/lib/utils";
import {
  PatientFamilyHistory,
  PatientSurgicalHistory,
  PatientTimelineResponse,
} from "@workspace/types";
import { PatientTimeline } from "@/components/patient-history/PatientTimeline";
import { formatGenderLabel } from "@/lib/formatters";

/** The "no patient data" placeholder shown when the sidebar has nothing to render — split out as its own self-contained piece independent of the populated-state sections below it. */
export function ConsultationSidebarEmptyState() {
  return (
    <Card className="ui-card-surface h-full">
      <CardContent className="flex h-full items-center justify-center py-8 text-muted-foreground">
        <User className="h-6 w-6 mr-2 opacity-30" />
        <span>No patient data</span>
      </CardContent>
    </Card>
  );
}

interface ConsultationSidebarHeaderProps {
  initials: string;
  patientName: string;
  age?: string;
  gender?: string | null;
  mrn?: string | null;
  onClose?: () => void;
}

/** The avatar/name/meta/close-button strip atop the sidebar — split out as its own self-contained header independent of the sections below it. */
export function ConsultationSidebarHeader({
  initials,
  patientName,
  age,
  gender,
  mrn,
  onClose,
}: ConsultationSidebarHeaderProps) {
  return (
    <div className="ui-card-surface relative flex items-center gap-4 p-4 group">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/5 text-lg font-bold text-primary">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-bold truncate">{patientName}</h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{age}</span>
          {gender && <span>&middot; {formatGenderLabel(gender)}</span>}
          {mrn && <span>&middot; MRN: {mrn}</span>}
        </div>
      </div>
      {onClose && (
        <SymbolTooltip label="Close sidebar">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        </SymbolTooltip>
      )}
    </div>
  );
}

interface ConsultationSidebarHistoryTimelineProps {
  timelineData: PatientTimelineResponse;
}

/** The "History" label plus compact timeline (or its empty state) — split out as its own self-contained section independent of the header above it. */
export function ConsultationSidebarHistoryTimeline({
  timelineData,
}: ConsultationSidebarHistoryTimelineProps) {
  return (
    <div className="space-y-2">
      <MicroLabel className="flex items-center gap-1.5 text-muted-foreground">
        <Clock className="h-3 w-3" aria-hidden="true" />
        History
        {timelineData.total > 0 ? (
          <span className="font-normal normal-case">
            ({timelineData.total})
          </span>
        ) : null}
      </MicroLabel>
      {timelineData.events.length === 0 ? (
        <p className="text-xs text-muted-foreground py-1">No previous visits</p>
      ) : (
        <PatientTimeline
          mode="compact"
          events={timelineData.events}
          summary={timelineData.summary}
          total={timelineData.total}
        />
      )}
    </div>
  );
}

interface SurgicalHistoryListProps {
  items: PatientSurgicalHistory[];
}

/** The surgical-history list — split out as its own self-contained piece independent of the family-history list beside it. */
export function SurgicalHistoryList({ items }: SurgicalHistoryListProps) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <MicroLabel className="text-muted-foreground">
        Surgical history
      </MicroLabel>
      <ul className="space-y-1">
        {items.map((s, i) => (
          <li key={i} className="text-xs grid grid-cols-[1fr_auto] gap-2">
            <span>{s.procedureName}</span>
            {s.procedureDate && (
              <span className="text-muted-foreground">
                {new Date(s.procedureDate).getFullYear()}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface FamilyHistoryListProps {
  items: PatientFamilyHistory[];
}

/** The family-history list — split out as its own self-contained piece independent of the surgical-history list beside it. */
export function FamilyHistoryList({ items }: FamilyHistoryListProps) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <MicroLabel className="text-muted-foreground">Family history</MicroLabel>
      <ul className="space-y-1">
        {items.map((h, i) => (
          <li key={i} className="text-xs grid grid-cols-[1fr_auto] gap-2">
            <span>{h.condition}</span>
            <span className="text-muted-foreground italic">
              {h.relationship}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ConsultationSidebarStructuredHistoryProps {
  surgicalHistory: PatientSurgicalHistory[];
  familyHistory: PatientFamilyHistory[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** The collapsible "Full structured history" disclosure composing the surgical/family lists — split out as its own self-contained section independent of the timeline above it. */
export function ConsultationSidebarStructuredHistory({
  surgicalHistory,
  familyHistory,
  open,
  onOpenChange,
}: ConsultationSidebarStructuredHistoryProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-full justify-between text-xs font-semibold"
        >
          Full structured history
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
            aria-hidden="true"
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-3">
        <SurgicalHistoryList items={surgicalHistory} />
        <FamilyHistoryList items={familyHistory} />
      </CollapsibleContent>
    </Collapsible>
  );
}
