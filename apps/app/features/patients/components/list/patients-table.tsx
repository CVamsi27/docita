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
import { getInitials } from "@/lib/formatters";
import { getPatientFullName } from "@workspace/utils";
import { Calendar, Pencil } from "lucide-react";
import type { PatientsSortConfig } from "./patients-page-types";
import {
  SortableHeader,
  PatientMobileCard,
} from "./patients-table-sections";

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
