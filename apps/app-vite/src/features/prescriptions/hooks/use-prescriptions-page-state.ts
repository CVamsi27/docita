import { useMemo, useState } from "react";
import {
  useDownloadPrescriptionPDF,
  usePrescriptions,
} from "@workspace/data-access";
import type { SortKey } from "@/features/prescriptions/components/list/PrescriptionsTableSections";
import {
  buildPrescriptionsHeaderDescription,
  filterPrescriptionsBySearch,
  sortPrescriptions,
  type PrescriptionsSortConfig,
} from "@/features/prescriptions/lib/prescriptions-page-helpers";
import { usePrescriptionsFilters } from "./use-prescriptions-filters";

/**
 * Owns the prescriptions page's query and derived list state (search-filtered
 * + sorted rows, header copy) on top of `usePrescriptionsFilters` — extracted
 * from `PrescriptionsPageContent` so the component stays a thin layout shell.
 */
export function usePrescriptionsPageState() {
  const filters = usePrescriptionsFilters();
  const {
    isDoctorRole,
    clinicToday,
    searchQuery,
    setSearchQuery,
    patientId,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    debouncedSearch,
    hasDateRange,
  } = filters;

  const {
    data: prescriptionsData = [],
    isLoading: loading,
    isError,
    refetch,
  } = usePrescriptions({
    search: debouncedSearch || undefined,
    patientId: patientId.trim() ? patientId : undefined,
    ...(hasDateRange ? { startDate, endDate } : {}),
  });
  const [sortConfig, setSortConfig] = useState<PrescriptionsSortConfig>({
    key: "date",
    direction: "desc",
  });

  const { mutate: downloadPDF } = useDownloadPrescriptionPDF();

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const prescriptions = useMemo(
    () => filterPrescriptionsBySearch(prescriptionsData, debouncedSearch),
    [prescriptionsData, debouncedSearch],
  );

  const headerDescription = useMemo(
    () =>
      buildPrescriptionsHeaderDescription({
        hasDateRange,
        startDate,
        endDate,
        clinicToday,
        patientId,
        isDoctorRole,
      }),
    [endDate, hasDateRange, isDoctorRole, patientId, startDate, clinicToday],
  );

  const filteredAndSortedPrescriptions = useMemo(
    () => sortPrescriptions(prescriptions, sortConfig),
    [prescriptions, sortConfig],
  );

  return {
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
  };
}
