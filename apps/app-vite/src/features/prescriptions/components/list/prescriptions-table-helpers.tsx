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
  sortConfig: SortConfig, onSort: (key: SortKey) => void, onDownloadPDF: (id: string) => void,
): DataTableColumn<Prescription>[] {
  return [
    { id: "id", header: "Prescription ID", hiddenOnMobile: true, cell: (p) => (
      <span className="font-mono text-sm">{(p.id || "").slice(0, 8).toUpperCase()}</span>
    ) },
    { id: "patient", header: <SortableHeader column="patient" label="Patient" sortConfig={sortConfig} onSort={onSort} />, cell: (p) => <PatientCell prescription={p} /> },
    { id: "diagnosis", header: <SortableHeader column="diagnosis" label="Diagnosis" sortConfig={sortConfig} onSort={onSort} />, hiddenOnMobile: true, cell: (p) => <DiagnosisCell prescription={p} /> },
    { id: "medications", header: <SortableHeader column="medications" label="Medications" sortConfig={sortConfig} onSort={onSort} />, cell: (p) => <MedicationsCell prescription={p} /> },
    { id: "date", header: <SortableHeader column="date" label="Date" sortConfig={sortConfig} onSort={onSort} />, hiddenOnMobile: true, cell: (p) => <DateCell prescription={p} /> },
    { id: "actions", header: "Actions", cell: (p) => <ActionsCell prescription={p} onDownloadPDF={onDownloadPDF} /> },
  ];
}
