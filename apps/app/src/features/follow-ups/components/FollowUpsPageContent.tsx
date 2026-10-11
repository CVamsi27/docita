"use client";

// jscpd:ignore-start
import { getPatientFullName } from "@workspace/utils";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { CalendarCheck, Check, X } from "lucide-react";
import { AppPageScaffold, Badge, Button, DataState, PageHeader, SegmentedControl } from "@workspace/ui/components";
import {
  Card,
  CardContent,
// jscpd:ignore-end
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Feature, type FollowUpResponse } from "@workspace/types";
import { PageFeatureGate } from "@/components/auth/PageFeatureGate";
import { type FollowUpListView, getFollowUpListQuery } from "@/features/follow-ups/lib/follow-up-list-query";
import { useCancelFollowUp, useCompleteFollowUp, useFollowUps } from "@workspace/data-access";
import { formatDate } from "@/lib/formatters";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { followUpStatusLabel } from "@/features/follow-ups/lib/follow-up-status-label";
import { followUpViewLabel } from "@/features/follow-ups/lib/follow-up-view-label";

const VIEW_OPTIONS: ReadonlySet<FollowUpListView> = new Set([
  "overdue",
  "today",
  "upcoming",
  "all",
]);

function isFollowUpListView(id: string): id is FollowUpListView {
  for (const view of VIEW_OPTIONS) {
    if (view === id) return true;
  }
  return false;
}

function patientName(followUp: FollowUpResponse) {
  const firstName = followUp.patient?.firstName ?? "";
  const lastName = followUp.patient?.lastName ?? "";
  return getPatientFullName({ firstName, lastName }, "Patient");
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
  const { t } = useTranslation("FollowUps");
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">{patientName(followUp)}</h2>
            <Badge variant="secondary">{followUpStatusLabel(followUp.status, t)}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{followUp.reason}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{t("card.dueDate", { date: formatDate(followUp.scheduledDate) })}</span>
            <span>{t("card.doctor", { name: followUp.doctor?.name ?? t("card.unassigned") })}</span>
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
            {t("card.completeButton")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isMutating}
            onClick={() => onCancel(followUp.id)}
          >
            <X className="h-4 w-4" />
            {t("card.cancelButton")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function FollowUpsPageContent() {
  const { t } = useTranslation("FollowUps");
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
        t("completeError"),
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
        t("cancelError"),
        "form",
      );
    }
  };

  return (
    <PageFeatureGate
      feature={Feature.AUTO_REMINDERS}
      title={t("pageTitle")}
      description={t("pageDescription")}
    >
      <AppPageScaffold
        header={
          <PageHeader
            title={t("pageTitle")}
            description={t("pageDescription")}
            actions={
              <Button asChild variant="outline">
                <Link to="/appointments">{t("appointmentsButton")}</Link>
              </Button>
            }
          />
        }
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("worklistTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <SegmentedControl
              ariaLabel={t("viewSelectorAriaLabel")}
              size="sm"
              className="min-w-[min(100%,28rem)]"
              items={[...VIEW_OPTIONS].map((view) => ({
                id: view,
                label: followUpViewLabel(view, t),
              }))}
              activeId={view}
              onSelect={(id) => {
                if (isFollowUpListView(id)) {
                  setView(id);
                }
              }}
            />
          </CardContent>
        </Card>

        <div role="tabpanel" aria-label={followUpViewLabel(view, t)}>
          <DataState
            status={state}
            loadingMessage={t("loading")}
            errorMessage={t("error")}
            onRetry={() => void refetch()}
            emptyIcon={CalendarCheck}
            emptyTitle={t("emptyTitle")}
            emptyDescription={t("emptyDescription")}
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
        </div>
      </AppPageScaffold>
    </PageFeatureGate>
  );
}
