"use client";

import { memo } from "react";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import { formatAmountLocale } from "@workspace/utils";
import type { InternalDetailedMetricsRow } from "@workspace/data-access/internal";

export type DetailedMetricsRow = InternalDetailedMetricsRow;

interface AnalyticsDetailedMetricsTableProps {
  rows: DetailedMetricsRow[];
}
function AnalyticsDetailedMetricsTableComponent({
  rows,
}: AnalyticsDetailedMetricsTableProps) {
  return (
    <div className="overflow-x-hidden">
      <Table>
        <TableHeader className="border-b border-border">
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Invoices</TableHead>
            <TableHead className="text-right">Avg amount</TableHead>
            <TableHead className="text-right">Appointments</TableHead>
            <TableHead className="text-right">Fill rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border">
          {rows.map((row) => (
            <TableRow
              key={`${row.period}-${row.revenue}-${row.invoices}`}
              className="hover:bg-accent"
            >
              <TableCell className="font-medium text-foreground">
                {row.period}
              </TableCell>
              <TableCell className="text-right text-foreground">
                ₹
                {formatAmountLocale(row.revenue, "en-IN", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {row.invoices}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                ₹
                {formatAmountLocale(row.avgAmount || 0, "en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {row.appointments}
              </TableCell>
              <TableCell className="text-right">
                <Badge
                  className={
                    row.fillRate >= 80
                      ? "badge-success"
                      : row.fillRate >= 60
                        ? "badge-warning"
                        : "badge-danger"
                  }
                >
                  {row.fillRate}%
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
export const AnalyticsDetailedMetricsTable = memo(
  AnalyticsDetailedMetricsTableComponent,
);
