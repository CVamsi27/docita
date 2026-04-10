"use client";

import { PatientPortalBillingUI } from "@/features/patient-portal/components";
import type { PatientInvoiceStatus } from "@/features/patient-portal/types/patient-portal-types";
import { usePatientPortalInvoices } from "@/hooks/api/use-patient-portal";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { DataState } from "@workspace/ui/components/data-state";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Receipt } from "lucide-react";

function mapInvoiceStatus(status: unknown): PatientInvoiceStatus {
  if (typeof status !== "string") {
    return "PENDING";
  }

  const normalized = status.toUpperCase();
  if (normalized === "PAID") {
    return "PAID";
  }
  if (normalized === "OVERDUE") {
    return "OVERDUE";
  }
  return "PENDING";
}

export default function PortalBillingPage() {
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = usePatientPortalInvoices();

  const invoices = (data?.invoices ?? []).map((item, index) => {
    const row = item as Record<string, unknown>;

    const amount =
      typeof row.amount === "number"
        ? row.amount
        : typeof row.total === "number"
          ? row.total
          : 0;

    const dueAt =
      typeof row.dueAt === "string"
        ? row.dueAt
        : typeof row.createdAt === "string"
          ? row.createdAt
          : new Date().toISOString();

    return {
      id: typeof row.id === "string" ? row.id : `invoice-${index}`,
      amount,
      dueAt,
      status: mapInvoiceStatus(row.status),
    };
  });

  const state = isLoading
    ? "loading"
    : isError
      ? "error"
      : invoices.length === 0
      ? "empty"
      : "success";

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="My Billing & Invoices"
          description="Review invoices and payment status."
        />
      }
    >
      <DataState
        status={state}
        loadingMessage="Loading invoices..."
        errorMessage="We could not load invoices. Please try again."
        onRetry={() => void refetch()}
        emptyIcon={Receipt}
        emptyTitle="No invoices found"
        emptyDescription="Your invoices will appear here after a visit."
      >
        <PatientPortalBillingUI
          invoices={invoices}
          portalHomeHref="/portal"
          showHeader={false}
        />
      </DataState>
    </AppPageScaffold>
  );
}
