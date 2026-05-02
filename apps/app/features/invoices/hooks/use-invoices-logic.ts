import { useMemo, useState } from "react";
import { useInvoices } from "@/hooks/api/use-billing";
import { useDebounce } from "@workspace/hooks/use-debounce";
import { toast } from "sonner";
import { Invoice, ListInvoicesContractQuery } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import { invoicesApi } from "@/features/invoices/api/invoices.api";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60000;

export const useInvoicesLogic = () => {
  const [filter, setFilter] =
    useState<ListInvoicesContractQuery["status"] | "all">("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const {
    data: invoicesResponse,
    isLoading: loading,
    refetch,
  } = useInvoices({
    status: filter !== "all" ? filter : undefined,
    search: debouncedSearch || undefined,
  });

  const invoices = useMemo(
    () => (Array.isArray(invoicesResponse) ? invoicesResponse : []),
    [invoicesResponse],
  );

  const filteredInvoices = useMemo(() => {
    const result = [...invoices];

    result.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "date-asc":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "amount-desc":
          return (b.totalAmount || 0) - (a.totalAmount || 0);
        case "amount-asc":
          return (a.totalAmount || 0) - (b.totalAmount || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [invoices, sortBy]);

  const handleDownloadPdf = async (invoiceId: string) => {
    const toastId = toast.loading("Preparing PDF…");
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
    }
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedInvoice(null);
  };

  const handleRefresh = () => {
    refetch();
  };

  return {
    invoices,
    filteredInvoices,
    loading,
    filter,
    setFilter,
    sortBy,
    setSortBy,
    handleDownloadPdf,
    handleEditInvoice,
    handleCloseEditDialog,
    isEditDialogOpen,
    selectedInvoice,
    handleRefresh,
    searchQuery,
    setSearchQuery,
    refetch,
  };
};
