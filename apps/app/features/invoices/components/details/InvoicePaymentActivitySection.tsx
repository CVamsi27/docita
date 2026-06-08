"use client";

import type { FC } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { StatusBadge } from "@workspace/ui/components/indicators/status-badge";
import { CreditCard } from "lucide-react";
import { useInvoicePaymentActivity } from "@workspace/data-access";
import type { InvoicePaymentActivityItem } from "@workspace/types";
import { formatPaymentChannelLabel } from "@workspace/types";

function formatProviderLabel(provider: string): string {
  return provider
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

interface InvoicePaymentActivitySectionProps {
  invoiceId: string;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString?: string | Date) => string;
}

export const InvoicePaymentActivitySection: FC<
  InvoicePaymentActivitySectionProps
> = ({ invoiceId, formatCurrency, formatDate }) => {
  const { data, isLoading, isError, error, refetch } =
    useInvoicePaymentActivity(invoiceId);

  const items = data?.items ?? [];

  const status: "loading" | "error" | "empty" | "success" = isLoading
    ? "loading"
    : isError
      ? "error"
      : items.length === 0
        ? "empty"
        : "success";

  return (
    <DataState
      status={status}
      loadingMessage="Loading payment activity…"
      errorMessage={error?.message}
      onRetry={() => void refetch()}
      emptyTitle="No payment activity yet"
      emptyDescription="Desk settlements and online payment sessions will appear here once recorded."
      emptyIcon={CreditCard}
    >
      {status === "success" ? (
        <>
          <div className="space-y-3 md:hidden">
            {items.map((row: InvoicePaymentActivityItem) => {
              const linkUrl = row.shortUrl || row.paymentLink;
              return (
                <div
                  key={row.id}
                  className="ui-card-surface space-y-2 p-4 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground">
                      {formatDate(row.createdAt)}
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(row.amountCents / 100)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{formatProviderLabel(row.provider)}</span>
                    <StatusBadge status={row.status} size="sm" />
                  </div>
                  {row.channel ? (
                    <p className="ui-helper-text">
                      Paid by {formatPaymentChannelLabel(row.channel)}
                    </p>
                  ) : null}
                  {row.reference ? (
                    <p className="break-all text-muted-foreground">
                      Ref: {row.reference}
                    </p>
                  ) : null}
                  {row.notes ? (
                    <p className="break-words text-muted-foreground">
                      {row.notes}
                    </p>
                  ) : null}
                  {linkUrl ? (
                    <a
                      href={linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline-offset-2 hover:underline transition-colors duration-150"
                    >
                      Open payment link
                    </a>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto overscroll-x-contain md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row: InvoicePaymentActivityItem) => {
                  const linkUrl = row.shortUrl || row.paymentLink;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="align-top">
                        {formatDate(row.createdAt)}
                      </TableCell>
                      <TableCell className="align-top text-right tabular-nums">
                        {formatCurrency(row.amountCents / 100)}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-col gap-0.5">
                          <span>{formatProviderLabel(row.provider)}</span>
                          {row.channel ? (
                            <span className="ui-helper-text">
                              {formatPaymentChannelLabel(row.channel)}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <StatusBadge status={row.status} size="sm" />
                      </TableCell>
                      <TableCell className="align-top break-all">
                        {row.reference ?? "—"}
                      </TableCell>
                      <TableCell className="align-top break-words">
                        {row.notes ?? "—"}
                      </TableCell>
                      <TableCell className="align-top">
                        {linkUrl ? (
                          <a
                            href={linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline-offset-2 hover:underline transition-colors duration-150"
                          >
                            Open
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      ) : null}
    </DataState>
  );
};
