import { getPatientFullName } from "@workspace/utils";
import type { InvoiceListRow } from "@workspace/types";
import { Button, Card, CardContent, CardHeader, CardTitle, DataState, DataTable, ListRow, StatusBadge, type DataTableColumn } from "@workspace/ui/components";
import { DATE_FORMAT_OPTIONS_US_LONG, formatDate } from "@/lib/formatters";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router";

export interface DeskOpenInvoicesProps {
  selectedPatientId: string | null;
  invoices: InvoiceListRow[];
  loading: boolean;
  error: boolean;
  canRecordPayment: boolean;
  isRecordingPayment: boolean;
  formatMoney: (amount: number | undefined) => string;
  onRetry: () => void;
  onRecordPayment: (invoice: InvoiceListRow) => void;
}

export function DeskOpenInvoices({
  selectedPatientId,
  invoices,
  loading,
  error,
  canRecordPayment,
  isRecordingPayment,
  formatMoney,
  onRetry,
  onRecordPayment,
}: DeskOpenInvoicesProps) {
  if (!selectedPatientId) return (
      <Card className="border-border shadow-sm">
        <CardContent className="py-10 text-center text-[var(--fs-sm)] text-muted-foreground">
          Search for a patient above to see their open invoices that need
          payment.
        </CardContent>
      </Card>
    );

  if (error) {
    return (
      <DataState
        status="error"
        className="min-h-[30vh]"
        errorMessage="We could not load invoices. Please try again."
        onRetry={onRetry}
      />
    );
  }

  const columns: DataTableColumn<InvoiceListRow>[] = [
    {
      id: "invoiceNumber",
      header: "Invoice #",
      hiddenOnMobile: true,
      cell: (invoice) => (
        <span className="font-medium">
          {invoice.invoiceNumber
            ? `#${invoice.invoiceNumber}`
            : invoice.id
              ? `#${invoice.id.slice(0, 8)}`
              : "—"}
        </span>
      ),
    },
    {
      id: "patient",
      header: "Patient",
      cell: (invoice) => (
        <span className="block max-w-[120px] truncate sm:max-w-none">
          {invoice.patient ? getPatientFullName(invoice.patient) : "N/A"}
        </span>
      ),
    },
    {
      id: "date",
      header: "Date",
      hiddenOnMobile: true,
      cell: (invoice) =>
        invoice.createdAt
          ? formatDate(invoice.createdAt, DATE_FORMAT_OPTIONS_US_LONG)
          : "N/A",
    },
    {
      id: "amount",
      header: "Amount",
      cell: (invoice) => formatMoney(invoice.total ?? invoice.grandTotal),
    },
    {
      id: "status",
      header: "Status",
      cell: (invoice) => <StatusBadge status={invoice.status} />,
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (invoice) => (
        <div className="flex items-center justify-end gap-2">
          <Link
            to={`/invoices/${invoice.id}`}
            className="inline-flex items-center gap-1 text-[var(--fs-xs)] text-primary hover:underline"
          >
            View
            <ExternalLink className="size-3" aria-hidden />
          </Link>
          {canRecordPayment ? (
            <Button
              type="button"
              size="sm"
              disabled={isRecordingPayment}
              onClick={(e) => {
                e.stopPropagation();
                onRecordPayment(invoice);
              }}
            >
              Collect
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle>Open invoices</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable<InvoiceListRow>
          columns={columns}
          data={invoices}
          rowKey={(invoice, index) =>
            invoice.id ?? `invoice-${invoice.invoiceNumber ?? index}`
          }
          isLoading={loading}
          emptyTitle="No open invoices"
          emptyDescription="This patient has no pending, partially paid, or overdue invoices."
          stackOnMobile
          mobileRenderer={(invoice) => (
            <ListRow
              token={
                invoice.invoiceNumber
                  ? `#${invoice.invoiceNumber}`
                  : invoice.id
                    ? `#${invoice.id.slice(0, 8)}`
                    : undefined
              }
              title={
                invoice.patient
                  ? getPatientFullName(invoice.patient)
                  : "N/A"
              }
              meta={formatMoney(invoice.total ?? invoice.grandTotal)}
              time={
                invoice.createdAt
                  ? formatDate(invoice.createdAt, DATE_FORMAT_OPTIONS_US_LONG)
                  : null
              }
              status={invoice.status}
            />
          )}
        />
      </CardContent>
    </Card>
  );
}
