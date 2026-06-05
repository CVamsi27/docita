import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { DataTable } from "@workspace/ui/components/data-display/data-table";
import {
  getInvoiceColumns,
  MobileCard,
} from "./InvoicesTableSections";
import type { InvoiceListRow } from "@workspace/types";

export interface InvoicesTableProps {
  invoices: InvoiceListRow[];
  loading: boolean;
  formatCurrency: (amount: number | undefined) => string;
  onDownloadPdf: (id: string) => void;
}

export function InvoicesTable({
  invoices,
  loading,
  formatCurrency,
  onDownloadPdf,
}: InvoicesTableProps) {
  const columns = getInvoiceColumns({ formatCurrency, onDownloadPdf });

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
      </CardHeader>
      <CardContent>
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
        />
      </CardContent>
    </Card>
  );
}
