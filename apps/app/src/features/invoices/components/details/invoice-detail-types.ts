/** Props shared by the invoice-detail action surface (actions bar + header). */
export interface InvoiceDetailActionProps {
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
}
