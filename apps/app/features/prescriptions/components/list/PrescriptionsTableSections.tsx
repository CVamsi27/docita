import React from "react";
import Link from "next/link";
import { formatDate, getPatientFullName } from "@workspace/utils";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Eye,
  Pill,
  Printer,
} from "lucide-react";
import type { DataTableColumn } from "@workspace/ui/components/data-display/data-table";
import { ListRow } from "@workspace/ui/components/data-display/list-row";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { Badge } from "@workspace/ui/components/indicators/badge";
import type { Prescription } from "@workspace/types";

export type SortKey = "date" | "patient" | "diagnosis" | "medications";
export type SortDirection = "asc" | "desc";

export interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

export function SortableHeader({
  column,
  label,
  sortConfig,
  onSort,
}: {
  column: SortKey;
  label: string;
  sortConfig: SortConfig;
  onSort: (key: SortKey) => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onSort(column)}
      className="gap-1 h-8 px-0 font-medium hover:bg-transparent"
    >
      {label}
      {sortConfig.key === column ? (
        sortConfig.direction === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </Button>
  );
}

function getPatientName(prescription: Prescription) {
  return getPatientFullName(prescription.patient);
}

function PatientCell({ prescription }: { prescription: Prescription }) {
  const fullName = getPatientName(prescription);
  const phone = prescription.patient?.phoneNumber ?? "";
  return (
    <div className="flex min-w-0 flex-col">
      {fullName ? (
        <SymbolTooltip label={fullName}>
          <span className="truncate font-medium">{fullName}</span>
        </SymbolTooltip>
      ) : (
        <span className="truncate font-medium">—</span>
      )}
      {phone ? (
        <SymbolTooltip label={phone}>
          <span className="truncate text-xs text-muted-foreground sm:text-sm">
            {phone}
          </span>
        </SymbolTooltip>
      ) : null}
    </div>
  );
}

function DiagnosisCell({ prescription }: { prescription: Prescription }) {
  return (
    <span className="max-w-[200px] truncate">
      {prescription.diagnosis || "-"}
    </span>
  );
}

function MedicationsCell({ prescription }: { prescription: Prescription }) {
  return (
    <Badge variant="secondary">
      <Pill className="mr-1 h-3 w-3" />
      {prescription.medications?.length || 0} meds
    </Badge>
  );
}

function DateCell({ prescription }: { prescription: Prescription }) {
  return (
    <span className="whitespace-nowrap">
      {formatDate(prescription.createdAt, "MMM d, yyyy")}
    </span>
  );
}

function ActionsCell({
  prescription,
  onDownloadPDF,
}: {
  prescription: Prescription;
  onDownloadPDF: (id: string) => void;
}) {
  const handlePrint = () => {
    if (!prescription.id) return;
    window.open(
      `/prescriptions/${prescription.id}?print=true`,
      "_blank",
    );
  };

  return (
    <div className="flex items-center justify-end gap-1 whitespace-nowrap">
      <SymbolTooltip label="View prescription">
        <Button variant="ghost" size="sm" asChild className="gap-1.5">
          <Link
            href={`/prescriptions/${prescription.id}`}
            aria-label="View prescription"
          >
            <Eye className="h-4 w-4" aria-hidden />
            <span className="hidden lg:inline">View</span>
          </Link>
        </Button>
      </SymbolTooltip>
      <SymbolTooltip label="Download PDF">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDownloadPDF(prescription.id || "")}
          className="gap-1.5"
        >
          <Download className="h-4 w-4" />
          <span className="hidden lg:inline">PDF</span>
        </Button>
      </SymbolTooltip>
      <SymbolTooltip label="Print prescription">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrint}
          className="gap-1.5"
        >
          <Printer className="h-4 w-4" />
          <span className="hidden lg:inline">Print</span>
        </Button>
      </SymbolTooltip>
    </div>
  );
}

export function MobileCard({
  prescription,
  onDownloadPDF,
}: {
  prescription: Prescription;
  onDownloadPDF: (id: string) => void;
}) {
  const fullName = getPatientName(prescription) || "—";
  const handlePrint = () => {
    if (!prescription.id) return;
    window.open(
      `/prescriptions/${prescription.id}?print=true`,
      "_blank",
    );
  };

  return (
    <div className="ui-card-surface space-y-3 p-4">
      <ListRow
        title={fullName}
        meta={
          prescription.diagnosis ||
          prescription.patient?.phoneNumber ||
          undefined
        }
        time={formatDate(prescription.createdAt, "MMM d, yyyy")}
        showChevron={false}
        trailing={
          <Badge variant="secondary">
            <Pill className="mr-1 h-3 w-3" />
            {prescription.medications?.length || 0}
          </Badge>
        }
      />
      <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="flex-1 touch-manipulation"
        >
          <Link href={`/prescriptions/${prescription.id}`}>
            <Eye className="mr-1.5 h-4 w-4" />
            View
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 touch-manipulation"
          onClick={() => onDownloadPDF(prescription.id || "")}
        >
          <Download className="mr-1.5 h-4 w-4" />
          PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 touch-manipulation"
          onClick={handlePrint}
        >
          <Printer className="mr-1.5 h-4 w-4" />
          Print
        </Button>
      </div>
    </div>
  );
}

export function getPrescriptionColumns(
  sortConfig: SortConfig,
  onSort: (key: SortKey) => void,
  onDownloadPDF: (id: string) => void,
): DataTableColumn<Prescription>[] {
  return [
    {
      id: "id",
      header: "Prescription ID",
      hiddenOnMobile: true,
      cell: (prescription) => (
        <span className="font-mono text-sm">
          {(prescription.id || "").slice(0, 8).toUpperCase()}
        </span>
      ),
    },
    {
      id: "patient",
      header: (
        <SortableHeader
          column="patient"
          label="Patient"
          sortConfig={sortConfig}
          onSort={onSort}
        />
      ),
      cell: (prescription) => <PatientCell prescription={prescription} />,
    },
    {
      id: "diagnosis",
      header: (
        <SortableHeader
          column="diagnosis"
          label="Diagnosis"
          sortConfig={sortConfig}
          onSort={onSort}
        />
      ),
      hiddenOnMobile: true,
      cell: (prescription) => <DiagnosisCell prescription={prescription} />,
    },
    {
      id: "medications",
      header: (
        <SortableHeader
          column="medications"
          label="Medications"
          sortConfig={sortConfig}
          onSort={onSort}
        />
      ),
      cell: (prescription) => <MedicationsCell prescription={prescription} />,
    },
    {
      id: "date",
      header: (
        <SortableHeader
          column="date"
          label="Date"
          sortConfig={sortConfig}
          onSort={onSort}
        />
      ),
      hiddenOnMobile: true,
      cell: (prescription) => <DateCell prescription={prescription} />,
    },
    {
      id: "actions",
      header: "Actions",
      cell: (prescription) => (
        <ActionsCell
          prescription={prescription}
          onDownloadPDF={onDownloadPDF}
        />
      ),
    },
  ];
}
