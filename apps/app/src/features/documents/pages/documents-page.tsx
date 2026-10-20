import { useTranslation } from "react-i18next";
import { PageMeta } from "@/components/layout/page-meta";
import { Feature } from "@workspace/types";
import { PageFeatureGate } from "@/components/auth/PageFeatureGate";
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
      <PageMeta title={t("pageTitle")} description={t("pageDescription")} />
      <PageFeatureGate
        feature={Feature.DOCUMENT_ARCHIVAL}
        title={t("pageHeader.title")}
        description={t("pageHeader.description")}
      >
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
      </PageFeatureGate>
    </>
  );
}
