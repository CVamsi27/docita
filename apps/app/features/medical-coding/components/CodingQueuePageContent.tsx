"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import type { Appointment } from "@workspace/types";
import { Feature } from "@workspace/types";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import { Input } from "@workspace/ui/components/form/input";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { useDebounce } from "@workspace/hooks/use-debounce";
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
  const patient = appointment.patient;
  const fullName = [patient?.firstName, patient?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || `Patient ${appointment.patientId}`;
}

export function CodingQueuePageContent() {
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
            title="Coding queue"
            description="Review completed visits that still need ICD-10 or procedure coding before reporting and billing."
          />
        }
      >
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Uncoded Visits
              </CardTitle>
              <CardDescription>
                Search by patient, visit, or clinician to keep coding work from
                piling up after consultations.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <Input
                aria-label="Search coding queue"
                placeholder="Enter patient or visit"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                }}
              />
              <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {pendingCount}
                </span>
                <span className="ml-1">pending review</span>
              </div>
            </CardContent>
          </Card>

          {isError ? (
            <EmptyState
              icon={FileText}
              title="Coding queue could not load"
              description="Try again. If this keeps happening, check whether medical coding access is enabled for this clinic."
              action={{
                label: "Retry",
                onClick: () => void refetch(),
              }}
              className="min-h-[40vh]"
            />
          ) : isLoading ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Loading uncoded visits…
              </CardContent>
            </Card>
          ) : (
            <div className={isFetching ? "opacity-80" : undefined}>
              <CodingQueue items={queueItems} />
            </div>
          )}
        </div>
      </AppPageScaffold>
    </FeatureGate>
  );
}
