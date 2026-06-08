"use client";

import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { FeatureGate } from "@/components/auth/feature-gate";
import { Feature } from "@/lib/stores/permission-store";
import { PrescriptionsListContent } from "./list/PrescriptionsListContent";
import { PrescriptionsUpgradeFallback } from "./PrescriptionsUpgradeFallback";
import { usePrescriptionsPageState } from "./use-prescriptions-page-state";

export function PrescriptionsPageContent() {
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
          <PageHeader title="Prescriptions" description={headerDescription} />
        }
      >
        {isError ? (
          <DataState
            status="error"
            className="min-h-[40vh]"
            errorMessage="We could not load prescriptions. Please try again."
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
