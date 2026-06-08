"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, History } from "lucide-react";
import { PatientTimeline } from "@/components/patient-history/PatientTimeline";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import type { DataStateStatus } from "@workspace/ui/components/data-display/data-state";
import type {
  PatientTimelineResponse,
  TimelineEvent,
  TimelineEventType,
} from "@workspace/types";

interface PortalTimelineSectionProps {
  status: DataStateStatus;
  timeline?: PatientTimelineResponse;
  selectedTypes: TimelineEventType[];
  onTypeToggle: (type: TimelineEventType) => void;
  offset: number;
  limit: number;
  onLoadMore: () => void;
  onRetry: () => void;
}

/** The timeline's data-state + event list — split out as its own self-contained section, independent of the page chrome and the medical-history disclosure beside it. */
export function PortalTimelineSection({
  status,
  timeline,
  selectedTypes,
  onTypeToggle,
  offset,
  limit,
  onLoadMore,
  onRetry,
}: PortalTimelineSectionProps) {
  const events: TimelineEvent[] = timeline?.events ?? [];
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Timeline</h2>
      <DataState
        status={status}
        loadingMessage="Loading your timeline…"
        errorMessage="We could not load your health timeline. Please try again."
        onRetry={onRetry}
        emptyIcon={History}
        emptyTitle="No timeline records found"
        emptyDescription="Your appointments, prescriptions, and health events will appear here"
      >
        <PatientTimeline
          mode="portal"
          events={events}
          summary={timeline?.summary ?? {}}
          total={timeline?.total ?? 0}
          selectedTypes={selectedTypes}
          onTypeToggle={onTypeToggle}
          onLoadMore={onLoadMore}
          hasMore={timeline ? offset + limit < timeline.total : false}
          isLoading={false}
        />
      </DataState>
    </div>
  );
}

interface PortalMedicalHistoryListGroupProps {
  title: string;
  items: Record<string, unknown>[];
  renderItem: (item: Record<string, unknown>, index: number) => ReactNode;
}

/** One "title + list-or-none" group — the conditions, allergies, family-history, and surgical-history blocks were four near-identical copies of this exact shape (differing only in title, item list, and per-item render), so the shared shape is named once and parameterized instead of duplicated four times. */
function PortalMedicalHistoryListGroup({
  title,
  items,
  renderItem,
}: PortalMedicalHistoryListGroupProps) {
  return (
    <div>
      <h4 className="text-sm font-medium mb-2">{title}</h4>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">None</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item, index) => (
            <li key={index} className="text-sm">
              {renderItem(item, index)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface PortalMedicalHistoryData {
  conditions: Record<string, unknown>[];
  allergies: Record<string, unknown>[];
  familyHistory: Record<string, unknown>[];
  surgicalHistory: Record<string, unknown>[];
}

interface PortalMedicalHistoryPanelProps {
  medicalHistory: PortalMedicalHistoryData;
}

/** The collapsible "Medical History Details" disclosure — split out as its own self-contained panel that owns its expand/collapse state, composed from the shared `PortalMedicalHistoryListGroup`. */
export function PortalMedicalHistoryPanel({
  medicalHistory,
}: PortalMedicalHistoryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border rounded-lg">
      <button
        type="button"
        className="w-full flex items-center justify-between p-4 text-left"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <span className="font-medium">Medical History Details</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PortalMedicalHistoryListGroup
            title="Conditions"
            items={medicalHistory.conditions}
            renderItem={(c) => String(c.conditionName ?? "")}
          />
          <PortalMedicalHistoryListGroup
            title="Allergies"
            items={medicalHistory.allergies}
            renderItem={(a) => (
              <>
                {String(a.allergen ?? "")} &mdash; {String(a.severity ?? "")}
              </>
            )}
          />
          <PortalMedicalHistoryListGroup
            title="Family history"
            items={medicalHistory.familyHistory}
            renderItem={(f) => (
              <>
                {String(f.condition ?? "")} ({String(f.relationship ?? "")})
              </>
            )}
          />
          <PortalMedicalHistoryListGroup
            title="Surgical history"
            items={medicalHistory.surgicalHistory}
            renderItem={(s) => String(s.procedureName ?? "")}
          />
        </div>
      )}
    </div>
  );
}
