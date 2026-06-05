import { useState } from "react";
import { useDocuments } from "@workspace/data-access";
import { useDebounce } from "@workspace/hooks/use-debounce";
import {
  downloadDocument,
  viewDocument,
} from "./document-actions";
import { sortDocuments } from "./document-sort";
import type { SortConfig, SortKey } from "./document-sort-types";
export type { SortConfig, SortDirection, SortKey } from "./document-sort-types";

export const useDocumentsLogic = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "date",
    direction: "desc",
  });

  const {
    data: documents = [],
    isLoading: loading,
    isError,
    refetch,
  } = useDocuments({ search: debouncedSearch });

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortedDocuments = sortDocuments(documents, sortConfig);

  return {
    documents: sortedDocuments,
    totalDocuments: documents.length,
    loading,
    isError,
    retry: () => {
      void refetch();
    },
    searchQuery,
    setSearchQuery,
    sortConfig,
    handleSort,
    handleView: viewDocument,
    handleDownload: downloadDocument,
  };
};
