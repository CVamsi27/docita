import {
  AppPageScaffold,
  Button,
  DataState
} from "@workspace/ui/components";
import { DebouncedSearchInput } from "@workspace/ui/components/form/debounced-search-input";
import { Users } from "lucide-react";
import { PatientsPageHeader } from "./patients-page-header";
import { PatientsTable } from "./patients-table";
import type { PatientsPageUIProps } from "./patients-page-types";

export type { PatientsPageUIProps } from "./patients-page-types";

export function PatientsPageUI({
  isLoading,
  error,
  onRetry,
  searchQuery,
  sortConfig,
  filteredPatients,
  onSearchChange,
  onClearSearch,
  onSort,
  onViewPatient,
  onSchedulePatient,
  onEditPatient,
  onAddPatient,
  totalPatients,
  pageSize,
  currentPage,
  canGoPrev,
  canGoNext,
  onPrevPage,
  onNextPage,
  onOpenConsultationQueue,
}: PatientsPageUIProps) {
  const header = (
    <PatientsPageHeader
      onAddPatient={onAddPatient}
      onOpenConsultationQueue={onOpenConsultationQueue}
    />
  );

  if (error) {
    return (
      <AppPageScaffold header={header}>
        <DataState
          status="error"
          className="min-h-[40vh]"
          errorMessage={error}
          onRetry={onRetry}
        />
      </AppPageScaffold>
    );
  }

  const showEmptyState =
    !isLoading && filteredPatients.length === 0 && !searchQuery;

  if (showEmptyState) {
    return (
      <AppPageScaffold header={header}>
        <DataState
          status="empty"
          className="min-h-[40vh]"
          emptyIcon={Users}
          emptyTitle="No patients yet"
          emptyDescription="Add your first patient to start tracking their history, appointments, and prescriptions."
          emptyAction={{ label: "Add patient", onClick: onAddPatient }}
        />
      </AppPageScaffold>
    );
  }

  return (
    <AppPageScaffold header={header}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="max-w-sm flex-1">
            <DebouncedSearchInput
              placeholder="Enter name or phone"
              className="bg-background"
              value={searchQuery}
              onChange={onSearchChange}
            />
          </div>
          {searchQuery ? (
            <Button variant="ghost" size="sm" onClick={onClearSearch}>
              Clear
            </Button>
          ) : null}
        </div>

        <PatientsTable
          isLoading={isLoading}
          searchQuery={searchQuery}
          sortConfig={sortConfig}
          filteredPatients={filteredPatients}
          onSort={onSort}
          onViewPatient={onViewPatient}
          onSchedulePatient={onSchedulePatient}
          onEditPatient={onEditPatient}
        />

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm text-muted-foreground">
            <span className="hidden sm:inline">Page {currentPage} • </span>
            {totalPatients} patients
            <span className="hidden sm:inline"> (showing up to {pageSize})</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevPage}
              disabled={!canGoPrev}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground px-1">
              {currentPage}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onNextPage}
              disabled={!canGoNext}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </AppPageScaffold>
  );
}
