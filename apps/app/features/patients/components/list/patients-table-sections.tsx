import type { Patient } from "@workspace/types";
import { Button } from "@workspace/ui/components/form/button";
import {
  Avatar,
  AvatarFallback,
} from "@workspace/ui/components/indicators/avatar";
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

export function getAriaSort(
  sortConfig: PatientsSortConfig | null,
  column: keyof Patient | "fullName",
) {
  if (sortConfig?.key !== column) {
    return "none" as const;
  }
  return sortConfig.direction === "asc" ? "ascending" : "descending";
}

export function SortIcon({
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

export function SortableHeader({
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

export function PatientMobileCard({
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
