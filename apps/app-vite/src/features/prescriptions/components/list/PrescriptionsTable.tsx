import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, DataTable } from "@workspace/ui/components";
import { getPrescriptionColumns, MobileCard } from "./PrescriptionsTableSections";
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
  const { t } = useTranslation("Prescriptions");
  const columns = getPrescriptionColumns(sortConfig, onSort, onDownloadPDF);

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle>{t("table.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable<Prescription>
          columns={columns}
          data={prescriptions}
          rowKey={(prescription, index) =>
            prescription.id ?? `prescription-${prescription.createdAt ?? index}`
          }
          isLoading={loading}
          emptyTitle={t("table.emptyTitle")}
          emptyDescription={t("table.emptyDescription")}
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
