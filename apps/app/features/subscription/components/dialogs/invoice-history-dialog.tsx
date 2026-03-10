"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Download, FileText, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@workspace/ui/lib/utils";
import { DEFAULT_CURRENCY } from "@workspace/utils";

interface InvoiceHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Invoice {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
  invoiceUrl?: string | null;
  description?: string;
}

export function InvoiceHistoryDialog({
  open,
  onOpenChange,
}: InvoiceHistoryDialogProps) {
  const { token } = useAuth();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const apiUrl =
        process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001/api";
      const res = await fetch(`${apiUrl}/subscription/billing/payments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return res.json() as Promise<Invoice[]>;
    },
    enabled: open && !!token,
  });

  const handleDownload = (invoiceUrl: string) => {
    window.open(invoiceUrl, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Billing History
          </DialogTitle>
          <DialogDescription>
            View and download your past invoices and receipts.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Loading billing history...</p>
            </div>
          ) : !invoices || invoices.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground gap-2">
              <FileText className="h-12 w-12 opacity-20" />
              <p>No billing records found yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      {new Date(invoice.createdAt).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {invoice.description || "Subscription Payment"}
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: invoice.currency || DEFAULT_CURRENCY,
                      }).format(invoice.amountCents / 100)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "capitalize",
                          invoice.status === "paid"
                            ? "badge-success"
                            : "badge-warning",
                        )}
                      >
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {invoice.invoiceUrl ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(invoice.invoiceUrl!)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          PDF
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter className="border-t pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
