"use client";

import { PatientPortalPrescriptionsUI } from "@/features/patient-portal/components";
import type { PatientPrescriptionStatus } from "@/features/patient-portal/types/patient-portal-types";
import { usePatientPortalPrescriptions } from "@/hooks/api/use-patient-portal";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { DataState } from "@workspace/ui/components/data-state";
import { PageHeader } from "@workspace/ui/components/page-header";
import { FileText } from "lucide-react";

function mapPrescriptionStatus(status: unknown): PatientPrescriptionStatus {
  if (typeof status !== "string") {
    return "ACTIVE";
  }

  return status.toUpperCase() === "COMPLETED" ? "COMPLETED" : "ACTIVE";
}

export default function PortalPrescriptionsPage() {
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = usePatientPortalPrescriptions();

  const prescriptions = (data?.prescriptions ?? []).map((item, index) => {
    const row = item as Record<string, unknown>;
    const doctor = row.doctor as Record<string, unknown> | undefined;

    const title =
      typeof row.title === "string"
        ? row.title
        : typeof row.name === "string"
          ? row.name
          : "Prescription";

    const prescribedBy =
      typeof row.prescribedBy === "string"
        ? row.prescribedBy
        : typeof doctor?.name === "string"
          ? doctor.name
          : "Doctor";

    const issuedAt =
      typeof row.issuedAt === "string"
        ? row.issuedAt
        : typeof row.createdAt === "string"
          ? row.createdAt
          : new Date().toISOString();

    return {
      id: typeof row.id === "string" ? row.id : `prescription-${index}`,
      title,
      prescribedBy,
      issuedAt,
      status: mapPrescriptionStatus(row.status),
    };
  });

  const state = isLoading
    ? "loading"
    : isError
      ? "error"
      : prescriptions.length === 0
      ? "empty"
      : "success";

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="My Prescriptions"
          description="View active and historical medications"
        />
      }
    >
      <DataState
        status={state}
        loadingMessage="Loading prescriptions…"
        errorMessage="We could not load your prescription list. Please try again."
        onRetry={() => void refetch()}
        emptyIcon={FileText}
        emptyTitle="No prescriptions found"
        emptyDescription="Prescriptions from your doctor will appear here"
      >
        <PatientPortalPrescriptionsUI
          prescriptions={prescriptions}
          portalHomeHref="/portal"
          showHeader={false}
        />
      </DataState>
    </AppPageScaffold>
  );
}
