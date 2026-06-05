import { DataTable } from "@workspace/ui/components/data-display/data-table";
import {
  getInvoiceColumns,
  MobileCard,
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

export function InvoicesTable({
  invoices,
  loading,
  formatCurrency,
  sortConfig,
  onSort,
  onDownloadPdf,
}: InvoicesTableProps) {
  const columns = getInvoiceColumns({ formatCurrency, onDownloadPdf, sortConfig, onSort });

  return (
    <DataTable<InvoiceListRow>
      columns={columns}
      data={invoices}
      rowKey={(invoice, index) =>
        invoice.id ?? `invoice-${invoice.createdAt ?? index}`
      }
      isLoading={loading}
      emptyTitle="No invoices found"
      emptyDescription="Invoices you create will appear here."
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
