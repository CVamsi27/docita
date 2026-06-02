import type { Patient } from "@workspace/types";
import { Button } from "@workspace/ui/components/form/button";
import {
  DataTable,
  type DataTableColumn,
} from "@workspace/ui/components/data-display/data-table";
import {
  Avatar,
  AvatarFallback,
} from "@workspace/ui/components/indicators/avatar";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { formatGenderLabel } from "@/lib/formatters";
import { getInitials } from "@/lib/formatters/text-helpers";
import { getPatientFullName } from "@workspace/utils";
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

function SortableHeader({
  label,
  column,
  sortConfig,
  onSort,
}: {
  label: string;
  column: keyof Patient | "fullName";
  sortConfig: PatientsSortConfig | null;
  onSort: (key: keyof Patient | "fullName") => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center hover:text-foreground"
      onClick={() => onSort(column)}
      aria-sort={getAriaSort(sortConfig, column)}
    >
      {label}
      <SortIcon sortConfig={sortConfig} column={column} />
    </button>
  );
}

function PatientMobileCard({
  patient,
  onViewPatient,
  onSchedulePatient,
  onEditPatient,
}: {
  patient: Patient;
  onViewPatient: (patientId: string) => void;
  onSchedulePatient: (patientId: string) => void;
  onEditPatient: (patient: Patient) => void;
}) {
  const patientId = patient.id;

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        className="flex min-w-0 items-center gap-3 text-left"
        onClick={() => patientId && onViewPatient(patientId)}
      >
        <Avatar className="h-9 w-9 shrink-0 border border-border/70 bg-background/70">
          <AvatarFallback>
            {getInitials(patient.firstName, patient.lastName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{getPatientFullName(patient)}</p>
          <p className="truncate text-sm text-muted-foreground">
            {patient.phoneNumber}
          </p>
          {patient.email ? (
            <p className="truncate text-xs text-muted-foreground">
              {patient.email}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {formatGenderLabel(patient.gender)}
          </p>
        </div>
      </button>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9 flex-1 touch-manipulation"
          onClick={() => patientId && onSchedulePatient(patientId)}
          disabled={!patientId}
        >
          <Calendar className="mr-1.5 h-4 w-4" />
          Schedule
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 flex-1 touch-manipulation"
          onClick={() => onEditPatient(patient)}
        >
          <Pencil className="mr-1.5 h-4 w-4" />
          Edit
        </Button>
      </div>
    </div>
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
  const columns: DataTableColumn<Patient>[] = [
    {
      id: "avatar",
      header: "",
      width: "50px",
      cell: (patient) => (
        <Avatar className="h-8 w-8 border border-border/70 bg-background/70 text-foreground">
          <AvatarFallback className="border border-border/70 bg-background/70 text-foreground">
            {getInitials(patient.firstName, patient.lastName)}
          </AvatarFallback>
        </Avatar>
      ),
    },
    {
      id: "name",
      header: (
        <SortableHeader
          label="Name"
          column="fullName"
          sortConfig={sortConfig}
          onSort={onSort}
        />
      ),
      cell: (patient) => (
        <span className="block max-w-[160px] truncate font-medium sm:max-w-xs">
          {getPatientFullName(patient)}
        </span>
      ),
    },
    {
      id: "contact",
      header: "Contact",
      hiddenOnMobile: true,
      cell: (patient) => (
        <div className="flex flex-col text-sm">
          <span>{patient.phoneNumber}</span>
          <span className="text-muted-foreground">{patient.email}</span>
        </div>
      ),
    },
    {
      id: "gender",
      header: (
        <SortableHeader
          label="Gender"
          column="gender"
          sortConfig={sortConfig}
          onSort={onSort}
        />
      ),
      hiddenOnMobile: true,
      cell: (patient) => formatGenderLabel(patient.gender),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (patient) => {
        const patientId = patient.id;
        return (
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
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={filteredPatients}
      rowKey={(patient, index) =>
        patient.id ?? `${getPatientFullName(patient, "patient")}-${index}`
      }
      isLoading={isLoading}
      emptyTitle="No patients found"
      emptyDescription={
        searchQuery
          ? `No patients found matching "${searchQuery}"`
          : "No patients found"
      }
      onRowClick={(patient) => {
        if (patient.id) {
          onViewPatient(patient.id);
        }
      }}
      stackOnMobile
      mobileRenderer={(patient) => (
        <PatientMobileCard
          patient={patient}
          onViewPatient={onViewPatient}
          onSchedulePatient={onSchedulePatient}
          onEditPatient={onEditPatient}
        />
      )}
      className="ui-card-surface"
    />
  );
}
