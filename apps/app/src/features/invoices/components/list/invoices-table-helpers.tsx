import { useTranslation } from "react-i18next";
import type { DataTableColumn } from "@workspace/ui/components/data-display/data-table.types";
import type { InvoiceListRow } from "@workspace/types";
import type {
  SortConfig,
  SortKey,
} from "@/features/invoices/hooks/use-invoices-logic";
import {
  ActionsCell,
  AmountCell,
  DateCell,
  InvoiceNumberCell,
  PatientCell,
  SortableHeader,
  StatusCell,
} from "./InvoicesTableSections";

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
