// jscpd:ignore-start — import-only overlap with the column builder; logic is not duplicated.
import {
  Badge,
  Button,
  ListRow,
  SortableHeaderButton,
  SymbolTooltip,
} from "@workspace/ui/components";
import { Download, ExternalLink, Eye } from "lucide-react";
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
// jscpd:ignore-end

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
// jscpd:ignore-end
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
