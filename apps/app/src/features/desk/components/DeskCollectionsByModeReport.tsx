import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCollectionsByModeReport } from "@workspace/data-access";
import { formatPaymentChannelLabel } from "@workspace/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/data-display/table-essentials";
import { Card, CardContent, CardHeader, CardTitle, DataState, Label, MicroLabel } from "@workspace/ui/components";
import { IsoDatePickerField } from "@workspace/ui/components/form/iso-date-picker-field";
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
  const { t } = useTranslation("Desk");
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
            <MicroLabel className="text-muted-foreground">
              {t("collectionsByModeReport.reportMicroLabel")}
            </MicroLabel>
            <CardTitle>{t("collectionsByModeReport.title")}</CardTitle>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="collections-from" className="text-[var(--fs-xs)]">
                {t("collectionsByModeReport.fromLabel")}
              </Label>
              <IsoDatePickerField
                id="collections-from"
                label={t("collectionsByModeReport.fromLabel")}
                showLabel={false}
                value={from}
                onChange={setFrom}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="collections-to" className="text-[var(--fs-xs)]">
                {t("collectionsByModeReport.toLabel")}
              </Label>
              <IsoDatePickerField
                id="collections-to"
                label={t("collectionsByModeReport.toLabel")}
                showLabel={false}
                value={to}
                onChange={setTo}
                className="w-40"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DataState
          status={status}
          loadingMessage={t("collectionsByModeReport.loadingLabel")}
          errorMessage={
            validRange
              ? error?.message
              : t("collectionsByModeReport.invalidRangeErrorFallback")
          }
          onRetry={() => void refetch()}
          emptyTitle={
            validRange
              ? t("collectionsByModeReport.emptyRangeTitle")
              : t("collectionsByModeReport.invalidRangeTitle")
          }
          emptyDescription={
            validRange
              ? t("collectionsByModeReport.emptyRangeDescription")
              : t("collectionsByModeReport.invalidRangeDescription")
          }
          emptyIcon={Wallet}
        >
          {status === "success" ? (
            <div className="overflow-x-auto overscroll-x-contain">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("collectionsByModeReport.colPaidBy")}</TableHead>
                    <TableHead className="text-right">
                      {t("collectionsByModeReport.colPayments")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("collectionsByModeReport.colAmount")}
                    </TableHead>
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
                    <TableCell className="font-semibold">
                      {t("collectionsByModeReport.totalLabel")}
                    </TableCell>
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
