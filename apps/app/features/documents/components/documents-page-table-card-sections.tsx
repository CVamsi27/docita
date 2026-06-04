import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  type DataTableColumn,
} from "@workspace/ui/components/data-display/data-table";
import { ListRow } from "@workspace/ui/components/data-display/list-row";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  ExternalLink,
  Eye,
  FileText,
} from "lucide-react";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import type { Document } from "@workspace/types";
import { formatDate } from "@workspace/utils";
import type { SortConfig, SortKey } from "@/features/documents/hooks/use-documents-logic";

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
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onSort(column)}
      className="gap-1 h-8 px-0 font-medium hover:bg-transparent"
    >
      {label}
      {sortConfig.key === column ? (
        sortConfig.direction === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </Button>
  );
}

export function getDocumentTypeBadgeVariant(type: string) {
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

export function getDocumentTitle(document: Document) {
  return document.name || document.filename || document.title || "—";
}

export function getDocumentPatientName(document: Document) {
  return document.patient?.name || document.patient?.firstName || "—";
}

export function DocumentActions({
  document,
  onView,
  onDownload,
}: {
  document: Document;
  onView: (document: Document) => void;
  onDownload: (document: Document) => void;
}) {
  return (
    <div className="flex items-center justify-end">
      <SymbolTooltip label="View document">
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
          <span className="hidden sm:inline">View</span>
        </Button>
      </SymbolTooltip>
      <SymbolTooltip label="Download document">
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
          <span className="hidden sm:inline">Download</span>
        </Button>
      </SymbolTooltip>
      {document.url ? (
        <SymbolTooltip label="Open in new tab">
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
              aria-label="Open document in new tab"
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          </Button>
        </SymbolTooltip>
      ) : null}
    </div>
  );
}

export function DocumentMobileRow({
  document,
  onView,
  onDownload,
}: {
  document: Document;
  onView: (document: Document) => void;
  onDownload: (document: Document) => void;
}) {
  return (
    <div className="space-y-3">
      <ListRow
        token={(document.id || "").slice(0, 8).toUpperCase()}
        title={getDocumentTitle(document)}
        meta={getDocumentPatientName(document)}
        time={formatDate(document.createdAt, "MMM d, yyyy")}
        statusLabel={document.type}
        showChevron={false}
        onClick={() => onView(document)}
        trailing={
          <Badge
            variant={getDocumentTypeBadgeVariant(document.type)}
            className="mt-1"
          >
            {document.type}
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
          View
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="touch-manipulation"
          onClick={() => onDownload(document)}
        >
          <Download className="mr-1.5 h-4 w-4" />
          Download
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
): DataTableColumn<Document>[] {
  return [
    {
      id: "id",
      header: "Document ID",
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
          label="File Name"
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
          label="Patient"
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
          label="Type"
          sortConfig={sortConfig}
          onSort={onSort}
        />
      ),
      hiddenOnMobile: true,
      cell: (document) => (
        <Badge variant={getDocumentTypeBadgeVariant(document.type)}>
          {document.type}
        </Badge>
      ),
    },
    {
      id: "date",
      header: (
        <DocumentsSortableHeader
          column="date"
          label="Date"
          sortConfig={sortConfig}
          onSort={onSort}
        />
      ),
      hiddenOnMobile: true,
      cell: (document) => formatDate(document.createdAt, "MMM d, yyyy"),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (document) => (
        <DocumentActions
          document={document}
          onView={onView}
          onDownload={onDownload}
        />
      ),
    },
  ];
}
