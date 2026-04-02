"use client";

import { PatientPortalAppointmentsUI } from "@/features/patient-portal/components";
import type { PatientAppointmentStatus } from "@/features/patient-portal/types/patient-portal-types";
import { usePatientPortalAppointments } from "@/hooks/api/use-patient-portal";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { DataState } from "@workspace/ui/components/data-state";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Calendar } from "lucide-react";

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
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = usePatientPortalAppointments();

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

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="My Appointments"
          description="Track upcoming and past visits."
        />
      }
    >
      <DataState
        status={state}
        loadingMessage="Loading appointments..."
        errorMessage="Failed to load appointments."
        onRetry={() => void refetch()}
        emptyIcon={Calendar}
        emptyTitle="No appointments found"
        emptyDescription="Your scheduled visits will appear here."
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
