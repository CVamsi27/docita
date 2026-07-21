"use client";

import { useState, type FormEvent } from "react";
import { PatientPortalAppointmentsUI } from "@/features/patient-portal/components";
import { usePatientPortalAppointments, useRequestAppointment } from "@workspace/data-access";
import { useTranslations } from "next-intl";
import { AppPageScaffold, Button, DataState, Input, IsoDatePickerField, Label, PageHeader, Textarea } from "@workspace/ui/components";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Calendar } from "lucide-react";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { mapPortalAppointmentRow } from "@/features/patient-portal/lib/map-portal-records";

export default function PortalAppointmentsPage() {
  const t = useTranslations("PatientPortal.appointments");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const { data, isLoading, isError, refetch } = usePatientPortalAppointments();
  const requestAppointment = useRequestAppointment();

  const appointments = (data?.appointments ?? []).map(mapPortalAppointmentRow);

  const state = isLoading
    ? "loading"
    : isError
      ? "error"
      : appointments.length === 0
        ? "empty"
        : "success";

  const handleRequestSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!preferredDate.trim()) {
      showUserFacingErrorToast(null, t("errorDateRequired"), "form");
      return;
    }
    try {
      await requestAppointment.mutateAsync({
        preferredDate,
        preferredTime: preferredTime || undefined,
        reason,
        ...(notes.trim() ? { notes } : {}),
      });
      setPreferredDate("");
      setPreferredTime("");
      setReason("");
      setNotes("");
      void refetch();
    } catch (error) {
      showUserFacingErrorToast(error, t("errorSubmit"), "form");
    }
  };

  return (
    <AppPageScaffold
      header={
        <PageHeader title={t("pageTitle")} description={t("pageDescription")} />
      }
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("requestCardTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px] lg:grid-cols-[minmax(0,1fr)_160px_140px]"
            onSubmit={handleRequestSubmit}
          >
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t("reasonPlaceholder")}
              required
              maxLength={500}
              aria-label={t("reasonLabel")}
            />
            <div className="flex min-w-0 flex-col gap-2">
              <Label
                htmlFor="portal-preferred-date"
                className="text-xs text-muted-foreground"
              >
                {t("preferredDateLabel")}
              </Label>
              <IsoDatePickerField
                id="portal-preferred-date"
                label=""
                showLabel={false}
                value={preferredDate}
                onChange={setPreferredDate}
                required
                placeholder={t("preferredDatePlaceholder")}
                triggerClassName="h-10 w-full min-w-0 sm:w-full lg:w-[160px]"
              />
            </div>
            <Input
              type="time"
              value={preferredTime}
              onChange={(event) => setPreferredTime(event.target.value)}
              aria-label={t("preferredTimeLabel")}
            />
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t("notesPlaceholder")}
              maxLength={1000}
              aria-label={t("notesLabel")}
              className="md:col-span-2 lg:col-span-2"
            />
            <Button
              type="submit"
              disabled={requestAppointment.isPending}
              className="lg:self-start"
            >
              {t("submitButton")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <DataState
        status={state}
        loadingMessage={t("loadingMessage")}
        errorMessage={t("errorMessage")}
        onRetry={() => void refetch()}
        emptyIcon={Calendar}
        emptyTitle={t("emptyTitle")}
        emptyDescription={t("emptyDescription")}
      >
        <PatientPortalAppointmentsUI
          appointments={appointments}
          portalHomeHref="/portal"
          showHeader={false}
        />
      </DataState>
    </AppPageScaffold>
  );
}
