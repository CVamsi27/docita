import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Search,
  X,
} from "lucide-react";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { SymbolTooltip } from "@workspace/ui/components/tooltip";
import type { Document } from "@workspace/types";
import { formatDate } from "@workspace/utils";
import { SortConfig, SortKey } from "@/features/documents/hooks/use-documents-logic";

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
  const SortableHeader = ({
    column,
    label,
  }: {
    column: SortKey;
    label: string;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(column)}
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

  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case "lab_report":
      case "lab report":
        return "default";
      case "prescription":
        return "secondary";
      case "xray":
      case "x-ray":
      case "scan":
      case "mri":
      case "ct":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Documents"
          description="View and manage all uploaded documents."
        />
      }
    >
      <div className="flex items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden />
          <Input
            placeholder="Enter patient, file name, or type"
            className={cn(
              "bg-background pl-9",
              searchQuery.trim() ? "pr-10" : "",
            )}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search documents"
          />
          {searchQuery.trim() ? (
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
              <SymbolTooltip label="Clear search">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4 text-muted-foreground" aria-hidden />
                </Button>
              </SymbolTooltip>
            </div>
          ) : null}
        </div>
      </div>

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
                  <TableHead className="hidden md:table-cell">
                    Document ID
                  </TableHead>
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
                        <Skeleton
                          className="h-4 w-4 shrink-0 rounded-sm"
                        />
                        <Skeleton
                          className="h-4 max-w-[200px] flex-1"
                        />
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
                        <Skeleton
                          className="h-8 w-8 rounded-md"
                        />
                        <Skeleton
                          className="h-8 w-8 rounded-md"
                        />
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
                  <SortableHeader column="filename" label="File Name" />
                </TableHead>
                <TableHead>
                  <SortableHeader column="patient" label="Patient" />
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  <SortableHeader column="type" label="Type" />
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  <SortableHeader column="date" label="Date" />
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
                      <Badge variant={getTypeColor(document.type)}>
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
                          onClick={() => handleView(document)}
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
                          onClick={() => handleDownload(document)}
                          className="gap-1.5"
                        >
                          <Download className="h-4 w-4" />
                          <span className="hidden sm:inline">Download</span>
                        </Button>
                      </SymbolTooltip>
                      {document.url && (
                        <SymbolTooltip label="Open in new tab">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="gap-1.5"
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
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-[var(--fs-xs)] text-muted-foreground">
          Showing {documents.length} of {totalCount} documents
        </p>
      </div>
    </AppPageScaffold>
  );
}
