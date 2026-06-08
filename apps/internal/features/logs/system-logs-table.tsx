"use client";

import type { InternalSystemLog as SystemLog } from "@workspace/data-access/internal";
import {
  SystemLogsFilterBar,
  SystemLogsFilterSummary,
  SystemLogsPagination,
  SystemLogsResultsTable,
} from "./system-logs-table-sections";

interface SystemLogsTableProps {
  logs: SystemLog[];
  loading: boolean;
  totalCount: number;
  pageStart: number;
  pageEnd: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  selectedLevel: string;
  selectedModule: string;
  searchText: string;
  selectedLimit: 25 | 50 | 100;
  moduleOptions: string[];
  activeFilterCount: number;
  hasActiveFilters: boolean;
  moduleColumnWidthClass: string;
  onLevelChange: (value: string) => void;
  onModuleChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onLimitChange: (value: string) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onResetFilters: () => void;
}

export function SystemLogsTable({
  logs,
  loading,
  totalCount,
  pageStart,
  pageEnd,
  canGoPrevious,
  canGoNext,
  selectedLevel,
  selectedModule,
  searchText,
  selectedLimit,
  moduleOptions,
  activeFilterCount,
  hasActiveFilters,
  moduleColumnWidthClass,
  onLevelChange,
  onModuleChange,
  onSearchChange,
  onLimitChange,
  onPreviousPage,
  onNextPage,
  onResetFilters,
}: SystemLogsTableProps) {
  return (
    <>
      <SystemLogsFilterBar
        selectedLevel={selectedLevel}
        selectedModule={selectedModule}
        searchText={searchText}
        selectedLimit={selectedLimit}
        moduleOptions={moduleOptions}
        onLevelChange={onLevelChange}
        onModuleChange={onModuleChange}
        onSearchChange={onSearchChange}
        onLimitChange={onLimitChange}
      />

      <SystemLogsFilterSummary
        activeFilterCount={activeFilterCount}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={onResetFilters}
      />

      <SystemLogsResultsTable
        logs={logs}
        loading={loading}
        moduleColumnWidthClass={moduleColumnWidthClass}
      />

      <SystemLogsPagination
        loading={loading}
        totalCount={totalCount}
        pageStart={pageStart}
        pageEnd={pageEnd}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        onPreviousPage={onPreviousPage}
        onNextPage={onNextPage}
      />
    </>
  );
}
