"use client";

import { memo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/data-display/table-essentials";
import { Badge } from "@workspace/ui/components";
import { formatAmountLocale } from "@workspace/utils";
import { useTranslations } from "next-intl";
import type { InternalDetailedMetricsRow } from "@workspace/data-access/internal";

export type DetailedMetricsRow = InternalDetailedMetricsRow;

/**
 * Phase 3 (per-feature): apps/internal Analytics > Detailed metrics
 * table. 6 literals converted to useTranslations("InternalAnalytics.detailedMetricsTable").
 */
function useDetailedMetricsTableTranslations() {
  return useTranslations("InternalAnalytics.detailedMetricsTable");
}

/**
 * Phase 3 (per-feature): apps/internal Analytics > Detailed metrics
 * table. 6 literals converted to useTranslations("InternalAnalytics.detailedMetricsTable").
 */
function useDetailedMetricsTableTranslations() {
  return useTranslations("InternalAnalytics.detailedMetricsTable");
}

interface AnalyticsDetailedMetricsTableProps {
  rows: DetailedMetricsRow[];
}
function AnalyticsDetailedMetricsTableComponent({
  rows,
}: AnalyticsDetailedMetricsTableProps) {
  const t = useDetailedMetricsTableTranslations();
  return (
    <div className="overflow-x-hidden">
      <Table>
        <TableHeader className="border-b border-border">
          <TableRow>
            <TableHead>{t("colPeriod")}</TableHead>
            <TableHead className="text-right">{t("colRevenue")}</TableHead>
            <TableHead className="text-right">{t("colInvoices")}</TableHead>
            <TableHead className="text-right">{t("colAvgAmount")}</TableHead>
            <TableHead className="text-right">{t("colAppointments")}</TableHead>
            <TableHead className="text-right">{t("colFillRate")}</TableHead>
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
                  {t("fillRateValue", { rate: row.fillRate })}
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
