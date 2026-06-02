"use client";

import { getPatientFullName } from "@workspace/utils";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/overlay/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/overlay/tooltip";
import { Download, Eye, MoreHorizontal, Printer } from "lucide-react";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import {
  DataTable,
  type DataTableColumn,
} from "@workspace/ui/components/data-display/data-table";
import { ListRow } from "@workspace/ui/components/data-display/list-row";
import { StatusBadge } from "@workspace/ui/components/indicators/status-badge";
import type { InvoiceListRow } from "@workspace/types";
import { DATE_FORMAT_OPTIONS_US_LONG, formatDate } from "@/lib/formatters";
import { buildInvoicePaidSummaryLine } from "@/features/invoices/lib/invoice-payment-display";

export function InvoicesPageTableCard({
  listStatus,
  errorMessage,
  onRetry,
  hasActiveFilters,
  filteredInvoices,
  formatCurrency,
  handleDownloadPdf,
}: {
  listStatus: "loading" | "error" | "empty" | "success";
  errorMessage?: string;
  onRetry: () => void;
  hasActiveFilters: boolean;
  filteredInvoices: InvoiceListRow[];
  formatCurrency: (amount: number | undefined) => string;
  handleDownloadPdf: (id: string) => void;
}) {
  const router = useRouter();

  const columns: DataTableColumn<InvoiceListRow>[] = [
    {
      id: "invoiceNumber",
      header: "Invoice #",
      hiddenOnMobile: true,
      cell: (invoice) => (
        <span className="font-medium">
          #{(invoice.id ?? "").substring(0, 8)}
        </span>
      ),
    },
    {
      id: "patient",
      header: "Patient",
      cell: (invoice) => (
        <span className="block max-w-[140px] truncate sm:max-w-none">
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
      cell: (invoice) => formatCurrency(invoice.totalAmount ?? invoice.total),
    },
    {
      id: "status",
      header: "Payment status",
      cell: (invoice) => {
        const paidSummary = buildInvoicePaidSummaryLine({
          status: invoice.status,
          paidAt: invoice.paidAt,
          paymentMethod: invoice.paymentMethod,
          formatDate,
        });
        return (
          <div className="flex flex-col items-start gap-0.5">
            <StatusBadge status={invoice.status} />
            {paidSummary ? (
              <span className="ui-helper-text">{paidSummary}</span>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (invoice) => (
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Invoice actions</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/invoices/${invoice.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => invoice.id && handleDownloadPdf(invoice.id)}
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (!invoice.id) return;
                window.open(`/invoices/${invoice.id}?print=true`, "_blank");
              }}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/invoices/${invoice.id}/edit`}>Edit Invoice</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="ui-section-title">Recent invoices</CardTitle>
      </CardHeader>
      <CardContent>
        <DataState
          status={listStatus}
          loadingMessage="Loading invoices…"
          errorMessage={errorMessage}
          onRetry={onRetry}
          emptyTitle={
            hasActiveFilters ? "No matching invoices" : "No invoices yet"
          }
          emptyDescription={
            hasActiveFilters
              ? "Try clearing the status filter or search, then refresh."
              : "Create an invoice from a visit or use Create Invoice when you are ready to bill."
          }
        >
          <DataTable
            columns={columns}
            data={filteredInvoices}
            rowKey={(invoice, index) =>
              invoice.id ?? `invoice-${invoice.createdAt ?? index}`
            }
            emptyTitle={
              hasActiveFilters ? "No matching invoices" : "No invoices yet"
            }
            onRowClick={(invoice) => {
              if (invoice.id) router.push(`/invoices/${invoice.id}`);
            }}
            stackOnMobile
            mobileRenderer={(invoice) => {
              const paidSummary = buildInvoicePaidSummaryLine({
                status: invoice.status,
                paidAt: invoice.paidAt,
                paymentMethod: invoice.paymentMethod,
                formatDate,
              });
              return (
                <ListRow
                  token={
                    invoice.id ? `#${invoice.id.substring(0, 8)}` : undefined
                  }
                  title={
                    invoice.patient
                      ? getPatientFullName(invoice.patient)
                      : "N/A"
                  }
                  meta={formatCurrency(invoice.totalAmount ?? invoice.total)}
                  time={
                    invoice.createdAt
                      ? formatDate(
                          invoice.createdAt,
                          DATE_FORMAT_OPTIONS_US_LONG,
                        )
                      : null
                  }
                  status={invoice.status}
                  onClick={() => {
                    if (invoice.id) router.push(`/invoices/${invoice.id}`);
                  }}
                >
                  {paidSummary ? (
                    <span className="ui-helper-text mt-0.5 block truncate">
                      {paidSummary}
                    </span>
                  ) : null}
                </ListRow>
              );
            }}
            className="ui-card-surface"
          />
        </DataState>
      </CardContent>
    </Card>
  );
}
