"use client";

import { apiHooks } from "@/lib/api-hooks";
import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Search,
  Download,
  Receipt,
  Pencil,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { format } from "date-fns";
import { WhatsAppButton } from "@/components/common/whatsapp-button";
import { FeatureGate } from "@/components/common/feature-gate";
import { Feature } from "@/lib/stores/permission-store";
import { EditInvoiceDialog } from "@/components/invoices/edit-invoice-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import Link from "next/link";
import type { Invoice, Patient } from "@workspace/types";

type InvoiceWithPatient = Invoice & {
  patient: Patient;
  appointment?: { doctor: { name: string } };
};

type SortKey = "date" | "patient" | "doctor" | "amount" | "status";
type SortDirection = "asc" | "desc";

export default function InvoicesPage() {
  const {
    data: invoices = [],
    isLoading: loading,
    refetch,
  } = apiHooks.useInvoices();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingInvoice, setEditingInvoice] =
    useState<InvoiceWithPatient | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({
    key: "date",
    direction: "desc",
  });

  const downloadPDF = async (invoiceId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/invoices/${invoiceId}/pdf`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("docita_token")}`,
          },
        },
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download PDF:", error);
    }
  };

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const filteredAndSortedInvoices = useMemo(() => {
    let result = [...invoices];

    // Filter
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      result = result.filter(
        (invoice) =>
          `${invoice.patient?.firstName || ""} ${invoice.patient?.lastName || ""}`
            .toLowerCase()
            .includes(query) ||
          (invoice.patient?.phoneNumber || "").includes(query) ||
          (invoice.appointment?.doctor?.name || "")
            .toLowerCase()
            .includes(query),
      );
    }

    // Sort
    result.sort((a, b) => {
      let aValue: string | number = "";
      let bValue: string | number = "";

      switch (sortConfig.key) {
        case "date":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case "patient":
          aValue =
            `${a.patient?.firstName || ""} ${a.patient?.lastName || ""}`.toLowerCase();
          bValue =
            `${b.patient?.firstName || ""} ${b.patient?.lastName || ""}`.toLowerCase();
          break;
        case "doctor":
          aValue = (a.appointment?.doctor?.name || "").toLowerCase();
          bValue = (b.appointment?.doctor?.name || "").toLowerCase();
          break;
        case "amount":
          aValue = a.total || 0;
          bValue = b.total || 0;
          break;
        case "status":
          aValue = (a.status || "").toLowerCase();
          bValue = (b.status || "").toLowerCase();
          break;
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [invoices, searchTerm, sortConfig]);

  const SortableHeader = ({
    column,
    label,
  }: {
    column: SortKey;
    label: string;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(column)}
      className="gap-1 h-8 px-0 font-medium hover:bg-transparent"
    >
      {label}
      {sortConfig.key === column ? (
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

  return (
    <FeatureGate
      feature={Feature.INVOICING}
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
          <Receipt className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Billing & Invoices</h2>
          <p className="text-muted-foreground mb-4 max-w-md">
            Generate professional invoices and track payments. Upgrade to Core
            tier to unlock this feature.
          </p>
          <Button asChild>
            <Link href="/settings?tab=subscription">Upgrade to Core</Link>
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
            <p className="text-muted-foreground">
              Manage and track patient invoices and payments.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by patient name or phone..."
              className="pl-9 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>All Invoices</CardTitle>
            <CardDescription>
              A list of all invoices generated for patients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-muted/50">
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>
                    <SortableHeader column="patient" label="Patient" />
                  </TableHead>
                  <TableHead>
                    <SortableHeader column="doctor" label="Doctor" />
                  </TableHead>
                  <TableHead>
                    <SortableHeader column="amount" label="Amount" />
                  </TableHead>
                  <TableHead>
                    <SortableHeader column="status" label="Status" />
                  </TableHead>
                  <TableHead>
                    <SortableHeader column="date" label="Date" />
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Loading invoices...
                    </TableCell>
                  </TableRow>
                ) : filteredAndSortedInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No invoices found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-sm">
                        {(invoice.id || "").slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {invoice.patient?.firstName}{" "}
                            {invoice.patient?.lastName}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {invoice.patient?.phoneNumber}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {invoice.appointment?.doctor?.name || "-"}
                      </TableCell>
                      <TableCell className="font-semibold">
                        ₹{invoice.total.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={invoice.status} />
                      </TableCell>
                      <TableCell>
                        {format(new Date(invoice.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="gap-2"
                        >
                          <Link href={`/invoices/${invoice.id}`}>
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingInvoice(invoice)}
                          className="gap-2"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => invoice.id && downloadPDF(invoice.id)}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          PDF
                        </Button>
                        <WhatsAppButton
                          phoneNumber={invoice.patient?.phoneNumber || ""}
                          message={`Hello ${invoice.patient?.firstName}, here is your invoice link for ${process.env.NEXT_PUBLIC_CLINIC_NAME || "Docita Clinic"}: ${process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000"}/invoices/${invoice.id}`}
                          variant="ghost"
                          label=""
                          className="h-8 w-8 p-0"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Invoice Dialog */}
        <EditInvoiceDialog
          invoice={editingInvoice}
          open={!!editingInvoice}
          onOpenChange={(open) => !open && setEditingInvoice(null)}
          onInvoiceUpdated={() => refetch()}
        />
      </div>
    </FeatureGate>
  );
}
