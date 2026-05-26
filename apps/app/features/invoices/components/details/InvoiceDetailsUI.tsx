"use client";

import { FC, type ReactNode } from "react";
import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { Card, CardContent, CardFooter } from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { Download, Edit, FileText, Printer } from "lucide-react";
import { BackButton } from "@/components/navigation/back-button";
import { StatusBadge } from "@workspace/ui/components/indicators/status-badge";
import { EmptyState, LoadingState } from "@workspace/ui/components/feedback/empty-state";
import { useInvoiceDetailsLogic } from "@/features/invoices/hooks/use-invoice-details-logic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useResendInvoiceWhatsApp } from "@/hooks/api/use-whatsapp";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { WhatsAppDeliveryBadge } from "@/features/_shared/components/whatsapp/whatsapp-delivery-badge";
import { Section } from "@workspace/ui/components/section";
import { InvoiceHeader } from "./InvoiceHeader";
import { InvoiceBillTo } from "./InvoiceBillTo";
import { InvoiceItemsTableReadOnly } from "./InvoiceItemsTableReadOnly";
import { InvoiceTotalsOnly } from "./InvoiceTotalsOnly";
import { InvoicePaymentActivitySection } from "./InvoicePaymentActivitySection";
import { buildInvoicePaidSummaryLine } from "@/features/invoices/lib/invoice-payment-display";

function withInvoicingGate(node: ReactNode) {
  return (
    <FeatureGate feature={Feature.INVOICING} showLockedCard>
      {node}
    </FeatureGate>
  );
}

interface InvoiceDetailsUIProps {
  invoiceId: string;
}

export const InvoiceDetailsUI: FC<InvoiceDetailsUIProps> = ({ invoiceId }) => {
  const searchParams = useSearchParams();
  const shouldAutoPrint = searchParams.get("print") === "true";

  const {
    invoice,
    isLoading,
    error,
    printRef,
    handlePrint,
    handleDownload,
    isDownloading,
    calculateSubtotal,
    formatCurrency,
    formatDate,
    numberToWords,
    router,
    clinic,
  } = useInvoiceDetailsLogic(invoiceId, { autoPrint: shouldAutoPrint });

  const queryClient = useQueryClient();
  const resendInvoice = useResendInvoiceWhatsApp(invoiceId);

  const handleWhatsappRetry = async () => {
    try {
      await resendInvoice.mutateAsync();
      toast.success("Invoice re-sent on WhatsApp");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.legacyDetail(invoiceId),
      });
    } catch (err) {
      showUserFacingErrorToast(
        err,
        "We could not resend the invoice. Please try again.",
        "save",
      );
    }
  };

  if (isLoading) {
    return withInvoicingGate(
      <LoadingState message="Loading invoice details…" />,
    );
  }

  if (error || !invoice) {
    return withInvoicingGate(
      <EmptyState
        icon={FileText}
        title="Invoice not found"
        description="The invoice you are looking for does not exist or has been deleted"
        action={{
          label: "Back to Invoices",
          onClick: () => router.push("/invoices"),
        }}
      />,
    );
  }

  const paidSummaryLine = buildInvoicePaidSummaryLine({
    status: invoice.status,
    paidAt: invoice.paidAt,
    paymentMethod: invoice.paymentMethod,
    formatDate,
  });

  const invoiceClinic = invoice.patient?.clinic;
  const authorizedSignatureUrl =
    invoiceClinic?.slaSignatureUrl || clinic?.slaSignatureUrl || null;
  const authorizedSignatureName =
    invoiceClinic?.name || clinic?.name || "Clinic Administration";

  return withInvoicingGate(
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="min-w-0 flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <BackButton fallback="/invoices" className="shrink-0" />
            <h1 className="ui-page-title text-[var(--fs-xl)] sm:text-[var(--fs-2xl)]">
              Invoice #{(invoice.id ?? "").substring(0, 8).toUpperCase()}
            </h1>
            <StatusBadge status={invoice.status} />
          </div>
          {paidSummaryLine ? (
            <p className="text-[var(--fs-sm)] text-muted-foreground">
              {paidSummaryLine}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {invoice.whatsappStatus !== undefined && invoice.whatsappStatus !== null ? (
            <WhatsAppDeliveryBadge
              status={invoice.whatsappStatus}
              sentAt={invoice.whatsappSentAt ?? null}
              onRetry={handleWhatsappRetry}
              isRetrying={resendInvoice.isPending}
            />
          ) : null}
          <Button variant="outline" size="sm" onClick={() => handlePrint()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            <Download className="h-4 w-4 mr-2" />
            {isDownloading ? "Preparing…" : "Download"}
          </Button>
          <Button size="sm" asChild>
            <Link href={`/invoices/${invoiceId}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Invoice
            </Link>
          </Button>
        </div>
      </div>

      <div ref={printRef} className="print-sheet print:p-0">
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

            <div className="mt-8 flex justify-end">
              <div className="w-56 text-center">
                <p className="text-sm font-medium mb-2">Authorized Signature</p>
                {authorizedSignatureUrl ? (
                  <div className="mb-2 flex justify-center rounded-md bg-background px-3 py-2">
                    <img
                      src={authorizedSignatureUrl}
                      alt="Authorized Signature"
                      className="h-14 w-auto object-contain"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic mb-2">
                    Signature on file pending
                  </p>
                )}
                <div className="border-t border-muted-foreground/60 pt-1 text-xs text-muted-foreground">
                  For {authorizedSignatureName}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col items-center justify-center border-t py-6 text-center text-sm text-muted-foreground bg-muted/10 print:bg-transparent">
            <p className="mb-1">Thank you for your business!</p>
            <p className="text-xs">Generated by Docita billing workspace</p>
          </CardFooter>
        </Card>
      </div>

      <Section
        id="invoice-payment-activity"
        className="print:hidden"
        title="Payment activity"
        description="Payment links, online sessions, and desk settlements recorded for this invoice."
      >
        <InvoicePaymentActivitySection
          invoiceId={invoiceId}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
      </Section>

      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body * { visibility: hidden; }
          .print-sheet, .print-sheet * { visibility: visible; }
          .print-sheet { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>,
  );
};
