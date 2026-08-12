import { useDeferredValue, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText } from "lucide-react";
import type { Appointment } from "@workspace/types";
import { Feature } from "@workspace/types";
import {
  AppPageScaffold,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataState,
  Input,
  PageHeader,
} from "@workspace/ui/components";
import { useDebounce } from "@workspace/hooks/use-debounce";
import { getPatientFullName } from "@workspace/utils";
import { FeatureGate } from "@/components/auth/feature-gate";
import { CodingQueue } from "@/features/medical-coding/components";
import { useCodingQueue } from "@workspace/data-access";
import { formatDateTime } from "@/lib/formatters";

function formatQueueDate(value: Appointment["startTime"]): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  const formatted = formatDateTime(date);
  return formatted.length > 0 ? formatted : "Date unavailable";
}

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getPatientName(appointment: Appointment): string {
  return getPatientFullName(
    appointment.patient,
    `Patient ${appointment.patientId}`,
  );
}

export function CodingQueuePageContent() {
  const { t } = useTranslation("MedicalCoding");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery.trim(), 300);
  const deferredSearch = useDeferredValue(debouncedSearch);
  const {
    data: appointments = [],
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useCodingQueue(deferredSearch);

  const queueItems = useMemo(
    () =>
      appointments.map((appointment) => ({
        id: appointment.id ?? appointment.patientId,
        patientName: getPatientName(appointment),
        date: formatQueueDate(appointment.startTime),
        status: formatStatus(appointment.status),
        reviewHref: appointment.id
          ? `/consultation/${appointment.id}`
          : undefined,
      })),
    [appointments],
  );

  const pendingCount = queueItems.length;

  return (
    <FeatureGate feature={Feature.MEDICAL_CODING} showLockedCard>
      <AppPageScaffold
        header={
          <PageHeader
            title={t("pageTitle")}
            description={t("pageDescription")}
          />
        }
      >
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {t("uncodedVisits")}
              </CardTitle>
              <CardDescription>
                {t("uncodedVisitsDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <Input
                aria-label={t("searchAriaLabel")}
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                }}
              />
              <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {pendingCount}
                </span>
                <span className="ml-1">{t("pendingReview")}</span>
              </div>
            </CardContent>
          </Card>

          {(() => {
            const status: "loading" | "error" | "empty" | "success" = isLoading
              ? "loading"
              : isError
                ? "error"
                : queueItems.length === 0
                  ? "empty"
                  : "success";
            return (
              <DataState
                status={status}
                loadingMessage={t("loading")}
                errorMessage={t("error")}
                onRetry={() => void refetch()}
                emptyTitle={t("emptyTitle")}
                emptyDescription={t("emptyDescription")}
                emptyIcon={FileText}
                className="min-h-[40vh]"
              >
                <div className={isFetching ? "opacity-80" : undefined}>
                  <CodingQueue items={queueItems} />
                </div>
              </DataState>
            );
          })()}
        </div>
      </AppPageScaffold>
    </FeatureGate>
  );
}
