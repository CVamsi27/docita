import type { DataTableColumn } from "@workspace/ui/components/data-display/data-table";
import type { Prescription } from "@workspace/types";
import type { SortConfig, SortKey } from "./PrescriptionsTableSections";
import {
  ActionsCell,
  DateCell,
  DiagnosisCell,
  MedicationsCell,
  PatientCell,
  SortableHeader,
} from "./PrescriptionsTableSections";

export function getPrescriptionColumns(
  sortConfig: SortConfig, onSort: (key: SortKey) => void, onDownloadPDF: (id: string) => void, t: (key: string) => string,
): DataTableColumn<Prescription>[] {
  return [
    { id: "id", header: t("tableColumns.id"), hiddenOnMobile: true, cell: (p) => (
      <span className="font-mono text-sm">{(p.id || "").slice(0, 8).toUpperCase()}</span>
    ) },
    { id: "patient", header: <SortableHeader column="patient" label={t("tableColumns.patient")} sortConfig={sortConfig} onSort={onSort} />, cell: (p) => <PatientCell prescription={p} /> },
    { id: "diagnosis", header: <SortableHeader column="diagnosis" label={t("tableColumns.diagnosis")} sortConfig={sortConfig} onSort={onSort} />, hiddenOnMobile: true, cell: (p) => <DiagnosisCell prescription={p} /> },
    { id: "medications", header: <SortableHeader column="medications" label={t("tableColumns.medications")} sortConfig={sortConfig} onSort={onSort} />, cell: (p) => <MedicationsCell prescription={p} /> },
    { id: "date", header: <SortableHeader column="date" label={t("tableColumns.date")} sortConfig={sortConfig} onSort={onSort} />, hiddenOnMobile: true, cell: (p) => <DateCell prescription={p} /> },
    { id: "actions", header: t("tableColumns.actions"), cell: (p) => <ActionsCell prescription={p} onDownloadPDF={onDownloadPDF} /> },
  ];
}
