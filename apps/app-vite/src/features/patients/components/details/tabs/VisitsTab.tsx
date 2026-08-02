import { useState } from "react";
import {
  DataState,
  type DataStateStatus,
} from "@workspace/ui/components/data-display/data-state";
import { useTranslation } from "react-i18next";
import { Clock3 } from "lucide-react";
import type { TimelineEventType } from "@workspace/types";
import { usePatientTimeline } from "@workspace/data-access";
import { PatientTimeline } from "@/components/patient-history";

interface VisitsTabProps {
  patientId: string;
}

const VISIT_TYPES: TimelineEventType[] = [
  "APPOINTMENT",
  "FOLLOW_UP",
  "ADMISSION",
];

export function VisitsTab({ patientId }: VisitsTabProps) {
  const { t } = useTranslation("Patients.visitsTab");
  const [selectedTypes, setSelectedTypes] =
    useState<TimelineEventType[]>(VISIT_TYPES);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const { data, isLoading, isError, refetch } = usePatientTimeline(patientId, {
    eventTypes: selectedTypes,
    limit,
    offset,
  });

  const handleTypeToggle = (type: TimelineEventType) => {
    setOffset(0);
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.length === 1
          ? VISIT_TYPES
          : prev.filter((t) => t !== type)
        : [...prev, type],
    );
  };
  const status: DataStateStatus = isLoading && !data
    ? "loading"
    : isError
      ? "error"
      : !data
        ? "empty"
        : "success";
  const hasMore = !!data && offset + limit < data.total;
  return (
    <DataState
      status={status}
      loadingMessage={t("loadingMessage")}
      errorMessage={t("errorMessage")}
      onRetry={() => refetch()}
      emptyIcon={Clock3}
      emptyTitle={t("emptyTitle")}
      emptyDescription={t("emptyDescription")}
    >
      {data ? (
        <PatientTimeline
          mode="full"
          events={data.events}
          summary={data.summary}
          total={data.total}
          selectedTypes={selectedTypes}
          onTypeToggle={handleTypeToggle}
          onLoadMore={() => setOffset((prev) => prev + limit)}
          hasMore={hasMore}
          isLoading={isLoading}
        />
      ) : null}
    </DataState>
  );
}
