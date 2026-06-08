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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface DeskCollectionsByModeReportProps {
  formatMoney: (amount: number | undefined) => string;
}

export function DeskCollectionsByModeReport({
  formatMoney,
}: DeskCollectionsByModeReportProps) {
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
            <MicroLabel className="text-muted-foreground">Report</MicroLabel>
            <CardTitle>Collections by mode</CardTitle>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="collections-from" className="text-[var(--fs-xs)]">
                From
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
                To
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
          loadingMessage="Loading collections…"
          errorMessage={
            validRange
              ? error?.message
              : "Select a valid date range to view collections."
          }
          onRetry={() => void refetch()}
          emptyTitle={
            validRange ? "No collections in this range" : "Invalid date range"
          }
          emptyDescription={
            validRange
              ? "Settled desk and online payments will appear here grouped by payment mode."
              : "The start date must be on or before the end date."
          }
          emptyIcon={Wallet}
        >
          {status === "success" ? (
            <div className="overflow-x-auto overscroll-x-contain">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paid by</TableHead>
                    <TableHead className="text-right">Payments</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
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
                    <TableCell className="font-semibold">Total</TableCell>
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
