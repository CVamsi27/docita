"use client";

import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { useDocumentsLogic } from "@/features/documents/hooks/use-documents-logic";
import { DocumentsPageUI } from "@/features/documents/components/DocumentsPageUI";

export function DocumentsPageContainer() {
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
    <FeatureGate feature={Feature.DOCUMENT_ARCHIVAL} showLockedCard>
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
    </FeatureGate>
  );
}
