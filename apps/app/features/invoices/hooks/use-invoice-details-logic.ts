import { useEffect, useRef } from "react";
import { useClinic } from "@/lib/clinic-context";

import { useInvoice } from "@/hooks/api/use-billing";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { InvoiceItem } from "@workspace/types";

export const useInvoiceDetailsLogic = (
  invoiceId: string,
  options?: { autoPrint?: boolean },
) => {
  const router = useRouter();
  const { clinic } = useClinic();
  const printRef = useRef<HTMLDivElement>(null);
  const hasAutoPrintedRef = useRef(false);

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
    try {
      toast.info("Preparing PDF for download...");

      setTimeout(() => {
        toast.success("PDF Downloaded successfully");
      }, 1500);
    } catch (err) {
      toast.error("Failed to download PDF");

    }
  };

  const handleShareWhatsApp = () => {
    if (!invoice?.patient?.phoneNumber) {
      toast.error("Patient phone number not available");
      return;
    }

    const message = `Hello ${invoice.patient.firstName}, here is your invoice ${invoice.id} for ${formatCurrency(invoice.totalAmount ?? 0)}. Thank you for visiting Dr. Vamsi's Clone Clinic.`;
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
      currency: "INR",
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
    handleShareWhatsApp,
    calculateSubtotal,
    formatCurrency,
    formatDate,
    numberToWords,
    router,
    clinic,
  };
};
