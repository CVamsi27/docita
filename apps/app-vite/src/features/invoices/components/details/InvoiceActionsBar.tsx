import type { FC } from "react";
import { Button } from "@workspace/ui/components/form/button";
import { Download, Edit, Printer, ShieldPlus } from "lucide-react";
import { Link } from "react-router";
import { WhatsAppDeliveryBadge } from "@/components/whatsapp/whatsapp-delivery-badge";

interface InvoiceActionsBarProps {
  invoiceId: string;
  invoice: {
    whatsappStatus?: string | null;
    whatsappSentAt?: string | Date | null;
    patientId?: string;
  };
  handlePrint: () => void;
  handleDownload: () => void;
  isDownloading: boolean;
  handleWhatsappRetry: () => void;
  isRetrying: boolean;
  canCreateClaim: boolean;
}

export const InvoiceActionsBar: FC<InvoiceActionsBarProps> = ({
  invoiceId,
  invoice,
  handlePrint,
  handleDownload,
  isDownloading,
  handleWhatsappRetry,
  isRetrying,
  canCreateClaim,
}) => (
  <div className="flex flex-wrap items-center gap-2">
    {invoice.whatsappStatus !== undefined &&
    invoice.whatsappStatus !== null ? (
      <WhatsAppDeliveryBadge
        status={invoice.whatsappStatus}
        sentAt={invoice.whatsappSentAt ?? null}
        onRetry={handleWhatsappRetry}
        isRetrying={isRetrying}
      />
    ) : null}
    <Button variant="outline" size="sm" onClick={handlePrint}>
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
    {canCreateClaim ? (
      <Button variant="outline" size="sm" asChild>
        <Link
          to={`/insurance-claims/new?patientId=${invoice.patientId}&invoiceId=${invoiceId}&claimType=REIMBURSEMENT`}
        >
          <ShieldPlus className="h-4 w-4 mr-2" />
          Create claim
        </Link>
      </Button>
    ) : null}
    <Button size="sm" asChild>
      <Link to={`/invoices/${invoiceId}/edit`}>
        <Edit className="h-4 w-4 mr-2" />
        Edit Invoice
      </Link>
    </Button>
  </div>
);
