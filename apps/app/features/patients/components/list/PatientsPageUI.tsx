import type { Patient } from "@workspace/types";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { Button } from "@workspace/ui/components/button";
import { DataState } from "@workspace/ui/components/data-state";
import { DebouncedSearchInput } from "@workspace/ui/components/debounced-search-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  Pencil,
  Stethoscope,
  UserPlus,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { SymbolTooltip } from "@workspace/ui/components/tooltip";
import { formatGenderLabel } from "@/lib/formatters";

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

        <div className="ui-card-surface overflow-x-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted/50">
                <TableHead className="w-[50px]" />
                <TableHead
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => onSort("fullName")}
                  aria-sort={getAriaSort("fullName")}
                >
                  <div className="flex items-center">
                    Name
                    <SortIcon column="fullName" />
                  </div>
                </TableHead>
                <TableHead className="hidden lg:table-cell">Contact</TableHead>
                <TableHead
                  className="hidden sm:table-cell cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => onSort("gender")}
                  aria-sort={getAriaSort("gender")}
                >
                  <div className="flex items-center">
                    Gender
                    <SortIcon column="gender" />
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, row) => (
                  <TableRow
                    key={`skeleton-${row}`}
                    className="hover:bg-transparent"
                  >
                    <TableCell>
                      <Skeleton variant="circular" className="h-8 w-8" />
                    </TableCell>
                    <TableCell className="max-w-[160px] sm:max-w-xs">
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-44" />
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Skeleton className="h-8 w-20 rounded-md" />
                        <Skeleton className="h-8 w-9 rounded-md" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredPatients.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {searchQuery
                      ? `No patients found matching "${searchQuery}"`
                      : "No patients found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPatients.map((patient) => {
                  const patientId = patient.id;

                  return (
                    <TableRow
                      key={
                        patient.id ??
                        `${patient.firstName}-${patient.lastName}`
                      }
                      className="cursor-pointer hover:bg-muted/50"
                      tabIndex={patientId ? 0 : -1}
                      onKeyDown={(event) => {
                        if (!patientId) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onViewPatient(patientId);
                        }
                      }}
                      onClick={() => {
                        if (patientId) {
                          onViewPatient(patientId);
                        }
                      }}
                    >
                      <TableCell>
                        <Avatar className="h-8 w-8 border border-border/70 bg-background/70 text-foreground">
                          <AvatarFallback className="border border-border/70 bg-background/70 text-foreground">
                            {patient.firstName.charAt(0)}
                            {patient.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium max-w-[160px] sm:max-w-xs">
                        <span className="truncate block">
                          {patient.firstName} {patient.lastName}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-col text-sm">
                          <span>{patient.phoneNumber}</span>
                          <span className="text-muted-foreground">
                            {patient.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {formatGenderLabel(patient.gender)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <SymbolTooltip label="Schedule appointment">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (patientId) {
                                  onSchedulePatient(patientId);
                                }
                              }}
                              disabled={!patientId}
                            >
                              <Calendar className="h-4 w-4" />
                              <span className="hidden sm:inline">Schedule</span>
                            </Button>
                          </SymbolTooltip>
                          <SymbolTooltip label="Edit patient">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditPatient(patient);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="hidden sm:inline">Edit</span>
                            </Button>
                          </SymbolTooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

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
