"use client";

import { useState, type FormEvent } from "react";
import { PatientPortalAppointmentsUI } from "@/features/patient-portal/components";
import { usePatientPortalAppointments, useRequestAppointment } from "@workspace/data-access";
import { useTranslation } from "react-i18next";
import { AppPageScaffold, Button, DataState, Input, IsoDatePickerField, Label, PageHeader, Textarea, TimePicker } from "@workspace/ui/components";
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
  const { t } = useTranslation("PatientPortal");
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
      showUserFacingErrorToast(null, t("appointments.errorDateRequired"), "form");
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
      showUserFacingErrorToast(error, t("appointments.errorSubmit"), "form");
    }
  };

  return (
    <AppPageScaffold
      header={
        <PageHeader title={t("appointments.pageTitle")} description={t("appointments.pageDescription")} />
      }
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("appointments.requestCardTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px] lg:grid-cols-[minmax(0,1fr)_160px_140px]"
            onSubmit={handleRequestSubmit}
          >
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t("appointments.reasonPlaceholder")}
              required
              maxLength={500}
              aria-label={t("appointments.reasonLabel")}
            />
            <div className="flex min-w-0 flex-col gap-2">
              <Label
                htmlFor="portal-preferred-date"
                className="text-xs text-muted-foreground"
              >
                {t("appointments.preferredDateLabel")}
              </Label>
              <IsoDatePickerField
                id="portal-preferred-date"
                label=""
                showLabel={false}
                value={preferredDate}
                onChange={setPreferredDate}
                required
                placeholder={t("appointments.preferredDatePlaceholder")}
                triggerClassName="h-10 w-full min-w-0 sm:w-full lg:w-[160px]"
              />
            </div>
            <TimePicker
              value={preferredTime}
              onChange={(value) => setPreferredTime(value)}
              placeholder={t("appointments.preferredTimeLabel")}
              use12Hour={false}
              stepMinutes={15}
            />
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t("appointments.notesPlaceholder")}
              maxLength={1000}
              aria-label={t("appointments.notesLabel")}
              className="md:col-span-2 lg:col-span-2"
            />
            <Button
              type="submit"
              disabled={requestAppointment.isPending}
              className="lg:self-start"
            >
              {t("appointments.submitButton")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <DataState
        status={state}
        loadingMessage={t("appointments.loadingMessage")}
        errorMessage={t("appointments.errorMessage")}
        onRetry={() => void refetch()}
        emptyIcon={Calendar}
        emptyTitle={t("appointments.emptyTitle")}
        emptyDescription={t("appointments.emptyDescription")}
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
