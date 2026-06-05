"use client";

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
import { Banknote, BookOpen, CalendarCheck, Wallet } from "lucide-react";
import { ComingSoonBadge } from "@/components/feedback/coming-soon-badge";
import { formatTime } from "@/lib/formatters";
import type { DaybookSummary } from "@/features/daybook/lib/daybook-aggregate";

interface DaybookSectionProps {
  summary: DaybookSummary;
  formatCurrency: (amount: number) => string;
  isLoading: boolean;
}

export function DaybookSummaryCardsSection({
  summary,
  formatCurrency,
}: DaybookSectionProps) {
  return (
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
  );
}

export function DaybookByMethodSection({
  summary,
  formatCurrency,
}: DaybookSectionProps) {
  if (summary.byMethod.length === 0) return null;

  return (
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
  );
}

export function DaybookLedgerSection({
  summary,
  formatCurrency,
  isLoading,
}: DaybookSectionProps) {
  return (
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
                    {row.invoiceNumber ? `${row.invoiceNumber} \u00B7 ` : ""}
                    {row.at ? formatTime(row.at, "h:mm a") : ""}
                    {row.methodLabel ? ` \u00B7 ${row.methodLabel}` : ""}
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
  );
}

export function DaybookCloseDaySection() {
  return (
    <Card className="ui-card-surface">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[length:var(--fs-lg)]">
          <CalendarCheck className="size-4 text-muted-foreground" aria-hidden />
          Close the day
          <ComingSoonBadge className="ml-1" />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="ui-helper-text">
          Locking the day&apos;s collections writes a settled-ledger entry. For
          now, reconcile against the totals above.
        </p>
        <Button disabled className="shrink-0">
          Close day
        </Button>
      </CardContent>
    </Card>
  );
}
