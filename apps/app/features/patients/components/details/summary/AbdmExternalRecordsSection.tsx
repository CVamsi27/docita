"use client";

import { useAbdmExternalRecords } from "@workspace/data-access";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Section } from "@workspace/ui/components/layout/section";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { formatDate } from "@workspace/utils";
import { FileText } from "lucide-react";

interface AbdmExternalRecordsSectionProps {
  patientId: string;
  abhaVerified: boolean;
}

export function AbdmExternalRecordsSection({
  patientId,
  abhaVerified,
}: AbdmExternalRecordsSectionProps) {
  const { data, isLoading, isError, refetch } = useAbdmExternalRecords(
    patientId,
    { enabled: abhaVerified },
  );
  const records = data ?? [];

  return (
    <Section
      title="External ABDM records"
      description="Consent-based records fetched from other ABDM participants."
    >
      {!abhaVerified ? (
        <DataState
          status="empty"
          emptyIcon={FileText}
          emptyTitle="ABHA not verified"
          emptyDescription="Verify the patient ABHA before requesting external ABDM records."
        />
      ) : isLoading && !data ? (
        <DataState
          status="loading"
          loadingMessage="Loading external ABDM records…"
        />
      ) : isError ? (
        <DataState
          status="error"
          errorMessage="We could not load external ABDM records. Please try again."
          onRetry={() => refetch()}
        />
      ) : records.length === 0 ? (
        <DataState
          status="empty"
          emptyIcon={FileText}
          emptyTitle="No external records"
          emptyDescription="Records fetched through ABDM M3 consent will appear here."
        />
      ) : (
        <ul className="divide-y divide-border/60">
          {records.slice(0, 5).map((record) => (
            <li key={record.id} className="space-y-1 px-1 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">
                  {humanizeUiLabel(record.hiType)}
                </span>
                <Badge
                  variant="secondary"
                  className="text-[length:var(--fs-2xs)]"
                >
                  External
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Received {formatDate(record.receivedAt, "d MMM yyyy")}
                {record.sourceHipId ? ` from ${record.sourceHipId}` : ""}
              </p>
              {record.careContextReference ? (
                <p className="truncate text-[length:var(--fs-2xs)] text-muted-foreground">
                  Care context {record.careContextReference}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
