"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarCheck, Check, X } from "lucide-react";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { DataState } from "@workspace/ui/components/data-state";
import { PageHeader } from "@workspace/ui/components/page-header";
import type { FollowUpResponse, FollowUpStatus } from "@workspace/types";
import {
  useCancelFollowUp,
  useCompleteFollowUp,
  useFollowUps,
} from "@/hooks/api/use-appointments";
import {
  type FollowUpListView,
  getFollowUpListQuery,
} from "@/features/follow-ups/lib/follow-up-list-query";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import { formatDate } from "@/lib/formatters";

const VIEW_OPTIONS: Array<{ value: FollowUpListView; label: string }> = [
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "all", label: "All open" },
];

const STATUS_LABELS: Record<FollowUpStatus, string> = {
  PENDING: "Pending",
  REMINDER_SENT: "Reminder sent",
  BOOKED: "Booked",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

function patientName(followUp: FollowUpResponse) {
  const firstName = followUp.patient?.firstName ?? "";
  const lastName = followUp.patient?.lastName ?? "";
  return `${firstName} ${lastName}`.trim() || "Patient";
}

function FollowUpCard({
  followUp,
  isMutating,
  onComplete,
  onCancel,
}: {
  followUp: FollowUpResponse;
  isMutating: boolean;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">{patientName(followUp)}</h2>
            <Badge variant="secondary">{STATUS_LABELS[followUp.status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{followUp.reason}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>
              Due {formatDate(followUp.scheduledDate)}
            </span>
            <span>Doctor: {followUp.doctor?.name ?? "Unassigned"}</span>
            {followUp.patient?.phoneNumber ? (
              <span>{followUp.patient.phoneNumber}</span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={isMutating}
            onClick={() => onComplete(followUp.id)}
          >
            <Check className="h-4 w-4" />
            Complete
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isMutating}
            onClick={() => onCancel(followUp.id)}
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FollowUpsPage() {
  const [view, setView] = useState<FollowUpListView>("today");
  const query = useMemo(() => getFollowUpListQuery(view), [view]);
  const { data = [], isLoading, isError, refetch } = useFollowUps(query);
  const completeFollowUp = useCompleteFollowUp();
  const cancelFollowUp = useCancelFollowUp();
  const isMutating = completeFollowUp.isPending || cancelFollowUp.isPending;

  const state = isLoading
    ? "loading"
    : isError
      ? "error"
      : data.length === 0
        ? "empty"
        : "success";

  const handleComplete = async (id: string) => {
    try {
      await completeFollowUp.mutateAsync({ id });
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not complete this follow-up. Please try again.",
        "form",
      );
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelFollowUp.mutateAsync({ id });
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not cancel this follow-up. Please try again.",
        "form",
      );
    }
  };

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Follow-ups"
          description="Close the loop on planned patient callbacks and review visits"
          actions={
            <Button asChild variant="outline">
              <Link href="/appointments">Appointments</Link>
            </Button>
          }
        />
      }
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Worklist</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {VIEW_OPTIONS.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={view === option.value ? "default" : "outline"}
              onClick={() => setView(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <DataState
        status={state}
        loadingMessage="Loading follow-ups…"
        errorMessage="We could not load follow-ups. Please try again."
        onRetry={() => void refetch()}
        emptyIcon={CalendarCheck}
        emptyTitle="No open follow-ups"
        emptyDescription="Open follow-ups for the selected view will appear here"
      >
        <div className="space-y-3">
          {data.map((followUp) => (
            <FollowUpCard
              key={followUp.id}
              followUp={followUp}
              isMutating={isMutating}
              onComplete={(id) => void handleComplete(id)}
              onCancel={(id) => void handleCancel(id)}
            />
          ))}
        </div>
      </DataState>
    </AppPageScaffold>
  );
}
