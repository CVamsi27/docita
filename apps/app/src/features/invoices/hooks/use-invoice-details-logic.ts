import { useRef } from "react";
import { useClinic } from "@/lib/contexts/clinic-context";

import { useInvoice } from "@workspace/data-access";
import { InvoiceItem } from "@workspace/types";
import {
  DATE_FORMAT_OPTIONS_US_LONG,
  formatCurrency,
  formatDateSafe,
} from "@/lib/formatters";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { useInvoiceDownload } from "./use-invoice-download";

export const useInvoiceDetailsLogic = (
  invoiceId: string,
  options?: { autoPrint?: boolean },
) => {
  const { clinic } = useClinic();
  const clinicCurrency = useLocaleCurrency();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: invoice, isLoading, error, refetch } = useInvoice(invoiceId);
  const { isDownloading, handlePrint, handleDownload } = useInvoiceDownload(
    invoiceId,
    isLoading,
    !!invoice,
    options?.autoPrint,
  );

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
    refetch,
    printRef,
    handlePrint,
    handleDownload,
    isDownloading,
    calculateSubtotal,
    formatCurrency: (amount: number) =>
      formatCurrency(amount, invoice?.currency ?? clinicCurrency.currency),
    formatDate: (dateString?: string | Date | null) =>
      formatDateSafe(
        dateString ?? null,
        DATE_FORMAT_OPTIONS_US_LONG,
      ),
    numberToWords,
    clinic,
  };
};
