import { FC } from "react";
import {
  Card,
  CardContent,
  EmptyState,
  LoadingState,
} from "@workspace/ui/components";
import { FileText } from "lucide-react";
import { useInvoiceDetailsLogic } from "@/features/invoices/hooks/use-invoice-details-logic";
import { useNavigate, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys, useResendInvoiceWhatsApp } from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { buildInvoicePaidSummaryLine } from "@/features/invoices/lib/invoice-payment-display";
import { InvoiceHeader } from "./InvoiceHeader";
import { InvoiceHeaderSection } from "./InvoiceHeaderSection";
import { InvoiceLineItemsSection } from "./InvoiceLineItemsSection";
import { InvoiceTotalsSection } from "./InvoiceTotalsSection";
import { InvoiceActionsSection } from "./InvoiceActionsSection";

interface InvoiceDetailsUIProps {
  invoiceId: string;
}

export const InvoiceDetailsUI: FC<InvoiceDetailsUIProps> = ({ invoiceId }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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

  if (isLoading) return <LoadingState message="Loading invoice details…" />;

  if (error || !invoice) {
    return (
      <EmptyState
        icon={FileText}
        title="Invoice not found"
        description="The invoice you are looking for does not exist or has been deleted"
        action={{
          label: "Back to Invoices",
          onClick: () => navigate("/invoices"),
        }}
      />
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

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <InvoiceHeaderSection
        invoiceId={invoiceId}
        invoice={invoice}
        handlePrint={handlePrint}
        handleDownload={handleDownload}
        isDownloading={isDownloading}
        handleWhatsappRetry={handleWhatsappRetry}
        isRetrying={resendInvoice.isPending}
        paidSummaryLine={paidSummaryLine}
      />

      <div ref={printRef} className="print-sheet print:p-0">
        <Card className="border-none shadow-sm print:shadow-none print:border">
          <InvoiceHeader
            invoice={invoice}
            formatDate={formatDate}
            clinic={clinic}
          />

          <CardContent className="p-6 md:p-8">
            <InvoiceLineItemsSection
              invoice={invoice}
              formatCurrency={formatCurrency}
            />

            <InvoiceTotalsSection
              invoice={invoice}
              calculateSubtotal={calculateSubtotal}
              formatCurrency={formatCurrency}
              numberToWords={numberToWords}
              authorizedSignatureUrl={authorizedSignatureUrl}
              authorizedSignatureName={authorizedSignatureName}
            />
          </CardContent>
        </Card>
      </div>

      <InvoiceActionsSection
        invoiceId={invoiceId}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
      />

      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body * { visibility: hidden; }
          .print-sheet, .print-sheet * { visibility: visible; }
          .print-sheet { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
};
