"use client";

import { useState, type FormEvent } from "react";
import { PatientPortalAppointmentsUI } from "@/features/patient-portal/components";
import type { PatientAppointmentStatus } from "@/features/patient-portal/types/patient-portal-types";
import {
  usePatientPortalAppointments,
  useRequestAppointment,
} from "@/hooks/api/use-patient-portal";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { DataState } from "@workspace/ui/components/data-state";
import { Input } from "@workspace/ui/components/input";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Textarea } from "@workspace/ui/components/textarea";
import { Calendar } from "lucide-react";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

function mapAppointmentStatus(status: unknown): PatientAppointmentStatus {
  if (typeof status !== "string") {
    return "PENDING";
  }

  const normalized = status.toUpperCase().replace("-", "_");
  if (normalized === "COMPLETED") {
    return "COMPLETED";
  }

  if (
    normalized === "CONFIRMED" ||
    normalized === "CHECKED_IN" ||
    normalized === "IN_PROGRESS"
  ) {
    return "CONFIRMED";
  }

  return "PENDING";
}

export default function PortalAppointmentsPage() {
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = usePatientPortalAppointments();
  const requestAppointment = useRequestAppointment();

  const appointments = (data?.appointments ?? []).map((item, index) => {
    const row = item as Record<string, unknown>;
    const doctor = row.doctor as Record<string, unknown> | undefined;
    const clinic = row.clinic as Record<string, unknown> | undefined;

    const doctorName =
      typeof row.doctorName === "string"
        ? row.doctorName
        : typeof doctor?.name === "string"
          ? doctor.name
          : "Doctor";

    const clinicName =
      typeof row.clinicName === "string"
        ? row.clinicName
        : typeof clinic?.name === "string"
          ? clinic.name
          : "Clinic";

    const scheduledAt =
      typeof row.scheduledAt === "string"
        ? row.scheduledAt
        : typeof row.startTime === "string"
          ? row.startTime
          : new Date().toISOString();

    return {
      id: typeof row.id === "string" ? row.id : `appointment-${index}`,
      doctorName,
      clinicName,
      scheduledAt,
      status: mapAppointmentStatus(row.status),
    };
  });

  const state = isLoading
    ? "loading"
    : isError
      ? "error"
      : appointments.length === 0
      ? "empty"
      : "success";

  const handleRequestSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
            <Input
              type="date"
              value={preferredDate}
              onChange={(event) => setPreferredDate(event.target.value)}
              required
              aria-label="Preferred date"
            />
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
        loadingMessage="Loading appointments..."
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
