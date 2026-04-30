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
} from "lucide-react";
import type { Document } from "@workspace/types";
import { format } from "date-fns";
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
        return "outline";
      case "scan":
      case "mri":
      case "ct":
        return "destructive";
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
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient, file name, or type..."
            className="pl-9 bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Loading documents...
                  </TableCell>
                </TableRow>
              ) : documents.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No documents found.
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((document) => (
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
                      {format(new Date(document.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(document)}
                        className="gap-1.5"
                        title="View document"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">View</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(document)}
                        className="gap-1.5"
                        title="Download document"
                      >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Download</span>
                      </Button>
                      {document.url && (
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
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
