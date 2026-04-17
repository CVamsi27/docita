import type { Patient } from "@workspace/types";
import { Button } from "@workspace/ui/components/button";
import { DebouncedSearchInput } from "@workspace/ui/components/debounced-search-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Card, CardContent } from "@workspace/ui/components/card";
import { PageContainer } from "@workspace/ui/components/page-container";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  Pencil,
  UserPlus,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";

type PatientsSortConfig = {
  key: keyof Patient | "fullName";
  direction: "asc" | "desc";
};

interface PatientsPageUIProps {
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  sortConfig: PatientsSortConfig | null;
  filteredPatients: Patient[];
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onSort: (key: keyof Patient | "fullName") => void;
  onViewPatient: (patientId: string) => void;
  onSchedulePatient: (patientId: string) => void;
  onEditPatient: (patient: Patient) => void;
  onAddPatient: () => void;
  totalPatients: number;
  pageSize: number;
  currentPage: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export function PatientsPageUI({
  isLoading,
  error,
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
}: PatientsPageUIProps) {
  const getAriaSort = (column: keyof Patient | "fullName") => {
    if (sortConfig?.key !== column) {
      return "none" as const;
    }
    return sortConfig.direction === "asc" ? "ascending" : "descending";
  };

  const SortIcon = ({ column }: { column: keyof Patient | "fullName" }) => {
    if (sortConfig?.key !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader
        title="Patients"
        description="Manage your patient records and history"
        actions={
          <Button onClick={onAddPatient} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add Patient
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="max-w-sm flex-1">
              <DebouncedSearchInput
                placeholder="Search by name or phone"
                className="bg-background"
                value={searchQuery}
                onChange={onSearchChange}
              />
            </div>
            {searchQuery && (
              <Button variant="ghost" size="sm" onClick={onClearSearch}>
                Clear
              </Button>
            )}
          </div>

          {error && (
            <div className="mb-6 rounded-md border border-destructive/20 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="overflow-x-auto rounded-md border border-border">
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
                  <TableHead className="hidden lg:table-cell">
                    Contact
                  </TableHead>
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
                  <TableRow>
                    <TableCell colSpan={5} className="h-24">
                      <div className="space-y-2 px-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </TableCell>
                  </TableRow>
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
                          <Avatar className="h-8 w-8 bg-primary/10 text-primary">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {patient.firstName.charAt(0)}
                              {patient.lastName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium max-w-[160px] sm:max-w-xs">
                          <span className="truncate block">{patient.firstName} {patient.lastName}</span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex flex-col text-sm">
                            <span>{patient.phoneNumber}</span>
                            <span className="text-muted-foreground">
                              {patient.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell capitalize">
                          {patient.gender}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
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
                              title="Schedule appointment"
                            >
                              <Calendar className="h-4 w-4" />
                              <span className="hidden sm:inline">Schedule</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditPatient(patient);
                              }}
                              title="Edit patient"
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="hidden sm:inline">Edit</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
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
              <span className="text-xs text-muted-foreground px-1">{currentPage}</span>
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
        </CardContent>
      </Card>
    </PageContainer>
  );
}
