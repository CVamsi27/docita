"use client";

// jscpd:ignore-start
import { useState, type FormEvent } from "react";
import { PatientPortalAppointmentsUI } from "@/features/patient-portal/components";
import { usePatientPortalAppointments, useRequestAppointment } from "@workspace/data-access";
import { AppPageScaffold, Button, DataState, Input, IsoDatePickerField, Label, PageHeader, Textarea } from "@workspace/ui/components";
import {
  Card,
  CardContent,
// jscpd:ignore-end
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Calendar } from "lucide-react";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { mapPortalAppointmentRow } from "@/features/patient-portal/lib/map-portal-records";

export default function PortalAppointmentsPage() {
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
      showUserFacingErrorToast(
        null,
        "Select a preferred date before sending the request.",
        "form",
      );
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
      showUserFacingErrorToast(
        error,
        "We could not send this appointment request. Please try again.",
        "form",
      );
    }
  };

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="My Appointments"
          description="Track upcoming and past visits"
        />
      }
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request an Appointment</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px] lg:grid-cols-[minmax(0,1fr)_160px_140px]"
            onSubmit={handleRequestSubmit}
          >
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Reason for visit"
              required
              maxLength={500}
              aria-label="Reason for visit"
            />
            <div className="flex min-w-0 flex-col gap-2">
              <Label
                htmlFor="portal-preferred-date"
                className="text-xs text-muted-foreground"
              >
                Preferred date
              </Label>
              <IsoDatePickerField
                id="portal-preferred-date"
                label=""
                showLabel={false}
                value={preferredDate}
                onChange={setPreferredDate}
                required
                placeholder="Select preferred date"
                triggerClassName="h-10 w-full min-w-0 sm:w-full lg:w-[160px]"
              />
            </div>
            <Input
              type="time"
              value={preferredTime}
              onChange={(event) => setPreferredTime(event.target.value)}
              aria-label="Preferred time"
            />
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Additional notes"
              maxLength={1000}
              aria-label="Additional notes"
              className="md:col-span-2 lg:col-span-2"
            />
            <Button
              type="submit"
              disabled={requestAppointment.isPending}
              className="lg:self-start"
            >
              Send Request
            </Button>
          </form>
        </CardContent>
      </Card>

      <DataState
        status={state}
        loadingMessage="Loading appointments…"
        errorMessage="We could not load your appointment list. Please try again."
        onRetry={() => void refetch()}
        emptyIcon={Calendar}
        emptyTitle="No appointments found"
        emptyDescription="Your scheduled visits will appear here"
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
