import { useMemo, useState } from "react";
import { useInvoices } from "@/hooks/api/use-billing";
import { useDebounce } from "@workspace/hooks/use-debounce";
import { toast } from "sonner";
import { Invoice, ListInvoicesContractQuery } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

export const useInvoicesLogic = () => {
  const [filter, setFilter] = useState("all");
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
    status:
      filter !== "all"
        ? (filter as ListInvoicesContractQuery["status"])
        : undefined,
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
    try {

      toast.success("Downloading PDF...");

      await new Promise((resolve) => setTimeout(resolve, 1000));
      window.open(`/api/invoices/${invoiceId}/pdf`, "_blank");
    } catch {
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
