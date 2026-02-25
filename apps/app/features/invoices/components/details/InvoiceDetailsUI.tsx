"use client";

import { FC } from "react";
import { Card, CardContent, CardFooter } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  ArrowLeft,
  Download,
  Edit,
  FileText,
  Printer,
  Share2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { StatusBadge } from "@workspace/ui/components/status-badge";
import { EmptyState, LoadingState } from "@workspace/ui/components/empty-state";
import { useInvoiceDetailsLogic } from "../../hooks/use-invoice-details-logic";
import Link from "next/link";
import { InvoiceHeader } from "./InvoiceHeader";
import { InvoiceBillTo } from "./InvoiceBillTo";
import { InvoiceItemsTableReadOnly } from "./InvoiceItemsTableReadOnly";
import { InvoiceTotalsOnly } from "./InvoiceTotalsOnly";

interface InvoiceDetailsUIProps {
  invoiceId: string;
}

export const InvoiceDetailsUI: FC<InvoiceDetailsUIProps> = ({ invoiceId }) => {
  const {
    invoice,
    isLoading,
    error,
    printRef,
    handlePrint,
    handleDownload,
    handleShareWhatsApp,
    calculateSubtotal,
    formatCurrency,
    formatDate,
    numberToWords,
    router,
    clinic,
  } = useInvoiceDetailsLogic(invoiceId);

  if (isLoading) {
    return <LoadingState message="Loading invoice details..." />;
  }

  if (error || !invoice) {
    return (
      <EmptyState
        icon={FileText}
        title="Invoice not found"
        description="The invoice you are looking for does not exist or has been deleted."
        action={{
          label: "Back to Invoices",
          onClick: () => router.push("/invoices"),
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/invoices")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            Invoice {invoice.id}
          </h1>
          <StatusBadge status={invoice.status} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handlePrint()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleShareWhatsApp}>
                Share via WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem>Send via Email</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" asChild>
            <Link href={`/invoices/${invoiceId}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Invoice
            </Link>
          </Button>
        </div>
      </div>

      <div ref={printRef} className="print:p-0">
        <Card className="border-none shadow-sm print:shadow-none print:border">
          <InvoiceHeader
            invoice={invoice}
            formatDate={formatDate}
            clinic={clinic}
          />

          <CardContent className="p-6 md:p-8">
            <InvoiceBillTo invoice={invoice} />

            <InvoiceItemsTableReadOnly
              items={invoice.items || []}
              formatCurrency={formatCurrency}
            />

            <InvoiceTotalsOnly
              invoice={invoice}
              calculateSubtotal={calculateSubtotal}
              formatCurrency={formatCurrency}
              numberToWords={numberToWords}
            />
          </CardContent>
          <CardFooter className="flex-col items-center justify-center border-t py-6 text-center text-sm text-muted-foreground bg-muted/10 print:bg-transparent">
            <p className="mb-1">Thank you for your business!</p>
            <p className="text-xs">
              This is a computer generated invoice and does not require a
              signature.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
