"use client";

import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import { StatusBadge } from "@workspace/ui/components/indicators/status-badge";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { Feature } from "@workspace/types";
import {
  Banknote,
  BookOpen,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { addDaysToPickerIsoDate } from "@workspace/utils";
import { FeatureGate } from "@/components/auth/feature-gate";
import { useClinicCurrency } from "@/hooks/use-clinic-currency";
import { formatDate, formatTime } from "@/lib/formatters";
import { useDaybook } from "@/features/daybook/hooks/use-daybook";

export function DaybookPageContent() {
  const {
    selectedDayIso,
    setSelectedDayIso,
    isToday,
    isLoading,
    isError,
    refetch,
    summary,
  } = useDaybook();
  const { formatCurrency } = useClinicCurrency();

  const header = (
    <PageHeader
      title="Daybook"
      description="End-of-day cash reconciliation — collections, payment-method breakdown, and ledger for the day."
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-[var(--radius-md)] border border-border/60 bg-muted/30 p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Previous day"
              onClick={() => setSelectedDayIso(addDaysToPickerIsoDate(selectedDayIso, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[7.5rem] px-1 text-center text-[length:var(--fs-sm)] font-medium tabular-nums">
              {formatDate(selectedDayIso, "d MMM yyyy")}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Next day"
              disabled={isToday}
              onClick={() => setSelectedDayIso(addDaysToPickerIsoDate(selectedDayIso, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" className="gap-2" onClick={refetch}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      }
    />
  );

  if (isError) {
    return (
      <FeatureGate feature={Feature.INVOICING} showLockedCard>
        <AppPageScaffold header={header}>
          <DataState
            status="error"
            className="min-h-[40vh]"
            errorMessage="We could not load the daybook for this day. Please try again."
            onRetry={refetch}
          />
        </AppPageScaffold>
      </FeatureGate>
    );
  }

  return (
    <FeatureGate feature={Feature.INVOICING} showLockedCard>
      <AppPageScaffold header={header}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="ui-card-surface">
            <CardHeader className="pb-2">
              <p className="ui-eyebrow">Collected</p>
            </CardHeader>
            <CardContent>
              <p className="ui-money text-[var(--fs-3xl)]">
                {formatCurrency(summary.collected)}
              </p>
              <p className="ui-helper-text mt-1">
                {summary.paidCount} paid invoice
                {summary.paidCount === 1 ? "" : "s"}
              </p>
            </CardContent>
          </Card>
          <Card className="ui-card-surface">
            <CardHeader className="pb-2">
              <p className="ui-eyebrow">Pending</p>
            </CardHeader>
            <CardContent>
              <p className="ui-money text-[var(--fs-3xl)]">
                {formatCurrency(summary.pending)}
              </p>
              <p className="ui-helper-text mt-1">Outstanding this day</p>
            </CardContent>
          </Card>
          <Card className="ui-card-surface">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="ui-eyebrow">Cash on hand</p>
                <Wallet className="size-4 text-muted-foreground" aria-hidden />
              </div>
            </CardHeader>
            <CardContent>
              <p className="ui-money text-[var(--fs-3xl)]">
                {formatCurrency(summary.cashOnHand)}
              </p>
              <p className="ui-helper-text mt-1">Cash collections only</p>
            </CardContent>
          </Card>
        </div>

        {summary.byMethod.length > 0 ? (
          <Card className="ui-card-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[length:var(--fs-lg)]">
                <Banknote className="size-4 text-muted-foreground" aria-hidden />
                Collected by method
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {summary.byMethod.map((entry) => (
                <div
                  key={entry.method}
                  className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border/60 bg-background/60 px-3 py-1.5"
                >
                  <span className="text-[length:var(--fs-sm)] font-medium">
                    {entry.label}
                  </span>
                  <span className="ui-money text-[length:var(--fs-sm)]">
                    {formatCurrency(entry.total)}
                  </span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[length:var(--fs-2xs)] tabular-nums text-muted-foreground">
                    {entry.count}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card className="ui-card-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[length:var(--fs-lg)]">
              <BookOpen className="size-4 text-muted-foreground" aria-hidden />
              Ledger
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <DataState status="loading" className="min-h-[20vh]" />
            ) : summary.ledger.length === 0 ? (
              <EmptyState
                icon={Banknote}
                title="No invoices for this day"
                description="Invoices raised on the selected day will appear here for reconciliation."
                action={{ label: "View invoices", href: "/invoices" }}
              />
            ) : (
              <ul className="divide-y divide-border/50">
                {summary.ledger.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-[length:var(--fs-sm)] font-medium">
                        {row.patientName}
                      </span>
                      <span className="text-[length:var(--fs-2xs)] text-muted-foreground">
                        {row.invoiceNumber ? `${row.invoiceNumber} · ` : ""}
                        {row.at ? formatTime(row.at, "h:mm a") : ""}
                        {row.methodLabel ? ` · ${row.methodLabel}` : ""}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="ui-money text-[length:var(--fs-sm)] tabular-nums">
                        {formatCurrency(row.amount)}
                      </span>
                      <StatusBadge status={row.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="ui-card-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[length:var(--fs-lg)]">
              <CalendarCheck className="size-4 text-muted-foreground" aria-hidden />
              Close the day
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="ui-helper-text">
              Locking the day&apos;s collections writes a settled-ledger entry.
              This action is coming soon — reconcile against the totals above in
              the meantime.
            </p>
            <Button disabled className="shrink-0">
              Close day
            </Button>
          </CardContent>
        </Card>
      </AppPageScaffold>
    </FeatureGate>
  );
}
