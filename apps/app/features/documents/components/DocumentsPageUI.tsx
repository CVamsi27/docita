import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import type { Document } from "@workspace/types";
import type { SortConfig, SortKey } from "@/features/documents/hooks/use-documents-logic";
import { DocumentsPageSearchBar } from "@/features/documents/components/documents-page-search-bar";
import { DocumentsPageTableCard } from "@/features/documents/components/documents-page-table-card";

interface DocumentsPageUIProps {
  documents: Document[];
  totalCount: number;
  loading: boolean;
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
  searchQuery,
  setSearchQuery,
  sortConfig,
  handleSort,
  handleView,
  handleDownload,
}: DocumentsPageUIProps) {
  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Documents"
          description="View and manage all uploaded documents."
        />
      }
    >
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
