import { DataTable } from "@workspace/ui/components/data-display/data-table";
import { useTranslation } from "react-i18next";
import { MobileCard } from "./InvoicesTableSections";
import {
  getInvoiceColumns,
  useInvoiceColumnLabels,
} from "./invoices-table-helpers";
import type { InvoiceListRow } from "@workspace/types";
import type { SortConfig, SortKey } from "@/features/invoices/hooks/use-invoices-logic";

interface InvoicesTableProps {
  invoices: InvoiceListRow[];
  loading: boolean;
  formatCurrency: (amount: number | undefined) => string;
  sortConfig: SortConfig | null;
  onSort: (key: SortKey) => void;
  onDownloadPdf: (id: string) => void;
}

export function InvoicesTable({
  invoices,
  loading,
  formatCurrency,
  sortConfig,
  onSort,
  onDownloadPdf,
}: InvoicesTableProps) {
  const { t } = useTranslation("Invoices");
  const labels = useInvoiceColumnLabels();
  const columns = getInvoiceColumns({ formatCurrency, onDownloadPdf, sortConfig, onSort, labels });

  return (
    <DataTable<InvoiceListRow>
      columns={columns}
      data={invoices}
      rowKey={(invoice, index) =>
        invoice.id ?? `invoice-${invoice.createdAt ?? index}`
      }
      isLoading={loading}
      emptyTitle={t("table.emptyTitle")}
      emptyDescription={t("table.emptyDescription")}
      stackOnMobile
      mobileRenderer={(invoice) => (
        <MobileCard
          invoice={invoice}
          formatCurrency={formatCurrency}
          onDownloadPdf={onDownloadPdf}
        />
      )}
      className="ui-card-surface"
    />
  );
}
