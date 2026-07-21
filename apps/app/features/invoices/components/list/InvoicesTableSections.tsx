import { useRouter } from "next/navigation";
import Link from "next/link";
import { getPatientFullName } from "@workspace/utils";
import { useTranslations } from "next-intl";
import { Button, DataTableColumn, ListRow, StatusBadge, SymbolTooltip } from "@workspace/ui/components";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Eye, Printer } from "lucide-react";
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
    <span className="font-medium">#{formatInvoiceToken(invoice)}</span>
  );
}

export function PatientCell({ invoice }: { invoice: InvoiceListRow }) {
  const t = useTranslations("Invoices.table");
  return (
    <span className="block max-w-[140px] truncate sm:max-w-none">
      {invoice.patient ? getPatientFullName(invoice.patient) : t("notAvailable")}
    </span>
  );
}

export function DateCell({ invoice }: { invoice: InvoiceListRow }) {
  const t = useTranslations("Invoices.table");
  if (!invoice.createdAt) return <span>{t("notAvailable")}</span>;
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
  const t = useTranslations("Invoices.table");
  return (
    <div className="flex items-center justify-end gap-1">
      <SymbolTooltip label={t("viewDetailsTooltip")}>
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/invoices/${invoice.id}`}>
            <Eye className="h-4 w-4" />
            <span className="sr-only">{t("viewDetailsTooltip")}</span>
          </Link>
        </Button>
      </SymbolTooltip>
      <SymbolTooltip label={t("downloadPdfTooltip")}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => invoice.id && onDownloadPdf(invoice.id)}
        >
          <Download className="h-4 w-4" />
          <span className="sr-only">{t("downloadPdfTooltip")}</span>
        </Button>
      </SymbolTooltip>
      <SymbolTooltip label={t("printTooltip")}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (!invoice.id) return;
            window.open(`/invoices/${invoice.id}?print=true`, "_blank");
          }}
        >
          <Printer className="h-4 w-4" />
          <span className="sr-only">{t("printTooltip")}</span>
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
  const t = useTranslations("Invoices.table");

  return (
    <ListRow
      token={
        invoice.invoiceNumber || invoice.id
          ? `#${formatInvoiceToken(invoice)}`
          : undefined
      }
      title={invoice.patient ? getPatientFullName(invoice.patient) : t("notAvailable")}
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

/**
 * Phase 3 (per-feature): apps/app Invoices > list table sections.
 * The column factory accepts pre-translated label strings so it can stay a
 * plain (non-hook) function. The caller is a small component that calls
 * useTranslations and feeds the labels in.
 */
export interface InvoiceColumnLabels {
  invoiceNumber: string;
  patient: string;
  date: string;
  amount: string;
  status: string;
  actions: string;
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
  labels: InvoiceColumnLabels;
}): DataTableColumn<InvoiceListRow>[] {
  return [
    {
      id: "invoiceNumber",
      header: labels.invoiceNumber,
      hiddenOnMobile: true,
      cell: (invoice) => <InvoiceNumberCell invoice={invoice} />,
    },
    {
      id: "patient",
      header: (
        <SortableHeader
          label={labels.patient}
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
          label={labels.date}
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
          label={labels.amount}
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
          label={labels.status}
          column="status"
          sortConfig={sortConfig}
          onSort={onSort}
        />
      ),
      cell: (invoice) => <StatusCell invoice={invoice} />,
    },
    {
      id: "actions",
      header: labels.actions,
      align: "right",
      cell: (invoice) => (
        <ActionsCell invoice={invoice} onDownloadPdf={onDownloadPdf} />
      ),
    },
  ];
}

export function useInvoiceColumnLabels() {
  const t = useTranslations("Invoices.table");
  return {
    invoiceNumber: t("invoiceNumberHeader"),
    patient: t("patientHeader"),
    date: t("dateHeader"),
    amount: t("amountHeader"),
    status: t("statusHeader"),
    actions: t("actionsHeader"),
  };
}
