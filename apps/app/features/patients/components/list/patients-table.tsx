import type { Patient } from "@workspace/types";
import { Button } from "@workspace/ui/components/form/button";
import { Skeleton } from "@workspace/ui/components/feedback/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import { Avatar, AvatarFallback } from "@workspace/ui/components/indicators/avatar";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { formatGenderLabel } from "@/lib/formatters";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  Pencil,
} from "lucide-react";
import type { PatientsSortConfig } from "./patients-page-types";

function getAriaSort(
  sortConfig: PatientsSortConfig | null,
  column: keyof Patient | "fullName",
) {
  if (sortConfig?.key !== column) {
    return "none" as const;
  }
  return sortConfig.direction === "asc" ? "ascending" : "descending";
}

function SortIcon({
  sortConfig,
  column,
}: {
  sortConfig: PatientsSortConfig | null;
  column: keyof Patient | "fullName";
}) {
  if (sortConfig?.key !== column) {
    return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
  }
  return sortConfig.direction === "asc" ? (
    <ArrowUp className="ml-2 h-4 w-4" />
  ) : (
    <ArrowDown className="ml-2 h-4 w-4" />
  );
}

export function PatientsTable({
  isLoading,
  searchQuery,
  sortConfig,
  filteredPatients,
  onSort,
  onViewPatient,
  onSchedulePatient,
  onEditPatient,
}: {
  isLoading: boolean;
  searchQuery: string;
  sortConfig: PatientsSortConfig | null;
  filteredPatients: Patient[];
  onSort: (key: keyof Patient | "fullName") => void;
  onViewPatient: (patientId: string) => void;
  onSchedulePatient: (patientId: string) => void;
  onEditPatient: (patient: Patient) => void;
}) {
  return (
    <div className="ui-card-surface overflow-x-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-muted/50">
            <TableHead className="w-[50px]" />
            <TableHead
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => onSort("fullName")}
              aria-sort={getAriaSort(sortConfig, "fullName")}
            >
              <div className="flex items-center">
                Name
                <SortIcon sortConfig={sortConfig} column="fullName" />
              </div>
            </TableHead>
            <TableHead className="hidden lg:table-cell">Contact</TableHead>
            <TableHead
              className="hidden sm:table-cell cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => onSort("gender")}
              aria-sort={getAriaSort(sortConfig, "gender")}
            >
              <div className="flex items-center">
                Gender
                <SortIcon sortConfig={sortConfig} column="gender" />
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
                    patient.id ?? `${patient.firstName}-${patient.lastName}`
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
  );
}
