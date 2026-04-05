"use client";

import { memo } from "react";
import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

export interface DetailedMetricsRow {
  period: string;
  revenue: number;
  invoices: number;
  avgAmount: number;
  appointments: number;
  fillRate: number;
}

interface AnalyticsDetailedMetricsTableProps {
  rows: DetailedMetricsRow[];
}

function AnalyticsDetailedMetricsTableComponent({
  rows,
}: AnalyticsDetailedMetricsTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="border-b border-border">
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Invoices</TableHead>
            <TableHead className="text-right">Avg Amount</TableHead>
            <TableHead className="text-right">Appointments</TableHead>
            <TableHead className="text-right">Fill Rate</TableHead>
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
                ₹{row.revenue.toLocaleString()}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {row.invoices}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                ₹{(row.avgAmount || 0).toFixed(2)}
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
