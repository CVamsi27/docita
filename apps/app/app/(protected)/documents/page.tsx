"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
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
  Search,
  Eye,
  Download,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
} from "lucide-react";
import { apiHooks } from "@/lib/api-hooks";
import type { Document } from "@workspace/types";
import { format } from "date-fns";

type SortKey = "date" | "patient" | "type" | "fileName";
type SortDirection = "asc" | "desc";

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: documents = [], isLoading: loading } = apiHooks.useDocuments();
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({
    key: "date",
    direction: "desc",
  });

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleView = (document: Document) => {
    if (document.url) {
      window.open(document.url, "_blank");
    }
  };

  const handleDownload = async (document: Document) => {
    if (document.url) {
      try {
        const response = await fetch(document.url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement("a");
        a.href = url;
        a.download = document.fileName || document.name || "document";
        window.document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(a);
      } catch (error) {
        console.error("Failed to download:", error);
      }
    }
  };

  const filteredAndSortedDocuments = useMemo(() => {
    let result = [...documents];

    // Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) => {
        const patientName = (
          item.patient?.name ||
          item.patient?.firstName ||
          ""
        ).toLowerCase();
        const fileName = (item.fileName || item.name || "").toLowerCase();
        const type = (item.type || "").toLowerCase();
        return (
          patientName.includes(query) ||
          fileName.includes(query) ||
          type.includes(query)
        );
      });
    }

    // Sort
    result.sort((a, b) => {
      let aValue: string | number = "";
      let bValue: string | number = "";

      switch (sortConfig.key) {
        case "date":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case "patient":
          aValue = (
            a.patient?.name ||
            a.patient?.firstName ||
            ""
          ).toLowerCase();
          bValue = (
            b.patient?.name ||
            b.patient?.firstName ||
            ""
          ).toLowerCase();
          break;
        case "type":
          aValue = (a.type || "").toLowerCase();
          bValue = (b.type || "").toLowerCase();
          break;
        case "fileName":
          aValue = (a.fileName || a.name || "").toLowerCase();
          bValue = (b.fileName || b.name || "").toLowerCase();
          break;
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [documents, searchQuery, sortConfig]);

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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            View and manage all uploaded documents.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
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
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted/50">
                <TableHead>Document ID</TableHead>
                <TableHead>
                  <SortableHeader column="fileName" label="File Name" />
                </TableHead>
                <TableHead>
                  <SortableHeader column="patient" label="Patient" />
                </TableHead>
                <TableHead>
                  <SortableHeader column="type" label="Type" />
                </TableHead>
                <TableHead>
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
              ) : filteredAndSortedDocuments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No documents found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedDocuments.map((document) => (
                  <TableRow key={document.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-sm">
                      {(document.id || "").slice(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium truncate max-w-[200px]">
                          {document.fileName || document.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {document.patient?.name ||
                        document.patient?.firstName ||
                        "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTypeColor(document.type)}>
                        {document.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(document.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(document)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(document)}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                      {document.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="gap-2"
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
        <p className="text-sm text-muted-foreground">
          Showing {filteredAndSortedDocuments.length} of {documents.length}{" "}
          documents
        </p>
      </div>
    </div>
  );
}
