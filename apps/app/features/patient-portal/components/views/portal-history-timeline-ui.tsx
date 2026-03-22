"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { usePortalTimeline, usePortalSnapshot } from "@/hooks/api/use-patient-portal";
import { usePatientMedicalHistory, usePatientPortalDashboard } from "@/hooks/api/use-patient-portal";
import { PatientSnapshotStrip } from "@/features/_shared/components/patient-history/PatientSnapshotStrip";
import { PatientTimeline } from "@/features/_shared/components/patient-history/PatientTimeline";
import type { TimelineEventType } from "@workspace/types";

const ALL_EVENT_TYPES: TimelineEventType[] = [
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

export function PortalHistoryTimelineUI() {
  const [selectedTypes, setSelectedTypes] =
    useState<TimelineEventType[]>(ALL_EVENT_TYPES);
  const [offset, setOffset] = useState(0);
  const [showMedHistory, setShowMedHistory] = useState(false);
  const limit = 15;

  const { data: dashboard } = usePatientPortalDashboard();
  const patientId =
    dashboard?.patient && typeof (dashboard.patient as Record<string, unknown>).id === "string"
      ? (dashboard.patient as Record<string, unknown>).id as string
      : undefined;

  const { data: snapshot } = usePortalSnapshot();
  const { data: timeline, isLoading } = usePortalTimeline({
    eventTypes: selectedTypes,
    limit,
    offset,
  });
  const { data: medicalHistory } = usePatientMedicalHistory(patientId);

  const handleTypeToggle = (type: TimelineEventType) => {
    setOffset(0);
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.length === 1
          ? ALL_EVENT_TYPES
          : prev.filter((t) => t !== type)
        : [...prev, type],
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Health History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A complete record of your health journey in one place.
        </p>
      </div>

      {snapshot && (
        <PatientSnapshotStrip snapshot={snapshot} layout="horizontal" />
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Timeline</h2>
        <PatientTimeline
          mode="portal"
          events={timeline?.events ?? []}
          summary={timeline?.summary ?? {}}
          total={timeline?.total ?? 0}
          selectedTypes={selectedTypes}
          onTypeToggle={handleTypeToggle}
          onLoadMore={() => setOffset((p) => p + limit)}
          hasMore={timeline ? offset + limit < timeline.total : false}
          isLoading={isLoading && !timeline}
        />
      </div>

      {medicalHistory && (
        <div className="border rounded-lg">
          <button
            className="w-full flex items-center justify-between p-4 text-left"
            onClick={() => setShowMedHistory((v) => !v)}
          >
            <span className="font-medium">Medical History Details</span>
            {showMedHistory ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {showMedHistory && (
            <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Conditions</h4>
                {medicalHistory.conditions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None</p>
                ) : (
                  <ul className="space-y-1">
                    {medicalHistory.conditions.map((c, i) => (
                      <li key={i} className="text-sm">
                        {String(c.conditionName ?? "")}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Allergies</h4>
                {medicalHistory.allergies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None</p>
                ) : (
                  <ul className="space-y-1">
                    {medicalHistory.allergies.map((a, i) => (
                      <li key={i} className="text-sm">
                        {String(a.allergen ?? "")} &mdash; {String(a.severity ?? "")}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Family History</h4>
                {medicalHistory.familyHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None</p>
                ) : (
                  <ul className="space-y-1">
                    {medicalHistory.familyHistory.map((f, i) => (
                      <li key={i} className="text-sm">
                        {String(f.condition ?? "")} ({String(f.relationship ?? "")})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Surgical History</h4>
                {medicalHistory.surgicalHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None</p>
                ) : (
                  <ul className="space-y-1">
                    {medicalHistory.surgicalHistory.map((s, i) => (
                      <li key={i} className="text-sm">
                        {String(s.procedureName ?? "")}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
