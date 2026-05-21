import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  ExternalLink,
  Eye,
  FileText,
} from "lucide-react";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import { Skeleton } from "@workspace/ui/components/feedback/skeleton";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import type { Document } from "@workspace/types";
import { formatDate } from "@workspace/utils";
import type { SortConfig, SortKey } from "@/features/documents/hooks/use-documents-logic";

function DocumentsSortableHeader({
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

function getDocumentTypeBadgeVariant(type: string) {
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
  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle>All Documents</CardTitle>
        <CardDescription>
          A list of all documents uploaded for patients
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-hidden">
        {loading ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted/50">
                <TableHead className="hidden md:table-cell">Document ID</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead className="hidden sm:table-cell">Type</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`doc-skel-${i}`} className="hover:bg-transparent">
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-4 w-20 font-mono" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
                      <Skeleton className="h-4 max-w-[200px] flex-1" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents found"
            description="Upload documents from a patient record or import flow to see them listed here."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted/50">
                <TableHead className="hidden md:table-cell">Document ID</TableHead>
                <TableHead>
                  <DocumentsSortableHeader
                    column="filename"
                    label="File Name"
                    sortConfig={sortConfig}
                    onSort={onSort}
                  />
                </TableHead>
                <TableHead>
                  <DocumentsSortableHeader
                    column="patient"
                    label="Patient"
                    sortConfig={sortConfig}
                    onSort={onSort}
                  />
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  <DocumentsSortableHeader
                    column="type"
                    label="Type"
                    sortConfig={sortConfig}
                    onSort={onSort}
                  />
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  <DocumentsSortableHeader
                    column="date"
                    label="Date"
                    sortConfig={sortConfig}
                    onSort={onSort}
                  />
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((document) => (
                <TableRow key={document.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-sm hidden md:table-cell">
                    {(document.id || "").slice(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate max-w-[150px] sm:max-w-[200px]">
                        {document.name || document.filename || document.title}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {document.patient?.name ||
                      document.patient?.firstName ||
                      "-"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={getDocumentTypeBadgeVariant(document.type)}>
                      {document.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {formatDate(document.createdAt, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <SymbolTooltip label="View document">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(document)}
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
                        onClick={() => onDownload(document)}
                        className="gap-1.5"
                      >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Download</span>
                      </Button>
                    </SymbolTooltip>
                    {document.url ? (
                      <SymbolTooltip label="Open in new tab">
                        <Button variant="ghost" size="sm" asChild className="gap-1.5">
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
