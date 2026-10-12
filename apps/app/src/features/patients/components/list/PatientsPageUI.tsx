import { useTranslation } from "react-i18next";
import { AppPageScaffold, Button, DataState } from "@workspace/ui/components";
import { DebouncedSearchInput } from "@workspace/ui/components/form/debounced-search-input";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { PatientsPageHeader } from "./patients-page-header";
import { PatientsTable } from "./patients-table";
import type { PatientsPageUIProps } from "./patients-page-types";


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
  const { t } = useTranslation("Patients.list");
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

  // Server-paginated list: derive the visible row range from the page cursor so
  // the range stays correct even while the filtered rows on screen are sorted
  // client-side.
  const hasRows = filteredPatients.length > 0;
  const firstRowNumber = (currentPage - 1) * pageSize + 1;
  const lastRowNumber = firstRowNumber + filteredPatients.length - 1;

  if (showEmptyState) {
    return (
      <AppPageScaffold header={header}>
        <DataState
          status="empty"
          className="min-h-[40vh]"
          emptyIcon={Users}
          emptyTitle={t("emptyTitle")}
          emptyDescription={t("emptyDescription")}
          emptyAction={{ label: t("emptyAction"), onClick: onAddPatient }}
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
              placeholder={t("searchPlaceholder")}
              className="bg-background"
              value={searchQuery}
              onChange={onSearchChange}
            />
          </div>
          {searchQuery ? (
            <Button variant="ghost" size="sm" onClick={onClearSearch}>
              {t("clearSearch")}
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

        {/*
          Paging controls stay mounted even when the current page has no rows
          (a search that matches nothing on page 2+ must not strand the user),
          so only the range summary is conditional — a row range is meaningless
          with zero rows.
        */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {hasRows ? (
            <p className="text-sm text-muted-foreground tabular-nums">
              {t("paginationShowing", {
                count: totalPatients,
                start: firstRowNumber,
                end: lastRowNumber,
              })}
            </p>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={onPrevPage}
              disabled={!canGoPrev}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              {t("paginationPrevious")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={onNextPage}
              disabled={!canGoNext}
            >
              {t("paginationNext")}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </AppPageScaffold>
  );
}
