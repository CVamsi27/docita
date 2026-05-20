import { useState } from "react";
import { useDocuments } from "@/hooks/api/use-clinical";
import type { Document } from "@workspace/types";
import { useDebounce } from "@workspace/hooks/use-debounce";
import { browserRequest } from "@/lib/auth/browser-request";
import { logger } from "@/lib/monitoring/logger";

export type SortKey = "date" | "patient" | "type" | "filename";
export type SortDirection = "asc" | "desc";

export interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

export const useDocumentsLogic = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "date",
    direction: "desc",
  });

  const { data: documents = [], isLoading: loading } = useDocuments({
    search: debouncedSearch,
  });

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleView = (document: Document) => {
    if (document.url) {
      window.open(document.url, "_blank");
    }
  };

  const handleDownload = async (document: Document) => {
    if (document.url) {
      try {
        const response = await browserRequest(document.url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement("a");
        a.href = url;
        a.download =
          document.name || document.filename || document.title || "document";
        window.document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(a);
      } catch (error) {
        logger.error("Failed to download document", { error });
      }
    }
  };

  const sortedDocuments = [...documents].sort((a, b) => {
    let aValue: string | number = "";
    let bValue: string | number = "";

    switch (sortConfig.key) {
      case "date":
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      case "patient":
        aValue = (a.patient?.name || a.patient?.firstName || "").toLowerCase();
        bValue = (b.patient?.name || b.patient?.firstName || "").toLowerCase();
        break;
      case "type":
        aValue = (a.type || "").toLowerCase();
        bValue = (b.type || "").toLowerCase();
        break;
      case "filename":
        aValue = (a.name || a.filename || a.title || "").toLowerCase();
        bValue = (b.name || b.filename || b.title || "").toLowerCase();
        break;
    }

    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  return {
    documents: sortedDocuments,
    totalDocuments: documents.length,
    loading,
    searchQuery,
    setSearchQuery,
    sortConfig,
    handleSort,
    handleView,
    handleDownload,
  };
};
