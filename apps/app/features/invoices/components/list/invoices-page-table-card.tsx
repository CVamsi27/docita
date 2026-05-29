"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
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
import {
  Download,
  Eye,
  MoreHorizontal,
  Printer,
} from "lucide-react";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { StatusBadge } from "@workspace/ui/components/indicators/status-badge";
import type { InvoiceListRow } from "@workspace/types";
import {
  DATE_FORMAT_OPTIONS_US_LONG,
  formatDate,
} from "@/lib/formatters";
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
          <div className="mb-4 space-y-3 md:hidden">
            {filteredInvoices.map((invoice) => {
              const paidSummary = buildInvoicePaidSummaryLine({
                status: invoice.status,
                paidAt: invoice.paidAt,
                paymentMethod: invoice.paymentMethod,
                formatDate,
              });
              return (
                <button
                  key={invoice.id ?? `invoice-mobile-${invoice.createdAt}`}
                  type="button"
                  className="ui-card-surface w-full space-y-2 p-4 text-left touch-manipulation"
                  onClick={() => {
                    if (invoice.id) router.push(`/invoices/${invoice.id}`);
                  }}
                >
                  <p className="font-medium truncate">
                    {invoice.patient
                      ? `${invoice.patient.firstName} ${invoice.patient.lastName}`
                      : "N/A"}
                  </p>
                  <p className="text-sm tabular-nums">
                    {formatCurrency(invoice.totalAmount ?? invoice.total)}
                  </p>
                  <StatusBadge status={invoice.status} />
                  {paidSummary ? (
                    <span className="ui-helper-text block">{paidSummary}</span>
                  ) : null}
                  {invoice.createdAt ? (
                    <span className="text-xs text-muted-foreground">
                      {formatDate(
                        invoice.createdAt,
                        DATE_FORMAT_OPTIONS_US_LONG,
                      )}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="ui-card-surface hidden overflow-x-auto overscroll-x-contain md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden md:table-cell">
                    Invoice #
                  </TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => {
                  const paidSummary = buildInvoicePaidSummaryLine({
                    status: invoice.status,
                    paidAt: invoice.paidAt,
                    paymentMethod: invoice.paymentMethod,
                    formatDate,
                  });
                  return (
                    <TableRow
                      key={invoice.id ?? `invoice-${Math.random()}`}
                      className="cursor-pointer"
                      onClick={() => {
                        if (invoice.id) router.push(`/invoices/${invoice.id}`);
                      }}
                    >
                      <TableCell className="hidden font-medium md:table-cell">
                        #{(invoice.id ?? "").substring(0, 8)}
                      </TableCell>
                      <TableCell className="max-w-[140px] sm:max-w-none">
                        <span className="block truncate">
                          {invoice.patient
                            ? `${invoice.patient.firstName} ${invoice.patient.lastName}`
                            : "N/A"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {invoice.createdAt
                          ? formatDate(
                              invoice.createdAt,
                              DATE_FORMAT_OPTIONS_US_LONG,
                            )
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(
                          invoice.totalAmount ?? invoice.total,
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-0.5">
                          <StatusBadge status={invoice.status} />
                          {paidSummary ? (
                            <span className="ui-helper-text">{paidSummary}</span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              Invoice actions
                            </TooltipContent>
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
                              onClick={() =>
                                invoice.id && handleDownloadPdf(invoice.id)
                              }
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                if (!invoice.id) return;
                                window.open(
                                  `/invoices/${invoice.id}?print=true`,
                                  "_blank",
                                );
                              }}
                            >
                              <Printer className="mr-2 h-4 w-4" />
                              Print
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/invoices/${invoice.id}/edit`}>
                                Edit Invoice
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </DataState>
      </CardContent>
    </Card>
  );
}
