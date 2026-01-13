"use client";

import { useDocumentsLogic } from "@/features/documents/hooks/use-documents-logic";
import { DocumentsPageUI } from "@/features/documents/components/DocumentsPageUI";

export default function DocumentsPage() {
  const {
    documents,
    totalDocuments,
    loading,
    searchQuery,
    setSearchQuery,
    sortConfig,
    handleSort,
    handleView,
    handleDownload,
  } = useDocumentsLogic();

  return (
    <DocumentsPageUI
      documents={documents}
      totalCount={totalDocuments}
      loading={loading}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      sortConfig={sortConfig}
      handleSort={handleSort}
      handleView={handleView}
      handleDownload={handleDownload}
    />
  );
}
