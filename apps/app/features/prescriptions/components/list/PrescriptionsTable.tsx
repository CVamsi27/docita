import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { DataTable } from "@workspace/ui/components/data-display/data-table";
import {
  getPrescriptionColumns,
  MobileCard,
} from "./PrescriptionsTableSections";
import type { Prescription } from "@workspace/types";
import type { SortConfig, SortKey } from "./PrescriptionsTableSections";

export type { SortConfig, SortKey, SortDirection } from "./PrescriptionsTableSections";

export interface PrescriptionsTableProps {
  prescriptions: Prescription[];
  loading: boolean;
  sortConfig: SortConfig;
  onSort: (key: SortKey) => void;
  onDownloadPDF: (id: string) => void;
}

export function PrescriptionsTable({
  prescriptions,
  loading,
  sortConfig,
  onSort,
  onDownloadPDF,
}: PrescriptionsTableProps) {
  const columns = getPrescriptionColumns(sortConfig, onSort, onDownloadPDF);

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle>Prescriptions</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable<Prescription>
          columns={columns}
          data={prescriptions}
          rowKey={(prescription, index) =>
            prescription.id ?? `prescription-${prescription.createdAt ?? index}`
          }
          isLoading={loading}
          emptyTitle="No prescriptions found"
          emptyDescription="Prescriptions you create will appear here."
          stackOnMobile
          mobileRenderer={(prescription) => (
            <MobileCard
              prescription={prescription}
              onDownloadPDF={onDownloadPDF}
            />
          )}
        />
      </CardContent>
    </Card>
  );
}
