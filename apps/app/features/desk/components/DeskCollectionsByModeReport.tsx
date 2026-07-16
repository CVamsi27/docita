"use client";

import { useState } from "react";
import { useCollectionsByModeReport } from "@workspace/data-access";
import { formatPaymentChannelLabel } from "@workspace/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Label } from "@workspace/ui/components/form/label";
import { Input } from "@workspace/ui/components/form/input";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import { Wallet } from "lucide-react";
import { useTranslations } from "next-intl";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface DeskCollectionsByModeReportProps {
  formatMoney: (amount: number | undefined) => string;
}

/**
 * Phase 3 (per-feature): apps/app Desk > Collections by mode report.
 * 6 literals converted to useTranslations("Desk.collectionsByModeReport").
 */
function useCollectionsByModeTranslations() {
  return useTranslations("Desk.collectionsByModeReport");
}

export function DeskCollectionsByModeReport({
  formatMoney,
}: DeskCollectionsByModeReportProps) {
  const t = useCollectionsByModeTranslations();
  const [from, setFrom] = useState(todayIso);
  const [to, setTo] = useState(todayIso);

  const validRange = from <= to;
  const { data, isLoading, isError, error, refetch } =
    useCollectionsByModeReport({ from, to }, { enabled: validRange });

  const rows = data?.byMode ?? [];
  const status: "loading" | "error" | "empty" | "success" = !validRange
    ? "empty"
    : isLoading
      ? "loading"
      : isError
        ? "error"
        : rows.length === 0
          ? "empty"
          : "success";

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <MicroLabel className="text-muted-foreground">{t("reportMicroLabel")}</MicroLabel>
            <CardTitle>{t("title")}</CardTitle>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="collections-from" className="text-[var(--fs-xs)]">
                {t("fromLabel")}
              </Label>
              <Input
                id="collections-from"
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="collections-to" className="text-[var(--fs-xs)]">
                {t("toLabel")}
              </Label>
              <Input
                id="collections-to"
                type="date"
                value={to}
                min={from}
                onChange={(e) => setTo(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DataState
          status={status}
          loadingMessage={t("loadingLabel")}
          errorMessage={
            validRange
              ? error?.message
              : t("invalidRangeErrorFallback")
          }
          onRetry={() => void refetch()}
          emptyTitle={
            validRange ? t("emptyRangeTitle") : t("invalidRangeTitle")
          }
          emptyDescription={
            validRange
              ? t("emptyRangeDescription")
              : t("invalidRangeDescription")
          }
          emptyIcon={Wallet}
        >
          {status === "success" ? (
            <div className="overflow-x-auto overscroll-x-contain">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("colPaidBy")}</TableHead>
                    <TableHead className="text-right">{t("colPayments")}</TableHead>
                    <TableHead className="text-right">{t("colAmount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.mode}>
                      <TableCell>
                        {row.label || formatPaymentChannelLabel(row.mode)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.count}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(row.amountCents / 100)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2">
                    <TableCell className="font-semibold">{t("totalLabel")}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {data?.count ?? 0}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatMoney((data?.totalCents ?? 0) / 100)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : null}
        </DataState>
      </CardContent>
    </Card>
  );
}
