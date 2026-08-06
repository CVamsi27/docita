import { useTranslation } from "react-i18next";
import { AppPageScaffold, DataState, PageHeader } from "@workspace/ui/components";
import type { Document } from "@workspace/types";
import { FileText } from "lucide-react";
import type {
  SortConfig,
  SortKey,
} from "@/features/documents/hooks/document-sort-types";
import { DocumentsPageSearchBar } from "@/features/documents/components/documents-page-search-bar";
import { DocumentsPageTableCard } from "@/features/documents/components/documents-page-table-card";

interface DocumentsPageUIProps {
  documents: Document[];
  totalCount: number;
  loading: boolean;
  isError: boolean;
  onRetry: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortConfig: SortConfig;
  handleSort: (key: SortKey) => void;
  handleView: (document: Document) => void;
  handleDownload: (document: Document) => void;
}

export function DocumentsPageUI({
  documents,
  totalCount,
  loading,
  isError,
  onRetry,
  searchQuery,
  setSearchQuery,
  sortConfig,
  handleSort,
  handleView,
  handleDownload,
}: DocumentsPageUIProps) {
  const { t } = useTranslation("Documents");
  const header = (
    <PageHeader
      title={t("pageHeader.title")}
      description={t("pageHeader.description")}
    />
  );

  if (loading) {
    return (
      <AppPageScaffold header={header}>
        <DataState
          status="loading"
          className="min-h-[40vh]"
          loadingMessage={t("loading")}
        />
      </AppPageScaffold>
    );
  }

  if (isError) {
    return (
      <AppPageScaffold header={header}>
        <DataState
          status="error"
          className="min-h-[40vh]"
          errorMessage={t("error")}
          onRetry={onRetry}
        />
      </AppPageScaffold>
    );
  }

  if (documents.length === 0 && !searchQuery) {
    return (
      <AppPageScaffold header={header}>
        <DataState
          status="empty"
          className="min-h-[40vh]"
          emptyIcon={FileText}
          emptyTitle={t("emptyTitle")}
          emptyDescription={t("emptyDescription")}
        />
      </AppPageScaffold>
    );
  }

  return (
    <AppPageScaffold header={header}>
      <DocumentsPageSearchBar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

      <DocumentsPageTableCard
        documents={documents}
        loading={loading}
        sortConfig={sortConfig}
        onSort={handleSort}
        onView={handleView}
        onDownload={handleDownload}
      />

      <div className="flex items-center justify-between">
        <p className="text-[var(--fs-xs)] text-muted-foreground">
          {t("showing", { count: documents.length, total: totalCount })}
        </p>
      </div>
    </AppPageScaffold>
  );
}
