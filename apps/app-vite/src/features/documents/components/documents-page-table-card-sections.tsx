import { Badge, Button, ListRow, SortableHeaderButton, SymbolTooltip, type DataTableColumn } from "@workspace/ui/components";
import { Download, ExternalLink, Eye, FileText } from "lucide-react";
import type { Document } from "@workspace/types";
import { DOCUMENT_TYPE_LABELS } from "@workspace/types";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { formatDate } from "@workspace/utils";
import type {
  SortConfig,
  SortKey,
} from "@/features/documents/hooks/document-sort-types";

// jscpd:ignore-start
export function DocumentsSortableHeader({
  column,
  label,
  sortConfig,
  onSort,
}: {
  column: SortKey;
  label: string;
  sortConfig: SortConfig;
  onSort: (key: SortKey) => void;
}) {
  return (
    <SortableHeaderButton
      column={column}
      label={label}
      sortConfig={sortConfig}
      onSort={onSort}
    />
  );
}

export function getDocumentTypeBadgeVariant(type: string) {
// jscpd:ignore-end
  switch (type?.toLowerCase()) {
    case "lab_report":
    case "lab report":
      return "default" as const;
    case "prescription":
      return "secondary" as const;
    case "xray":
    case "x-ray":
    case "scan":
    case "mri":
    case "ct":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
}

/** Human-readable document type label — never surface the raw enum (e.g. LAB_REPORT). */
export function formatDocumentTypeLabel(type: string): string {
  const match = Object.entries(DOCUMENT_TYPE_LABELS).find(
    ([key]) => key === type,
  );
  return match ? match[1] : humanizeUiLabel(type);
}

export function getDocumentTitle(document: Document) {
  return document.name || document.filename || document.title || "—";
}

export function getDocumentPatientName(document: Document) {
  return document.patient?.name || document.patient?.firstName || "—";
}
// jscpd:ignore-start
export function DocumentActions({
  document,
  onView,
  onDownload,
  t,
}: {
  document: Document;
  onView: (document: Document) => void;
  onDownload: (document: Document) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="flex items-center justify-end">
      <SymbolTooltip label={t("actions.viewTooltip")}>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onView(document);
          }}
          className="gap-1.5"
        >
          <Eye className="h-4 w-4" />
          <span className="hidden sm:inline">{t("actions.view")}</span>
        </Button>
      </SymbolTooltip>
      <SymbolTooltip label={t("actions.downloadTooltip")}>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDownload(document);
          }}
          className="gap-1.5"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">{t("actions.download")}</span>
        </Button>
      </SymbolTooltip>
      {document.url ? (
        <SymbolTooltip label={t("actions.openInNewTab")}>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <a
              href={document.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("actions.openInNewTab")}
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          </Button>
        </SymbolTooltip>
      ) : null}
    </div>
  );
}
// jscpd:ignore-end
export function DocumentMobileRow({
  document,
  onView,
  onDownload,
  t,
}: {
  document: Document;
  onView: (document: Document) => void;
  onDownload: (document: Document) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-3">
      <ListRow
        token={(document.id || "").slice(0, 8).toUpperCase()}
        title={getDocumentTitle(document)}
        meta={getDocumentPatientName(document)}
        time={formatDate(document.createdAt, "MMM d, yyyy")}
        statusLabel={formatDocumentTypeLabel(document.type)}
        showChevron={false}
        onClick={() => onView(document)}
        trailing={
          <Badge
            variant={getDocumentTypeBadgeVariant(document.type)}
            className="mt-1"
          >
            {formatDocumentTypeLabel(document.type)}
          </Badge>
        }
      />
      <div className="flex flex-wrap gap-2 px-1">
        <Button
          variant="outline"
          size="sm"
          className="touch-manipulation"
          onClick={() => onView(document)}
        >
          <Eye className="mr-1.5 h-4 w-4" />
          {t("actions.view")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="touch-manipulation"
          onClick={() => onDownload(document)}
        >
          <Download className="mr-1.5 h-4 w-4" />
          {t("actions.download")}
        </Button>
      </div>
    </div>
  );
}

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
      hiddenOnMobile: true,
      cell: (document) => (
        <span className="font-mono text-sm">
          {(document.id || "").slice(0, 8).toUpperCase()}
        </span>
      ),
    },
    {
      id: "filename",
      header: (
        <DocumentsSortableHeader
          column="filename"
          label={t("columns.fileName")}
          sortConfig={sortConfig}
          onSort={onSort}
        />
      ),
      cell: (document) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="max-w-[150px] truncate font-medium sm:max-w-[200px]">
            {getDocumentTitle(document)}
          </span>
        </div>
      ),
    },
    {
      id: "patient",
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
