import { useTranslation } from "react-i18next";
import { PageMeta } from "@/components/layout/page-meta";
import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { useDocumentsLogic } from "../hooks/use-documents-logic";
import { DocumentsPageUI } from "../components/DocumentsPageUI";

export function DocumentsPage() {
  const { t } = useTranslation("Documents");
  const {
    documents,
    totalDocuments,
    loading,
    isError,
    retry,
    searchQuery,
    setSearchQuery,
    sortConfig,
    handleSort,
    handleView,
    handleDownload,
  } = useDocumentsLogic();

  return (
    <>
      <PageMeta
        title={t("pageTitle")}
        description={t("pageDescription")}
      />
      <FeatureGate feature={Feature.DOCUMENT_ARCHIVAL} showLockedCard>
        <DocumentsPageUI
          documents={documents}
          totalCount={totalDocuments}
          loading={loading}
          isError={isError}
          onRetry={retry}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sortConfig={sortConfig}
          handleSort={handleSort}
          handleView={handleView}
          handleDownload={handleDownload}
        />
      </FeatureGate>
    </>
  );
}
