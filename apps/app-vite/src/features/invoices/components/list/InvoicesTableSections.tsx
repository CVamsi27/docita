import { Link } from "react-router";
import { getPatientFullName } from "@workspace/utils";
import { useTranslation } from "react-i18next";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { StatusBadge } from "@workspace/ui/components/indicators/status-badge";
import {
  DataTableColumn,
} from "@workspace/ui/components/data-display/data-table.types";
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

/**
 * Display token for an invoice: the human invoice number when present,
 * otherwise a short slice of the id as a fallback. Matches the invoice
 * detail header so the list and detail views agree.
 */
function formatInvoiceToken(invoice: InvoiceListRow): string {
  return invoice.invoiceNumber ?? (invoice.id ?? "").substring(0, 8);
}

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
    <Button
      variant="ghost"
      size="sm"
      className="inline-flex items-center gap-1 hover:text-foreground"
      onClick={() => onSort(column)}
      aria-label={`Sort by ${label}`}
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
    </Button>
  );
}

export function InvoiceNumberCell({ invoice }: { invoice: InvoiceListRow }) {
  return (
    <span className="font-medium">#{formatInvoiceToken(invoice)}</span>
  );
}

export function PatientCell({ invoice }: { invoice: InvoiceListRow }) {
  const { t } = useTranslation("Invoices");
  return (
    <span className="block max-w-[140px] truncate sm:max-w-none">
      {invoice.patient ? getPatientFullName(invoice.patient) : t("table.notAvailable")}
    </span>
  );
}

export function DateCell({ invoice }: { invoice: InvoiceListRow }) {
  const { t } = useTranslation("Invoices");
  if (!invoice.createdAt) return <span>{t("table.notAvailable")}</span>;
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
  const { t } = useTranslation("Invoices");
  return (
    <div className="flex items-center justify-end gap-1">
      <SymbolTooltip label={t("table.viewDetailsTooltip")}>
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/invoices/${invoice.id}`}>
            <Eye className="h-4 w-4" />
            <span className="sr-only">{t("table.viewDetailsTooltip")}</span>
          </Link>
        </Button>
      </SymbolTooltip>
      <SymbolTooltip label={t("table.downloadPdfTooltip")}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (invoice.id) onDownloadPdf(invoice.id);
          }}
        >
          <Download className="h-4 w-4" />
          <span className="sr-only">{t("table.downloadPdfTooltip")}</span>
        </Button>
      </SymbolTooltip>
    </div>
  );
}

export function MobileCard({
  invoice,
  formatCurrency,
  onDownloadPdf,
}: {
  invoice: InvoiceListRow;
  formatCurrency: (amount: number | undefined) => string;
  onDownloadPdf: (id: string) => void;
}) {
  const { t } = useTranslation("Invoices");
  return (
    <div className="flex items-start justify-between gap-3 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">#{formatInvoiceToken(invoice)}</span>
          <StatusBadge status={invoice.status} size="sm" />
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {invoice.patient ? getPatientFullName(invoice.patient) : t("table.notAvailable")}
        </p>
        <p className="mt-1 text-sm font-semibold tabular-nums">
          {formatCurrency(invoice.totalAmount ?? invoice.total)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/invoices/${invoice.id}`}>
            <Eye className="h-4 w-4" />
            <span className="sr-only">{t("table.viewDetailsTooltip")}</span>
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (invoice.id) onDownloadPdf(invoice.id);
          }}
        >
          <Printer className="h-4 w-4" />
          <span className="sr-only">{t("table.printTooltip")}</span>
        </Button>
      </div>
    </div>
  );
}

export function useInvoiceColumnLabels() {
  const { t } = useTranslation("Invoices");
  return {
    invoiceNumber: t("table.invoiceNumberHeader"),
    patient: t("table.patientHeader"),
    date: t("table.dateHeader"),
    amount: t("table.amountHeader"),
    status: t("table.statusHeader"),
    actions: t("table.actionsHeader"),
  };
}

export function getInvoiceColumns({
  formatCurrency,
  onDownloadPdf,
  sortConfig,
  onSort,
  labels,
}: {
  formatCurrency: (amount: number | undefined) => string;
  onDownloadPdf: (id: string) => void;
  sortConfig: SortConfig | null;
  onSort: (key: SortKey) => void;
  labels: ReturnType<typeof useInvoiceColumnLabels>;
}): DataTableColumn<InvoiceListRow>[] {
  return [
    {
      id: "invoiceNumber",
      header: (
        <SortableHeader label={labels.invoiceNumber} column="date" sortConfig={sortConfig} onSort={onSort} />
      ),
      cell: (row) => <InvoiceNumberCell invoice={row} />,
    },
    {
      id: "patient",
      header: (
        <SortableHeader label={labels.patient} column="patient" sortConfig={sortConfig} onSort={onSort} />
      ),
      cell: (row) => <PatientCell invoice={row} />,
    },
    {
      id: "date",
      header: (
        <SortableHeader label={labels.date} column="date" sortConfig={sortConfig} onSort={onSort} />
      ),
      cell: (row) => <DateCell invoice={row} />,
      hiddenOnMobile: true,
    },
    {
      id: "amount",
      header: (
        <SortableHeader label={labels.amount} column="amount" sortConfig={sortConfig} onSort={onSort} />
      ),
      cell: (row) => <AmountCell invoice={row} formatCurrency={formatCurrency} />,
      align: "right",
    },
    {
      id: "status",
      header: (
        <SortableHeader label={labels.status} column="status" sortConfig={sortConfig} onSort={onSort} />
      ),
      cell: (row) => <StatusCell invoice={row} />,
    },
    {
      id: "actions",
      header: <span className="sr-only">{labels.actions}</span>,
      cell: (row) => <ActionsCell invoice={row} onDownloadPdf={onDownloadPdf} />,
      align: "right",
    },
  ];
}
