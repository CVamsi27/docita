import { useRouter } from "next/navigation";
import Link from "next/link";
import { getPatientFullName } from "@workspace/utils";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { StatusBadge } from "@workspace/ui/components/indicators/status-badge";
import { ListRow } from "@workspace/ui/components/data-display/list-row";
import { DataTableColumn } from "@workspace/ui/components/data-display/data-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Eye,
  Printer,
} from "lucide-react";
import type { InvoiceListRow } from "@workspace/types";
import { DATE_FORMAT_OPTIONS_US_LONG, formatDate } from "@/lib/formatters";
import type {
  SortConfig,
  SortKey,
} from "@/features/invoices/hooks/use-invoices-logic";

function SortableHeader({
  label,
  column,
  sortConfig,
  onSort,
}: {
  label: string;
  column: SortKey;
  sortConfig: SortConfig | null;
  onSort: (key: SortKey) => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 hover:text-foreground"
// jscpd:ignore-start
      onClick={() => onSort(column)}
    >
      {label}
      {sortConfig?.key === column ? (
        sortConfig.direction === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </button>
// jscpd:ignore-end
  );
}

export function InvoiceNumberCell({ invoice }: { invoice: InvoiceListRow }) {
  return (
    <span className="font-medium">#{(invoice.id ?? "").substring(0, 8)}</span>
  );
}

export function PatientCell({ invoice }: { invoice: InvoiceListRow }) {
  return (
    <span className="block max-w-[140px] truncate sm:max-w-none">
      {invoice.patient ? getPatientFullName(invoice.patient) : "N/A"}
    </span>
  );
}

export function DateCell({ invoice }: { invoice: InvoiceListRow }) {
  if (!invoice.createdAt) return <span>N/A</span>;
  return (
    <span>{formatDate(invoice.createdAt, DATE_FORMAT_OPTIONS_US_LONG)}</span>
  );
}

export function AmountCell({
  invoice,
  formatCurrency,
}: {
  invoice: InvoiceListRow;
  formatCurrency: (amount: number | undefined) => string;
}) {
  return <span>{formatCurrency(invoice.totalAmount ?? invoice.total)}</span>;
}

export function StatusCell({ invoice }: { invoice: InvoiceListRow }) {
  return <StatusBadge status={invoice.status} />;
}

export function ActionsCell({
  invoice,
  onDownloadPdf,
}: {
  invoice: InvoiceListRow;
  onDownloadPdf: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <SymbolTooltip label="View details">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/invoices/${invoice.id}`}>
            <Eye className="h-4 w-4" />
            <span className="sr-only">View details</span>
          </Link>
        </Button>
      </SymbolTooltip>
      <SymbolTooltip label="Download PDF">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => invoice.id && onDownloadPdf(invoice.id)}
        >
          <Download className="h-4 w-4" />
          <span className="sr-only">Download PDF</span>
        </Button>
      </SymbolTooltip>
      <SymbolTooltip label="Print">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (!invoice.id) return;
            window.open(`/invoices/${invoice.id}?print=true`, "_blank");
          }}
        >
          <Printer className="h-4 w-4" />
          <span className="sr-only">Print</span>
        </Button>
      </SymbolTooltip>
    </div>
  );
}

export interface MobileCardProps {
  invoice: InvoiceListRow;
  formatCurrency: (amount: number | undefined) => string;
  onDownloadPdf: (id: string) => void;
}

export function MobileCard({
  invoice,
  formatCurrency,
  onDownloadPdf: _,
}: MobileCardProps) {
  const router = useRouter();

  return (
    <ListRow
      token={invoice.id ? `#${invoice.id.substring(0, 8)}` : undefined}
      title={invoice.patient ? getPatientFullName(invoice.patient) : "N/A"}
      meta={formatCurrency(invoice.totalAmount ?? invoice.total)}
      time={
        invoice.createdAt
          ? formatDate(invoice.createdAt, DATE_FORMAT_OPTIONS_US_LONG)
          : null
      }
      status={invoice.status}
      onClick={() => {
        if (invoice.id) router.push(`/invoices/${invoice.id}`);
      }}
    />
  );
}

export function getInvoiceColumns({
  formatCurrency,
  onDownloadPdf,
  sortConfig,
  onSort,
}: {
  formatCurrency: (amount: number | undefined) => string;
  onDownloadPdf: (id: string) => void;
  sortConfig: SortConfig | null;
  onSort: (key: SortKey) => void;
}): DataTableColumn<InvoiceListRow>[] {
  return [
    {
      id: "invoiceNumber",
      header: "Invoice #",
      hiddenOnMobile: true,
      cell: (invoice) => <InvoiceNumberCell invoice={invoice} />,
    },
    {
      id: "patient",
      header: (
        <SortableHeader
          label="Patient"
          column="patient"
          sortConfig={sortConfig}
          onSort={onSort}
        />
      ),
      cell: (invoice) => <PatientCell invoice={invoice} />,
    },
    {
      id: "date",
      header: (
        <SortableHeader
          label="Date"
          column="date"
          sortConfig={sortConfig}
          onSort={onSort}
        />
      ),
      hiddenOnMobile: true,
      cell: (invoice) => <DateCell invoice={invoice} />,
    },
    {
      id: "amount",
      header: (
        <SortableHeader
          label="Amount"
          column="amount"
          sortConfig={sortConfig}
          onSort={onSort}
        />
      ),
      cell: (invoice) => (
        <AmountCell invoice={invoice} formatCurrency={formatCurrency} />
      ),
    },
    {
      id: "status",
      header: (
        <SortableHeader
          label="Payment status"
          column="status"
          sortConfig={sortConfig}
          onSort={onSort}
        />
      ),
      cell: (invoice) => <StatusCell invoice={invoice} />,
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (invoice) => (
        <ActionsCell invoice={invoice} onDownloadPdf={onDownloadPdf} />
      ),
    },
  ];
}
