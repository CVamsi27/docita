
import { useMemo, useState } from "react";
import { apiHooks } from "@/lib/api-hooks";
import type { Document } from "@workspace/types";

export type SortKey = "date" | "patient" | "type" | "fileName";
export type SortDirection = "asc" | "desc";

export interface SortConfig {
    key: SortKey;
    direction: SortDirection;
}

export const useDocumentsLogic = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const { data: documents = [], isLoading: loading } = apiHooks.useDocuments();
    const [sortConfig, setSortConfig] = useState<SortConfig>({
        key: "date",
        direction: "desc",
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
                const response = await fetch(document.url);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = window.document.createElement("a");
                a.href = url;
                a.download = document.fileName || document.name || "document";
                window.document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                window.document.body.removeChild(a);
            } catch (error) {
                console.error("Failed to download:", error);
            }
        }
    };

    const filteredAndSortedDocuments = useMemo(() => {
        let result = [...documents];

        // Filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter((item) => {
                const patientName = (
                    item.patient?.name ||
                    item.patient?.firstName ||
                    ""
                ).toLowerCase();
                const fileName = (item.fileName || item.name || "").toLowerCase();
                const type = (item.type || "").toLowerCase();
                return (
                    patientName.includes(query) ||
                    fileName.includes(query) ||
                    type.includes(query)
                );
            });
        }

        // Sort
        result.sort((a, b) => {
            let aValue: string | number = "";
            let bValue: string | number = "";

            switch (sortConfig.key) {
                case "date":
                    aValue = new Date(a.createdAt).getTime();
                    bValue = new Date(b.createdAt).getTime();
                    break;
                case "patient":
                    aValue = (
                        a.patient?.name ||
                        a.patient?.firstName ||
                        ""
                    ).toLowerCase();
                    bValue = (
                        b.patient?.name ||
                        b.patient?.firstName ||
                        ""
                    ).toLowerCase();
                    break;
                case "type":
                    aValue = (a.type || "").toLowerCase();
                    bValue = (b.type || "").toLowerCase();
                    break;
                case "fileName":
                    aValue = (a.fileName || a.name || "").toLowerCase();
                    bValue = (b.fileName || b.name || "").toLowerCase();
                    break;
            }

            if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });

        return result;
    }, [documents, searchQuery, sortConfig]);

    return {
        documents: filteredAndSortedDocuments, // Return processed documents
        totalDocuments: documents.length,
        loading,
        searchQuery,
        setSearchQuery,
        sortConfig,
        handleSort,
        handleView,
        handleDownload
    };
};
