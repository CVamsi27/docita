import { Link } from "react-router";
import { useMemo, useState } from "react";
import { usePatientTimeline } from "@workspace/data-access";
import {
  DataState,
  type DataStateStatus,
} from "@workspace/ui/components/data-display/data-state";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Section } from "@workspace/ui/components/layout/section";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { formatDate } from "@workspace/utils";
import { CalendarDays, ChevronRight, Pill, Stethoscope } from "lucide-react";
import { parseVisitCardMetadata } from "@/components/patient-history/visit-card-config";
import { SummarySectionAction } from "./SummarySectionAction";

interface RecentConsultationsSectionProps {
  patientId: string;
}

export function RecentConsultationsSection({
  patientId,
}: RecentConsultationsSectionProps) {
  const [timelineCutoff] = useState(() => new Date().toISOString());
  const { data, isLoading, isError, refetch } = usePatientTimeline(patientId, {
    eventTypes: ["APPOINTMENT"],
    to: timelineCutoff,
    limit: 20,
    offset: 0,
  });
  const consultations = useMemo(
    () =>
      (data?.events ?? [])
        .flatMap((event) => {
          const metadata = parseVisitCardMetadata(event.metadata);
          const status = metadata.status?.toLowerCase();
          const isCancelled = status === "cancelled";
          const isFuture =
            new Date(event.date).getTime() > Date.parse(timelineCutoff);
          return isCancelled || isFuture ? [] : [{ event, metadata }];
        })
        .slice(0, 5),
    [data?.events, timelineCutoff],
  );

  const status: DataStateStatus =
    isLoading && !data
      ? "loading"
      : isError
        ? "error"
        : consultations.length === 0
          ? "empty"
          : "success";

  return (
    <Section
      title="Recent consultations"
      description="The latest visit context and clinical outcomes."
      actions={
        <SummarySectionAction
          href={`/patients/${patientId}?tab=visits`}
          label="See all visits"
        />
      }
    >
      <DataState
        status={status}
        loadingMessage="Loading recent consultations…"
        errorMessage="We could not load recent consultations. Please try again."
        onRetry={() => refetch()}
        emptyIcon={CalendarDays}
        emptyTitle="No consultations yet"
        emptyDescription="Completed and active consultations will appear here."
      >
        <ul className="divide-y divide-border/60">
          {consultations.map(({ event, metadata }) => {
            const primaryDiagnosis =
              metadata.diagnoses.find((diagnosis) => diagnosis.isPrimary) ??
              metadata.diagnoses[0];
            const href = `/consultation/${metadata.consultationId ?? event.id}?from=patient`;
            return (
              <li key={event.id}>
                <Link
                  to={href}
                  className="flex items-start justify-between gap-3 rounded-md px-1 py-3 transition-colors duration-150 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">
                        {formatDate(event.date, "d MMM yyyy")}
                      </span>
                      {metadata.doctorName ? (
                        <span className="text-xs text-muted-foreground">
                          Dr. {metadata.doctorName}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {primaryDiagnosis?.description ? (
                        <Badge
                          variant="secondary"
                          className="badge-info gap-1 text-[length:var(--fs-2xs)]"
                        >
                          <Stethoscope className="h-3 w-3" aria-hidden />
                          {primaryDiagnosis.description}
                        </Badge>
                      ) : null}
                      {metadata.medications.length > 0 ? (
                        <Badge
                          variant="secondary"
                          className="badge-success gap-1 text-[length:var(--fs-2xs)]"
                        >
                          <Pill className="h-3 w-3" aria-hidden />
                          {metadata.medications.length} Rx
                        </Badge>
                      ) : null}
                      {metadata.status ? (
                        <Badge
                          variant="secondary"
                          className="text-[length:var(--fs-2xs)]"
                        >
                          {humanizeUiLabel(metadata.status)}
                        </Badge>
                      ) : null}
                    </div>
                    {event.description ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {event.description}
                      </p>
                    ) : null}
                  </div>
                  <ChevronRight
                    className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </DataState>
    </Section>
  );
}
