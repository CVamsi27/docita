import { useEffect, useRef, useState } from "react";
import { pollInvoicePdfUrl } from "@/features/invoices/lib/poll-invoice-pdf";

interface UseInvoiceDownloadReturn {
  isDownloading: boolean;
  handlePrint: () => void;
  handleDownload: () => Promise<void>;
}

export function useInvoiceDownload(
  invoiceId: string,
  isLoading: boolean,
  hasInvoice: boolean,
  autoPrint?: boolean,
): UseInvoiceDownloadReturn {
  const [isDownloading, setIsDownloading] = useState(false);
  const pdfAbortRef = useRef<AbortController | null>(null);
  const hasAutoPrintedRef = useRef(false);

  useEffect(() => {
    return () => {
      pdfAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!autoPrint || hasAutoPrintedRef.current) return;
    if (!isLoading && hasInvoice) {
      hasAutoPrintedRef.current = true;
      window.print();
    }
  }, [autoPrint, isLoading, hasInvoice]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    pdfAbortRef.current?.abort();
    const controller = new AbortController();
    pdfAbortRef.current = controller;

    setIsDownloading(true);
    try {
      await pollInvoicePdfUrl(invoiceId, controller.signal);
    } finally {
      setIsDownloading(false);
      if (controller === pdfAbortRef.current) {
        pdfAbortRef.current = null;
      }
    }
  };

  return { isDownloading, handlePrint, handleDownload };
}
