// jscpd:ignore-start — import-only overlap with the table row module; logic is not duplicated.
import { Badge, type DataTableColumn } from "@workspace/ui/components";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { FileText } from "lucide-react";
import type { Document } from "@workspace/types";
import { formatDate } from "@workspace/utils";
import type {
  SortConfig,
  SortKey,
} from "@/features/documents/hooks/document-sort-types";
import {
  formatDocumentTypeLabel,
  getDocumentPatientName,
  getDocumentTitle,
  getDocumentTypeBadgeVariant,
} from "./documents-table-helpers";
import {
  DocumentActions,
  DocumentsSortableHeader,
} from "./documents-page-table-card-sections";
// jscpd:ignore-end

export function buildDocumentsTableColumns(
  sortConfig: SortConfig,
  onSort: (key: SortKey) => void,
  onView: (document: Document) => void,
  onDownload: (document: Document) => void,
  t: (key: string) => string,
): DataTableColumn<Document>[] {
  return [
    {
      id: "id",
      header: t("columns.documentId"),
      width: "13%",
      hiddenOnMobile: true,
      cell: (document) => (
        <span className="font-mono text-sm">
          {(document.id || "").slice(0, 8).toUpperCase()}
        </span>
      ),
    },
    {
      id: "filename",
      width: "17%",
      header: (
        <DocumentsSortableHeader
          column="filename"
          label={t("columns.fileName")}
          sortConfig={sortConfig}
          onSort={onSort}
        />
      ),
      // The label shrinks to the column instead of a fixed max-width cap, which
      // used to spill the filename into the neighbouring column at 768px.
      cell: (document) => {
        const title = getDocumentTitle(document);
        return (
          <SymbolTooltip label={title} delayDuration={600}>
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-medium">
                {title}
              </span>
            </div>
          </SymbolTooltip>
        );
      },
    },
    {
      id: "patient",
      width: "17%",
      header: (
        <DocumentsSortableHeader
          column="patient"
          label={t("columns.patient")}
          sortConfig={sortConfig}
          onSort={onSort}
        />
      ),
      cell: (document) => getDocumentPatientName(document),
    },
    {
      id: "type",
      width: "19%",
      header: (
        <DocumentsSortableHeader
          column="type"
          label={t("columns.type")}
          sortConfig={sortConfig}
          onSort={onSort}
        />
      ),
      hiddenOnMobile: true,
      cell: (document) => (
        <Badge variant={getDocumentTypeBadgeVariant(document.type)}>
          {formatDocumentTypeLabel(document.type)}
        </Badge>
      ),
    },
    {
      id: "date",
      width: "16%",
      header: (
        <DocumentsSortableHeader
          column="date"
          label={t("columns.date")}
          sortConfig={sortConfig}
          onSort={onSort}
        />
      ),
      hiddenOnMobile: true,
      cell: (document) => formatDate(document.createdAt, "MMM d, yyyy"),
    },
    {
      id: "actions",
      width: "18%",
      header: t("columns.actions"),
      align: "right",
      cell: (document) => (
        <DocumentActions
          document={document}
          onView={onView}
          onDownload={onDownload}
          t={t}
        />
      ),
    },
  ];
}
