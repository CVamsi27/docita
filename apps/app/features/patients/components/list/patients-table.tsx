import type { Patient } from "@workspace/types";
import { Avatar, AvatarFallback, Button, DataTable, SymbolTooltip, type DataTableColumn } from "@workspace/ui/components";
import { formatGenderLabel } from "@/lib/formatters";
import { getInitials } from "@/lib/formatters";
import { getPatientFullName } from "@workspace/utils";
import { Calendar, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PatientsSortConfig } from "./patients-page-types";
import { SortableHeader, PatientMobileCard } from "./patients-table-sections";

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
  const t = useTranslations("Patients.list");
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
          label={t("tableColumnName")}
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
      header: t("tableColumnContact"),
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
          label={t("tableColumnGender")}
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
      header: t("tableColumnActions"),
      align: "right",
      cell: (patient) => {
        const patientId = patient.id;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <SymbolTooltip label={t("scheduleAria")}>
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
                <span className="hidden sm:inline">{t("scheduleLabel")}</span>
              </Button>
            </SymbolTooltip>
            <SymbolTooltip label={t("editAria")}>
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
                <span className="hidden sm:inline">{t("editLabel")}</span>
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
      emptyTitle={t("tableEmptyTitle")}
      emptyDescription={
        searchQuery
          ? t("tableEmptyDescription", { query: searchQuery })
          : t("tableEmptyDescriptionFallback")
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
