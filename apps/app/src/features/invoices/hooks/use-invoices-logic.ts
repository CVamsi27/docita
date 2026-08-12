import { useEffect, useMemo, useRef, useState } from "react";
import { useInvoices } from "@workspace/data-access";
import { useDebounce } from "@workspace/hooks/use-debounce";
import { ListInvoicesContractQuery } from "@workspace/types";
import { pollInvoicePdfUrl } from "@/features/invoices/lib/poll-invoice-pdf";

type SortKey = "date" | "amount" | "patient" | "status";
type SortDirection = "asc" | "desc";
type SortConfig = { key: SortKey; direction: SortDirection };

export type {SortConfig, SortKey};

export const useInvoicesLogic = () => {
  const [filter, setFilter] =
    useState<ListInvoicesContractQuery["status"] | "all">("all");
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({
    key: "date",
    direction: "desc",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const pdfAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      pdfAbortRef.current?.abort();
    };
  }, []);

  const {
    data: invoicesResponse,
    isPending: loading,
    isError,
    error,
    refetch,
  } = useInvoices({
    status: filter !== "all" ? filter : undefined,
    search: debouncedSearch || undefined,
    limit: 50,
  });

  const invoices = useMemo(
    () => (Array.isArray(invoicesResponse) ? invoicesResponse : []),
    [invoicesResponse],
  );

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  };

  const filteredInvoices = useMemo(() => {
    const result = [...invoices];

    if (sortConfig) {
      result.sort((a, b) => {
        let cmp = 0;
        switch (sortConfig.key) {
          case "date":
            cmp =
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime();
            break;
          case "amount":
            cmp = (b.totalAmount || 0) - (a.totalAmount || 0);
            break;
          case "patient": {
            const aName = (a.patient?.firstName ?? "") + (a.patient?.lastName ?? "");
            const bName = (b.patient?.firstName ?? "") + (b.patient?.lastName ?? "");
            cmp = aName.localeCompare(bName);
            break;
          }
          case "status":
            cmp = (a.status ?? "").localeCompare(b.status ?? "");
            break;
        }
        return sortConfig.direction === "asc" ? -cmp : cmp;
      });
    }

    return result;
  }, [invoices, sortConfig]);

  const handleDownloadPdf = async (invoiceId: string) => {
    pdfAbortRef.current?.abort();
    const controller = new AbortController();
    pdfAbortRef.current = controller;

    try {
      await pollInvoicePdfUrl(invoiceId, controller.signal);
    } finally {
      if (controller === pdfAbortRef.current) {
        pdfAbortRef.current = null;
      }
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  return {
    invoices,
    filteredInvoices,
    loading,
    isError,
    error,
    filter,
    setFilter,
    sortConfig,
    handleSort,
    handleDownloadPdf,
    handleRefresh,
    searchQuery,
    setSearchQuery,
    refetch,
  };
};
