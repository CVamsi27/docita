"use client";

import { usePatientPortalDashboard } from "@workspace/data-access";
import { usePatientConsentSettings } from "@workspace/data-access";
import { AppPageScaffold, DataState, PageHeader } from "@workspace/ui/components";
import { PortalMetricsCards } from "./PortalMetricsCards";
import { PortalQuickActions } from "./PortalQuickActions";

export default function PortalDashboardPage() {
  const {
    data: dashboard,
    isLoading,
    isError,
    refetch,
  } = usePatientPortalDashboard();
  const { data: consentSettings } = usePatientConsentSettings();

  const whatsappConsentStatus = consentSettings?.whatsappConsent
    ? "WhatsApp granted"
    : "WhatsApp not granted";

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="My Health Dashboard"
          description="Appointments, prescriptions, bills, and consent — one portal surface."
        />
      }
    >
      <DataState
        status={isLoading ? "loading" : isError ? "error" : "success"}
        loadingMessage="Loading your dashboard…"
        errorMessage="We could not load your health overview. Please try again."
        onRetry={() => void refetch()}
      >
        <PortalMetricsCards
          dashboard={dashboard}
          whatsappConsentStatus={whatsappConsentStatus}
          consentSettings={consentSettings}
        />
        <PortalQuickActions />
      </DataState>
    </AppPageScaffold>
  );
}
