"use client";

import Link from "next/link";
import { usePatientPortalDashboard } from "@/hooks/api/use-patient-portal";
import { usePatientConsentSettings } from "@/hooks/api/use-patient-portal";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { DataState } from "@workspace/ui/components/data-state";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Calendar, FileText, Receipt } from "lucide-react";

export default function PortalDashboardPage() {
  const {
    data: dashboard,
    isLoading,
    isError,
    refetch,
  } = usePatientPortalDashboard();
  const { data: consentSettings } = usePatientConsentSettings();

  const whatsappConsentStatus = consentSettings?.whatsappConsent
    ? "Granted"
    : "Not granted";

  const dataStorageConsentStatus = consentSettings?.dataStorageConsent
    ? "Granted"
    : "Not granted";

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="My Health Dashboard"
          description="Track appointments, prescriptions, billing, and consent settings"
        />
      }
    >
      <DataState
        status={isLoading ? "loading" : isError ? "error" : "success"}
        loadingMessage="Loading your dashboard…"
        errorMessage="We could not load your health overview. Please try again."
        onRetry={() => void refetch()}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Upcoming Appointments
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                {dashboard?.summary.upcomingAppointmentsCount || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Prescriptions
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                {dashboard?.summary.activePrescriptionsCount || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Outstanding Invoices
              </CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                {dashboard?.summary.outstandingInvoicesCount || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Consent & Data Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="ui-page-subtitle">
              Review your consent form and privacy preferences.
            </p>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <p>
                <span className="font-medium">WhatsApp Consent:</span>
                <span className="ml-1">{whatsappConsentStatus}</span>
              </p>
              <p>
                <span className="font-medium">Data Storage Consent:</span>
                <span className="ml-1">{dataStorageConsentStatus}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/portal/profile/consent-form">View Consent Form</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/portal/profile">Privacy Settings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/portal/appointments">View Appointments</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/portal/prescriptions">View Prescriptions</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/portal/billing">View Billing</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/portal/history">Open Health History</Link>
            </Button>
          </CardContent>
        </Card>
      </DataState>
    </AppPageScaffold>
  );
}
