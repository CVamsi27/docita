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
  const header = (
    <PageHeader
      title="Documents"
      description="View and manage all uploaded documents."
    />
  );

  if (loading) {
    return (
      <AppPageScaffold header={header}>
        <DataState
          status="loading"
          className="min-h-[40vh]"
          loadingMessage="Loading documents…"
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
          errorMessage="We could not load documents. Please try again."
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
          emptyTitle="No documents yet"
          emptyDescription="Upload documents from a patient record or import flow to see them listed here."
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
          Showing {documents.length} of {totalCount} documents
        </p>
      </div>
    </AppPageScaffold>
  );
}
