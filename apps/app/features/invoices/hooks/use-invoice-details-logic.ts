import { useEffect, useRef, useState } from "react";
import { useClinic } from "@/lib/contexts/clinic-context";

import { useInvoice } from "@workspace/data-access";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { InvoiceItem } from "@workspace/types";
import {
  DATE_FORMAT_OPTIONS_US_LONG,
  formatCurrency,
  formatDateSafe,
} from "@/lib/formatters";
import { useClinicCurrency } from "@/hooks/use-clinic-currency";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { invoicesApi } from "@/features/invoices/api/invoices.api";
import { safeOpenSignedUrl } from "@/lib/security/signed-url-validator";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60000;

export const useInvoiceDetailsLogic = (
  invoiceId: string,
  options?: { autoPrint?: boolean },
) => {
  const router = useRouter();
  const { clinic } = useClinic();
  const clinicCurrency = useClinicCurrency();
  const printRef = useRef<HTMLDivElement>(null);
  const hasAutoPrintedRef = useRef(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const pdfAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      pdfAbortRef.current?.abort();
    };
  }, []);

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
    pdfAbortRef.current?.abort();
    const controller = new AbortController();
    pdfAbortRef.current = controller;

    setIsDownloading(true);
    const toastId = toast.loading("Preparing PDF…");

    try {
      const { jobId } = await invoicesApi.enqueuePdf(invoiceId);

      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        if (controller.signal.aborted) return;
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const status = await invoicesApi.getPdfStatus(invoiceId, jobId);

        if (status.status === "COMPLETED" && status.pdfUrl) {
          toast.dismiss(toastId);
          toast.success("PDF ready");
          safeOpenSignedUrl(status.pdfUrl);
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
      if (controller === pdfAbortRef.current) {
        pdfAbortRef.current = null;
      }
    }
  };

  const calculateSubtotal = (items: InvoiceItem[]) => {
    return items.reduce(
      (sum, item) => sum + item.quantity * (item.unitPrice ?? item.price),
      0,
    );
  };

  const numberToWords = (amount: number) => {
    return `${amount} ${invoice?.currency ?? clinicCurrency.currency} Only`;
  };

  return {
    invoice,
    isLoading,
    error,
    printRef,
    handlePrint,
    handleDownload,
    isDownloading,
    calculateSubtotal,
    formatCurrency: (amount: number) =>
      formatCurrency(amount, invoice?.currency ?? clinicCurrency.currency, {
        locale: clinicCurrency.locale,
      }),
    formatDate: (dateString?: string | Date | null) =>
      formatDateSafe(
        dateString ?? null,
        DATE_FORMAT_OPTIONS_US_LONG,
      ),
    numberToWords,
    router,
    clinic,
  };
};
