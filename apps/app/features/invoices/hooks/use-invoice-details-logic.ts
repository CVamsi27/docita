import { useEffect, useRef, useState } from "react";
import { useClinic } from "@/lib/clinic-context";

import { useInvoice } from "@/hooks/api/use-billing";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { InvoiceItem } from "@workspace/types";
import { DEFAULT_CURRENCY } from "@workspace/utils";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import { invoicesApi } from "@/features/invoices/api/invoices.api";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60000;

export const useInvoiceDetailsLogic = (
  invoiceId: string,
  options?: { autoPrint?: boolean },
) => {
  const router = useRouter();
  const { clinic } = useClinic();
  const printRef = useRef<HTMLDivElement>(null);
  const hasAutoPrintedRef = useRef(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: invoice, isLoading, error } = useInvoice(invoiceId);

  useEffect(() => {
    if (!options?.autoPrint || hasAutoPrintedRef.current) {
      return;
    }

    if (!isLoading && invoice) {
      hasAutoPrintedRef.current = true;
      window.print();
    }
  }, [options?.autoPrint, isLoading, invoice]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    const toastId = toast.loading("Preparing PDF...");

    try {
      const { jobId } = await invoicesApi.enqueuePdf(invoiceId);

      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const status = await invoicesApi.getPdfStatus(invoiceId, jobId);

        if (status.status === "COMPLETED" && status.pdfUrl) {
          toast.dismiss(toastId);
          toast.success("PDF ready");
          window.open(status.pdfUrl, "_blank");
          return;
        }

        if (status.status === "FAILED") {
          throw new Error("PDF generation failed");
        }
      }

      throw new Error("PDF generation timed out");
    } catch {
      toast.dismiss(toastId);
      showUserFacingErrorToast(
        "We could not download this invoice. Please try again.",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!invoice?.patient?.phoneNumber) {
      showUserFacingErrorToast(
        "Add this patient's phone number before sharing the invoice on WhatsApp.",
      );
      return;
    }

    const clinicName = clinic?.name?.trim() || "our clinic";
    const message = `Hello ${invoice.patient.firstName}, here is your invoice ${invoice.id} for ${formatCurrency(invoice.totalAmount ?? 0)}. Thank you for visiting ${clinicName}.`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${invoice.patient.phoneNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, "_blank");
  };

  const calculateSubtotal = (items: InvoiceItem[]) => {
    return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: DEFAULT_CURRENCY,
    }).format(amount);
  };

  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const numberToWords = (amount: number) => {
    return `${amount} Rupees Only`;
  };

  return {
    invoice,
    isLoading,
    error,
    printRef,
    handlePrint,
    handleDownload,
    isDownloading,
    handleShareWhatsApp,
    calculateSubtotal,
    formatCurrency,
    formatDate,
    numberToWords,
    router,
    clinic,
  };
};
