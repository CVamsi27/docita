"use client";

import { RefreshCw } from "lucide-react";
import { AppPageScaffold, Button, DataState, PageHeader } from "@workspace/ui/components";
import { useSystemLogs } from "./use-system-logs";
import { SystemLogsTable } from "./system-logs-table";

interface SystemLogsPageProps {
  title: string;
  description: string;
  defaultLimit: 25 | 50 | 100;
  moduleColumnWidthClass: string;
}
export function SystemLogsPage({
  title,
  description,
  defaultLimit,
  moduleColumnWidthClass,
}: SystemLogsPageProps) {
  const logs = useSystemLogs({ defaultLimit });
  return (
    <AppPageScaffold
      header={
        <PageHeader
          title={title}
          description={description}
          size="compact"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={logs.handleRefresh}
              disabled={logs.refreshing}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${logs.refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          }
        />
      }
    >
      <DataState
        status={logs.pageStatus}
        loadingMessage="Loading logs…"
        errorMessage={logs.errorMessage ?? undefined}
        onRetry={() => void logs.refetch()}
      >
        <SystemLogsTable
          logs={logs.logs}
          loading={logs.loading}
          totalCount={logs.totalCount}
          pageStart={logs.pageStart}
          pageEnd={logs.pageEnd}
          canGoPrevious={logs.canGoPrevious}
          canGoNext={logs.canGoNext}
          selectedLevel={logs.selectedLevel}
          selectedModule={logs.selectedModule}
          searchText={logs.searchText}
          selectedLimit={logs.selectedLimit}
          moduleOptions={logs.moduleOptions}
          activeFilterCount={logs.activeFilterCount}
          hasActiveFilters={logs.hasActiveFilters}
          moduleColumnWidthClass={moduleColumnWidthClass}
          onLevelChange={logs.handleLevelChange}
          onModuleChange={logs.handleModuleChange}
          onSearchChange={logs.handleSearchChange}
          onLimitChange={logs.handleLimitChange}
          onPreviousPage={logs.goToPreviousPage}
          onNextPage={logs.goToNextPage}
          onResetFilters={logs.handleResetFilters}
        />
      </DataState>
    </AppPageScaffold>
  );
}