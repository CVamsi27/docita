import type { Prescription } from "@workspace/types";
import { useTranslation } from "react-i18next";
import { PrescriptionsFilters } from "./PrescriptionsFilters";
import { PrescriptionsTable, type PrescriptionsTableProps } from "./PrescriptionsTable";

// SSOT: `loading` / `sortConfig` / `onSort` / `onDownloadPDF` are defined once
// on `PrescriptionsTableProps` and reused here via `Omit<…, "prescriptions">`
// (this component renders both the full and filtered+sorted lists, so it
// needs two `Prescription[]` props rather than the table's single one).
interface PrescriptionsListContentProps
  extends Omit<PrescriptionsTableProps, "prescriptions"> {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (iso: string) => void;
  onEndDateChange: (iso: string) => void;
  prescriptions: Prescription[];
  filteredAndSortedPrescriptions: Prescription[];
}

/**
 * Filters + table + result-count summary for the prescriptions list —
 * extracted from `PrescriptionsPageContent` so the page shell only chooses
 * between the error and loaded states.
 */
export function PrescriptionsListContent({
  searchQuery,
  setSearchQuery,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  prescriptions,
  filteredAndSortedPrescriptions,
  loading,
  sortConfig,
  onSort,
  onDownloadPDF,
}: PrescriptionsListContentProps) {
  const { t } = useTranslation("Prescriptions");
  return (
    <>
      <PrescriptionsFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
      />

      <PrescriptionsTable
        prescriptions={filteredAndSortedPrescriptions}
        loading={loading}
        sortConfig={sortConfig}
        onSort={onSort}
        onDownloadPDF={onDownloadPDF}
      />

      <p className="text-[var(--fs-xs)] text-muted-foreground">
        {t("showing", { filtered: filteredAndSortedPrescriptions.length, total: prescriptions.length })}
      </p>
    </>
  );
}
