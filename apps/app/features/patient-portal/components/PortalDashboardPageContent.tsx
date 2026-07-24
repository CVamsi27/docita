"use client";

import { usePatientPortalDashboard } from "@workspace/data-access";
import { usePatientConsentSettings } from "@workspace/data-access";
import { useTranslations } from "next-intl";
import { AppPageScaffold, DataState, PageHeader } from "@workspace/ui/components";
import { PortalMetricsCards } from "./PortalMetricsCards";
import { PortalQuickActions } from "./PortalQuickActions";

export default function PortalDashboardPage() {
  const t = useTranslations("PatientPortal.dashboard");
  const {
    data: dashboard,
    isLoading,
    isError,
    refetch,
  } = usePatientPortalDashboard();
  const { data: consentSettings } = usePatientConsentSettings();

  const whatsappConsentStatus = consentSettings?.whatsappConsent
    ? t("whatsAppGranted")
    : t("whatsAppNotGranted");

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title={t("pageTitle")}
          description={t("pageDescription")}
        />
      }
    >
      <DataState
        status={isLoading ? "loading" : isError ? "error" : "success"}
        loadingMessage={t("loadingMessage")}
        errorMessage={t("errorMessage")}
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
