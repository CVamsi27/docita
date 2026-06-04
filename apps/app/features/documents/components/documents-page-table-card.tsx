import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import {
  DataTable,
} from "@workspace/ui/components/data-display/data-table";
import type { Document } from "@workspace/types";
import type { SortConfig, SortKey } from "@/features/documents/hooks/document-sort-types";
import {
  buildDocumentsTableColumns,
  DocumentMobileRow,
} from "./documents-page-table-card-sections";

export function DocumentsPageTableCard({
  documents,
  loading,
  sortConfig,
  onSort,
  onView,
  onDownload,
}: {
  documents: Document[];
  loading: boolean;
  sortConfig: SortConfig;
  onSort: (key: SortKey) => void;
  onView: (document: Document) => void;
  onDownload: (document: Document) => void;
}) {
  const columns = buildDocumentsTableColumns(sortConfig, onSort, onView, onDownload);

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle>All Documents</CardTitle>
        <CardDescription>
          A list of all documents uploaded for patients
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={documents}
          rowKey={(document) => document.id}
          isLoading={loading}
          emptyTitle="No documents found"
          emptyDescription="Upload documents from a patient record or import flow to see them listed here."
          onRowClick={onView}
          stackOnMobile
          mobileRenderer={(document) => (
            <DocumentMobileRow
              document={document}
              onView={onView}
              onDownload={onDownload}
            />
          )}
        />
      </CardContent>
    </Card>
  );
}
