"use client";

import { FC, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Download,
  Eye,
  Filter,
  MoreHorizontal,
  Plus,
  Printer,
  RefreshCw,
} from "lucide-react";
import { Input } from "@workspace/ui/components/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { useInvoicesLogic } from "@/features/invoices/hooks/use-invoices-logic";
import {
  DATE_FORMAT_OPTIONS_US_LONG,
  formatDate,
} from "@/lib/formatters";
import Link from "next/link";
import { DataState } from "@workspace/ui/components/data-state";
import { StatusBadge } from "@workspace/ui/components/status-badge";
import { Invoice, Patient } from "@workspace/types";
import { useClinicCurrency } from "@/hooks/use-clinic-currency";
import { buildInvoicePaidSummaryLine } from "@/features/invoices/lib/invoice-payment-display";

type InvoiceWithPatient = Invoice & {
  patient?: Pick<Patient, "firstName" | "lastName">;
  total?: number;
};

export const InvoicesPageUI: FC = () => {
  const router = useRouter();
  const clinicCurrency = useClinicCurrency();
  const {
    filteredInvoices,
    loading,
    isError,
    error,
    filter,
    setFilter,
    sortBy,
    setSortBy,
    handleDownloadPdf,
    handleRefresh,
    searchQuery,
    setSearchQuery,
    refetch,
  } = useInvoicesLogic();

  const formatCurrency = (amount: number | undefined) => {
    return clinicCurrency.formatCurrency(amount || 0);
  };

  const listStatus = useMemo((): "loading" | "error" | "empty" | "success" => {
    if (loading) return "loading";
    if (isError) return "error";
    if (filteredInvoices.length === 0) return "empty";
    return "success";
  }, [loading, isError, filteredInvoices.length]);

  const hasActiveFilters =
    filter !== "all" || (searchQuery && searchQuery.trim().length > 0);

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Invoices"
          description="Recent invoices, newest first, with payment status. Record cash or card at Payment desk when needed."
          actions={
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={handleRefresh}>
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button asChild className="gap-2">
                <Link href="/invoices/new">
                  <Plus className="h-4 w-4" />
                  Create Invoice
                </Link>
              </Button>
            </div>
          }
        />
      }
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[var(--fs-md)] font-medium">Filter &amp; Sort</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex flex-1 items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={filter}
                onValueChange={(value) => {
                  if (
                    value === "all" ||
                    value === "PENDING" ||
                    value === "CANCELLED" ||
                    value === "PAID" ||
                    value === "OVERDUE" ||
                    value === "PARTIALLY_PAID"
                  ) {
                    setFilter(value);
                  }
                }}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                  <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-1 items-center gap-2 md:max-w-xs">
              <Input
                type="search"
                placeholder="Enter patient name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="shrink-0 text-[var(--fs-xs)] text-muted-foreground">
                Sort by:
              </span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Sort order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Newest First</SelectItem>
                  <SelectItem value="date-asc">Oldest First</SelectItem>
                  <SelectItem value="amount-desc">Highest Amount</SelectItem>
                  <SelectItem value="amount-asc">Lowest Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="ui-section-title">Recent invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <DataState
            status={listStatus}
            loadingMessage="Loading invoices…"
            errorMessage={error?.message}
            onRetry={() => void refetch()}
            emptyTitle={
              hasActiveFilters ? "No matching invoices" : "No invoices yet"
            }
            emptyDescription={
              hasActiveFilters
                ? "Try clearing the status filter or search, then refresh."
                : "Create an invoice from a visit or use Create Invoice when you are ready to bill."
            }
          >
            <div className="ui-card-surface overflow-x-hidden">
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
                  {filteredInvoices.map((invoice: InvoiceWithPatient) => {
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
                              "en-US",
                              DATE_FORMAT_OPTIONS_US_LONG,
                            )
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(invoice.totalAmount ?? invoice.total)}
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
    </AppPageScaffold>
  );
};
