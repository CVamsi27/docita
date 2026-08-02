import { useTranslation } from "react-i18next";
import {
  DataTable,
} from "@workspace/ui/components/data-display/data-table";
import type { Document } from "@workspace/types";
import type { SortConfig, SortKey } from "@/features/documents/hooks/document-sort-types";
import { buildDocumentsTableColumns, DocumentMobileRow } from "./documents-page-table-card-sections";

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
  const { t } = useTranslation("Documents");
  const columns = buildDocumentsTableColumns(sortConfig, onSort, onView, onDownload, t);

  return (
    <DataTable
      columns={columns}
      data={documents}
      rowKey={(document) => document.id}
      isLoading={loading}
      emptyTitle={t("emptyTitle")}
      emptyDescription={t("emptyDescription")}
      onRowClick={onView}
      stackOnMobile
      mobileRenderer={(document) => (
        <DocumentMobileRow
          document={document}
          onView={onView}
          onDownload={onDownload}
          t={t}
        />
      )}
      className="ui-card-surface"
    />
  );
}
