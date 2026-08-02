import type { FC } from "react";
import { Feature } from "@workspace/types";
import { useFeature } from "@/components/auth/feature-gate";
import { BackButton } from "@/components/navigation/back-button";
import { StatusBadge } from "@workspace/ui/components/indicators/status-badge";
import { InvoiceActionsBar } from "./InvoiceActionsBar";

interface InvoiceHeaderSectionProps {
  invoiceId: string;
  invoice: {
    id?: string;
    invoiceNumber?: string | null;
    status: string;
    whatsappStatus?: string | null;
    whatsappSentAt?: string | Date | null;
    patientId?: string;
  };
  handlePrint: () => void;
  handleDownload: () => void;
  isDownloading: boolean;
  handleWhatsappRetry: () => void;
  isRetrying: boolean;
  paidSummaryLine: string | null;
}

export const InvoiceHeaderSection: FC<InvoiceHeaderSectionProps> = ({
  invoiceId,
  invoice,
  handlePrint,
  handleDownload,
  isDownloading,
  handleWhatsappRetry,
  isRetrying,
  paidSummaryLine,
}) => {
  const canCreateClaim = useFeature(Feature.INSURANCE_BILLING);

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
      <div className="min-w-0 flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <BackButton fallback="/invoices" className="shrink-0" />
          <h1 className="ui-page-title text-[var(--fs-xl)] sm:text-[var(--fs-2xl)]">
            Invoice #
            {invoice.invoiceNumber ??
              (invoice.id ?? "").substring(0, 8).toUpperCase()}
          </h1>
          <StatusBadge status={invoice.status} />
        </div>
        {paidSummaryLine ? (
          <p className="text-[var(--fs-sm)] text-muted-foreground">
            {paidSummaryLine}
          </p>
        ) : null}
      </div>
      <InvoiceActionsBar
        invoiceId={invoiceId}
        invoice={invoice}
        handlePrint={handlePrint}
        handleDownload={handleDownload}
        isDownloading={isDownloading}
        handleWhatsappRetry={handleWhatsappRetry}
        isRetrying={isRetrying}
        canCreateClaim={canCreateClaim}
      />
    </div>
  );
};
