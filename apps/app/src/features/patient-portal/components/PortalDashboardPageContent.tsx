"use client";

import { usePatientPortalDashboard } from "@workspace/data-access";
import { usePatientConsentSettings } from "@workspace/data-access";
import { useTranslation } from "react-i18next";
import { AppPageScaffold, DataState, PageHeader } from "@workspace/ui/components";
import { PortalMetricsCards } from "./PortalMetricsCards";
import { PortalQuickActions } from "./PortalQuickActions";

export default function PortalDashboardPage() {
  const { t } = useTranslation("PatientPortal");
  const {
    data: dashboard,
    isLoading,
    isError,
    refetch,
  } = usePatientPortalDashboard();
  const { data: consentSettings } = usePatientConsentSettings();

  const whatsappConsentStatus = consentSettings?.whatsappConsent
    ? t("dashboard.whatsAppGranted")
    : t("dashboard.whatsAppNotGranted");

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title={t("dashboard.pageTitle")}
          description={t("dashboard.pageDescription")}
        />
      }
    >
      <DataState
        status={isLoading ? "loading" : isError ? "error" : "success"}
        loadingMessage={t("dashboard.loadingMessage")}
        errorMessage={t("dashboard.errorMessage")}
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
