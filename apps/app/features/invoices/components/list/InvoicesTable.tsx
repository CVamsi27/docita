import { DataTable } from "@workspace/ui/components/data-display/data-table";
import { useTranslations } from "next-intl";
import {
  getInvoiceColumns,
  MobileCard,
  useInvoiceColumnLabels,
} from "./InvoicesTableSections";
import type { InvoiceListRow } from "@workspace/types";
import type { SortConfig, SortKey } from "@/features/invoices/hooks/use-invoices-logic";

export interface InvoicesTableProps {
  invoices: InvoiceListRow[];
  loading: boolean;
  formatCurrency: (amount: number | undefined) => string;
  sortConfig: SortConfig | null;
  onSort: (key: SortKey) => void;
  onDownloadPdf: (id: string) => void;
}

/**
 * Phase 3 (per-feature): apps/app Invoices > list table.
 * 5 literals converted to useTranslations("Invoices.table").
 */
export function InvoicesTable({
  invoices,
  loading,
  formatCurrency,
  sortConfig,
  onSort,
  onDownloadPdf,
}: InvoicesTableProps) {
  const t = useTranslations("Invoices.table");
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
      emptyTitle={t("emptyTitle")}
      emptyDescription={t("emptyDescription")}
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
