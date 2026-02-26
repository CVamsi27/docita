"use client";

import { FC } from "react";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Feature,
  FeatureGate,
} from "@/features/_shared/components/auth/feature-gate";
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
  RefreshCw,
  Search,
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
import { useInvoicesLogic } from "../../hooks/use-invoices-logic";
import Link from "next/link";
import { LoadingState } from "@workspace/ui/components/empty-state";
import { StatusBadge } from "@workspace/ui/components/status-badge";
import { Invoice, Patient } from "@workspace/types";

type InvoiceWithPatient = Invoice & { 
  patient?: Pick<Patient, "firstName" | "lastName">;
  total?: number;
};

export const InvoicesPageUI: FC = () => {
  const {
    filteredInvoices,
    loading,
    filter,
    setFilter,
    sortBy,
    setSortBy,
    handleDownloadPdf,
    handleRefresh,
    searchQuery,
    setSearchQuery,
  } = useInvoicesLogic();

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number | undefined) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount || 0);
  };

  return (
    <FeatureGate
      feature={Feature.INVOICING}
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
          <h2 className="text-2xl font-bold mb-2">Invoices & Billing</h2>
          <p className="text-muted-foreground mb-4">
            Upgrade to access invoice management features
          </p>
        </div>
      }
    >
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
            <p className="text-muted-foreground">
              Manage patient billing and invoices
            </p>
          </div>
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
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium">Filter & Sort</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex items-center gap-2 flex-1">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="OVERDUE">Overdue</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 flex-1 md:max-w-xs">
                <div className="relative w-full">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search patient name..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
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
            <CardTitle>Invoice History</CardTitle>
            <CardDescription>
              View and manage all patient invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingState message="Loading invoices..." />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice: InvoiceWithPatient) => (
                      <TableRow key={invoice.id ?? `invoice-${Math.random()}`}>
                        <TableCell className="font-medium">
                          #{(invoice.id ?? "").substring(0, 8)}
                        </TableCell>
                        <TableCell>
                          {invoice.patient
                            ? `${invoice.patient.firstName} ${invoice.patient.lastName}`
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          {invoice.createdAt ? formatDate(invoice.createdAt) : "N/A"}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(invoice.totalAmount ?? invoice.total)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={invoice.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
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
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FeatureGate>
  );
};
