"use client";

import { useSystemLogsFilterState } from "./use-system-logs-filter-state";
import { useSystemLogsData } from "./use-system-logs-data";
import { useSystemLogsHandlers } from "./use-system-logs-handlers";

export function useSystemLogs({
  defaultLimit,
}: {
  defaultLimit: 25 | 50 | 100;
}) {
  const filters = useSystemLogsFilterState(defaultLimit);
  const data = useSystemLogsData(
    filters.logsParams,
    filters.selectedLevel,
    filters.selectedModule,
    filters.searchText,
    filters.selectedOffset,
    filters.selectedLimit,
  );
  const handlers = useSystemLogsHandlers({
    setRefreshing: filters.setRefreshing,
    setSelectedLevel: filters.setSelectedLevel,
    setSelectedModule: filters.setSelectedModule,
    setSearchText: filters.setSearchText,
    setSelectedLimit: filters.setSelectedLimit,
    setSelectedOffset: filters.setSelectedOffset,
    updateFilterParams: filters.updateFilterParams,
    refetch: () => data.logsQuery.refetch(),
    selectedOffset: filters.selectedOffset,
    selectedLimit: filters.selectedLimit,
    defaultLimit,
  });
  const pageStart = data.totalCount === 0 ? 0 : filters.selectedOffset + 1;
  const pageEnd =
    data.totalCount === 0 ? 0 : filters.selectedOffset + data.logs.length;
  const hasActiveFilters = data.activeFilterCount > 0;
  const pageStatus = data.loading
    ? ("loading" as const)
    : data.errorMessage
      ? ("error" as const)
      : ("success" as const);

  return {
    selectedLevel: filters.selectedLevel,
    selectedModule: filters.selectedModule,
    searchText: filters.searchText,
    selectedLimit: filters.selectedLimit,
    refreshing: filters.refreshing,
    logs: data.logs,
    totalCount: data.totalCount,
    loading: data.loading,
    errorMessage: data.errorMessage,
    moduleOptions: data.moduleOptions,
    activeFilterCount: data.activeFilterCount,
    hasActiveFilters,
    canGoPrevious: data.canGoPrevious,
    canGoNext: data.canGoNext,
    pageStart,
    pageEnd,
    pageStatus,
    refetch: () => data.logsQuery.refetch(),
    ...handlers,
  };
}
