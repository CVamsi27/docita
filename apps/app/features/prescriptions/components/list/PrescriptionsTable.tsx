import React from "react";
import Link from "next/link";
import { formatDate } from "@workspace/utils";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Eye,
  Pill,
  Printer,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import type { Prescription } from "@workspace/types";

export type SortKey = "date" | "patient" | "diagnosis" | "medications";
export type SortDirection = "asc" | "desc";

export interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

interface PrescriptionsTableProps {
  prescriptions: Prescription[];
  loading: boolean;
  sortConfig: SortConfig;
  onSort: (key: SortKey) => void;
  onDownloadPDF: (id: string) => void;
}

export function PrescriptionsTable({
  prescriptions,
  loading,
  sortConfig,
  onSort,
  onDownloadPDF,
}: PrescriptionsTableProps) {
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

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle>All prescriptions</CardTitle>
        <CardDescription>
          A list of all prescriptions generated for patients
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-muted/50">
              <TableHead className="hidden md:table-cell">Prescription ID</TableHead>
              <TableHead>
                <SortableHeader column="patient" label="Patient" />
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                <SortableHeader column="diagnosis" label="Diagnosis" />
              </TableHead>
              <TableHead>
                <SortableHeader column="medications" label="Medications" />
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
                  Loading prescriptions…
                </TableCell>
              </TableRow>
            ) : prescriptions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No prescriptions found.
                </TableCell>
              </TableRow>
            ) : (
              prescriptions.map((prescription) => (
                <TableRow key={prescription.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-sm hidden md:table-cell">
                    {(prescription.id || "").slice(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell className="max-w-[160px] sm:max-w-none">
                    <div className="flex flex-col">
                      <span className="font-medium truncate">
                        {prescription.patient?.firstName}{" "}
                        {prescription.patient?.lastName}
                      </span>
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {prescription.patient?.phoneNumber}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate hidden sm:table-cell">
                    {prescription.diagnosis || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      <Pill className="h-3 w-3 mr-1" />
                      {prescription.medications?.length || 0} meds
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {formatDate(prescription.createdAt, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <SymbolTooltip label="View prescription">
                      <Button variant="ghost" size="sm" asChild className="gap-1.5">
                        <Link
                          href={`/prescriptions/${prescription.id}`}
                          aria-label="View prescription"
                        >
                          <Eye className="h-4 w-4" aria-hidden />
                          <span className="hidden sm:inline">View</span>
                        </Link>
                      </Button>
                    </SymbolTooltip>
                    <SymbolTooltip label="Download PDF">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDownloadPDF(prescription.id || "")}
                        className="gap-1.5"
                      >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">PDF</span>
                      </Button>
                    </SymbolTooltip>
                    <SymbolTooltip label="Print prescription">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (!prescription.id) return;
                          window.open(
                            `/prescriptions/${prescription.id}?print=true`,
                            "_blank",
                          );
                        }}
                        className="gap-1.5"
                      >
                        <Printer className="h-4 w-4" />
                        <span className="hidden sm:inline">Print</span>
                      </Button>
                    </SymbolTooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  );
}
