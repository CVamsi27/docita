
import { useMemo, useState } from "react";
import { apiHooks } from "@/lib/api-hooks";
import { toast } from "sonner";
import { Invoice } from "@workspace/types";

export const useInvoicesLogic = () => {
    const [filter, setFilter] = useState("all");
    const [sortBy, setSortBy] = useState("date-desc");
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

    const {
        data: invoicesResponse,
        isLoading: loading,
        refetch,
    } = apiHooks.useInvoices();

    const invoices = Array.isArray(invoicesResponse)
        ? invoicesResponse
        : [];

    const filteredInvoices = useMemo(() => {
        let result = [...invoices];

        if (filter !== "all") {
            result = result.filter((inv) => inv.status === filter);
        }

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
    }, [invoices, filter, sortBy]);

    const handleDownloadPdf = async (invoiceId: string) => {
        try {
            // In a real app, this would call an API endpoint to generate PDF
            toast.success("Downloading PDF...");

            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1000));
            window.open(`/api/invoices/${invoiceId}/pdf`, "_blank");
        } catch (error) {
            toast.error("Failed to download PDF");
            console.error(error);
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
        refetch,
    };
};
