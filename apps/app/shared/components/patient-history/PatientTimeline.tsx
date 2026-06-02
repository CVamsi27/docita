"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/form/button";
import { Activity } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import type {
  TimelineEvent,
  TimelineEventType,
  PatientTimelineResponse,
} from "@workspace/types";
import { VisitCard, EVENT_TYPE_CONFIG } from "./VisitCard";

interface PatientTimelineProps {
  events: TimelineEvent[];
  summary: PatientTimelineResponse["summary"];
  total: number;
  mode: "full" | "compact" | "portal";
  selectedTypes?: TimelineEventType[];
  onTypeToggle?: (type: TimelineEventType) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

const ALL_TYPES: TimelineEventType[] = [
  "APPOINTMENT",
  "PRESCRIPTION",
  "METRIC_RECORD",
  "LAB_TEST",
  "MEDICAL_DOCUMENT",
  "FOLLOW_UP",
  "IMMUNIZATION",
  "ADMISSION",
  "MEDICATION_DOSE",
];

export function PatientTimeline({
  events,
  summary,
  total,
  mode,
  selectedTypes,
  onTypeToggle,
  onLoadMore,
  hasMore,
  isLoading,
}: PatientTimelineProps) {
  const [showAll, setShowAll] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const now = Date.now();
  const upcomingOrToday = sortedEvents.filter(
    (e) => new Date(e.date).getTime() >= now,
  );
  const past = sortedEvents.filter((e) => new Date(e.date).getTime() < now);

  if (mode === "compact") {
    const visibleEvents = showAll ? sortedEvents : sortedEvents.slice(0, 10);
    return (
      <div className="space-y-0">
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No history</p>
        ) : (
          <>
            <div className="pl-1 space-y-0">
              {visibleEvents.map((event) => (
                <VisitCard key={event.id} event={event} mode="compact" />
              ))}
            </div>
            {events.length > 10 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs h-7 mt-1"
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll ? "Show less" : `Show all ${total}`}
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(mode === "full" || mode === "portal") && onTypeToggle && (
        <div className="flex flex-wrap gap-1.5">
          {ALL_TYPES.map((type) => {
            const config = EVENT_TYPE_CONFIG[type];
            const Icon = config.icon;
            const count = summary[type] ?? 0;
            const isSelected = selectedTypes?.includes(type) ?? true;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onTypeToggle(type)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors",
                  isSelected
                    ? "bg-foreground text-background border-border/40 shadow-sm"
                    : "bg-background/60 text-muted-foreground border-border/40 hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon
                  className={cn("h-3 w-3", isSelected ? "" : config.color)}
                />
                {mode === "portal" ? config.friendlyName : config.label}
                {count > 0 && (
                  <span className="ml-0.5 text-xs opacity-70">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {events.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No timeline events found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {past.length > 0 && (
            <div className="flex items-center justify-between gap-2 py-1">
              <p className="text-xs text-muted-foreground">
                {showPast
                  ? "Past events"
                  : `${past.length} past event${past.length === 1 ? "" : "s"} hidden`}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowPast((v) => !v)}
              >
                {showPast
                  ? "Hide past visits"
                  : `View past visits (${past.length})`}
              </Button>
            </div>
          )}

          {showPast &&
            past.map((event) => (
              <VisitCard key={event.id} event={event} mode={mode} />
            ))}

          {upcomingOrToday.map((event) => (
            <VisitCard key={event.id} event={event} mode={mode} />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? "Loading more…" : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}
