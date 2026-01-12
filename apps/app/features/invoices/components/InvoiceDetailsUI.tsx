"use client";

import { FC } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import { ArrowLeft, Download, Edit, FileText, Printer, Share2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { StatusBadge } from "@workspace/ui/components/status-badge";
import { EmptyState, LoadingState } from "@workspace/ui/components/empty-state";
import { useInvoiceDetailsLogic } from "../hooks/use-invoice-details-logic";
import Link from "next/link";
import { Invoice } from "@workspace/types";

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
      {/* Header Actions */}
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

      {/* Invoice Content */}
      <div ref={printRef} className="print:p-0">
        <Card className="border-none shadow-sm print:shadow-none print:border">
          <CardHeader className="flex flex-row justify-between items-start border-b pb-6">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
                  D
                </div>
                <CardTitle className="text-xl">Docita Clinic</CardTitle>
              </div>
              <CardDescription className="mt-2 text-sm max-w-[250px]">
                123 Medical Center Dr.<br />
                Health City, HC 54321<br />
                Phone: +91 98765 43210<br />
                Email: billing@docita.com
              </CardDescription>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-primary mb-1">INVOICE</h2>
              <p className="text-sm font-medium text-muted-foreground">
                #{invoice.id}
              </p>
              <div className="mt-4 text-sm">
                <div className="flex justify-end gap-4">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">
                    {formatDate(invoice.createdAt)}
                  </span>
                </div>
                <div className="flex justify-end gap-4 mt-1">
                  <span className="text-muted-foreground">Due Date:</span>
                  <span className="font-medium">
                    {formatDate(invoice.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 md:p-8">
            {/* Bill To Section */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Bill To
                </h3>
                {invoice.patient ? (
                  <div className="text-sm space-y-1">
                    <p className="font-bold text-lg">
                      {invoice.patient.firstName} {invoice.patient.lastName}
                    </p>
                    <p>{invoice.patient.address || "Address not provided"}</p>
                    <p>{invoice.patient.email}</p>
                    <p>{invoice.patient.phoneNumber}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Unknown Patient
                  </p>
                )}
              </div>
              <div className="md:text-right">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Payment Details
                </h3>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground mr-2">Method:</span>
                    <span className="capitalize">{invoice.paymentMethod || "N/A"}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground mr-2">Status:</span>
                    <span className="capitalize font-medium">
                      {invoice.status}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="rounded-lg border overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                      Description
                    </th>
                    <th className="py-3 px-4 text-center font-medium text-muted-foreground w-24">
                      Qty
                    </th>
                    <th className="py-3 px-4 text-right font-medium text-muted-foreground w-32">
                      Price
                    </th>
                    <th className="py-3 px-4 text-right font-medium text-muted-foreground w-32">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(invoice.items || []).map((item, index: number) => (
                    <tr key={index}>
                      <td className="py-3 px-4">{item.description}</td>
                      <td className="py-3 px-4 text-center">{item.quantity}</td>
                      <td className="py-3 px-4 text-right">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(item.quantity * item.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div className="flex-1">
                <div className="text-sm text-muted-foreground mb-4">
                  <p className="font-medium mb-1">Amount in Words:</p>
                  <p className="italic">
                    {numberToWords(invoice.totalAmount ?? 0)}
                  </p>
                </div>
                {invoice.notes && (
                  <div className="text-sm p-4 bg-muted/30 rounded-lg max-w-md">
                    <p className="font-semibold mb-1">Notes:</p>
                    <p className="text-muted-foreground">{invoice.notes}</p>
                  </div>
                )}
              </div>
              <div className="w-full md:w-64 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(calculateSubtotal(invoice.items || []))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (0%)</span>
                  <span>{formatCurrency(0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                    <span>-{formatCurrency((invoice as unknown as { discount?: number }).discount || 0)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.totalAmount ?? invoice.total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col items-center justify-center border-t py-6 text-center text-sm text-muted-foreground bg-muted/10 print:bg-transparent">
            <p className="mb-1">Thank you for your business!</p>
            <p className="text-xs">
              This is a computer generated invoice and does not require a signature.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
