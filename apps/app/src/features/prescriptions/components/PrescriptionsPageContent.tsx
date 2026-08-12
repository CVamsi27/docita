import { useTranslation } from "react-i18next";
import { AppPageScaffold, DataState, PageHeader } from "@workspace/ui/components";
import { FeatureGate } from "@/components/auth/feature-gate";
import { Feature } from "@workspace/types";
import { PrescriptionsListContent } from "./list/PrescriptionsListContent";
import { PrescriptionsUpgradeFallback } from "./PrescriptionsUpgradeFallback";
import { usePrescriptionsPageState } from "../hooks/use-prescriptions-page-state";

export function PrescriptionsPageContent() {
  const { t } = useTranslation("Prescriptions");
  const {
    searchQuery,
    setSearchQuery,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    loading,
    isError,
    refetch,
    sortConfig,
    handleSort,
    downloadPDF,
    prescriptions,
    headerDescription,
    filteredAndSortedPrescriptions,
  } = usePrescriptionsPageState();

  return (
    <FeatureGate
      feature={Feature.DIGITAL_PRESCRIPTIONS}
      fallback={<PrescriptionsUpgradeFallback />}
    >
      <AppPageScaffold
        header={
          <PageHeader title={t("pageTitle")} description={headerDescription} />
        }
      >
        {isError ? (
          <DataState
            status="error"
            className="min-h-[40vh]"
            errorMessage={t("error")}
            onRetry={() => void refetch()}
          />
        ) : (
          <PrescriptionsListContent
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            prescriptions={prescriptions}
            filteredAndSortedPrescriptions={filteredAndSortedPrescriptions}
            loading={loading}
            sortConfig={sortConfig}
            onSort={handleSort}
            onDownloadPDF={downloadPDF}
          />
        )}
      </AppPageScaffold>
    </FeatureGate>
  );
}
