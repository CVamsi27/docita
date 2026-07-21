"use client";

import { AlertTriangle, CreditCard, RotateCw } from "lucide-react";
import {
  Button,
  Card,
  CardContent
} from "@workspace/ui/components";
import { DEFAULT_CURRENCY, formatCurrency } from "@workspace/utils";
import type { BillingHistoryItem } from "@workspace/data-access";
import { formatDate } from "@/lib/formatters";

interface PaymentRecoveryCardProps {
  /** Set when the parent already knows billing is in trouble (PAST_DUE/GRACE/pending renewal). */
  show?: boolean;
  recoverablePayment: BillingHistoryItem | null;
  resolvePayment: () => Promise<void>;
  isResolving?: boolean;
}
export function PaymentRecoveryCard({
  show = true,
  recoverablePayment,
  resolvePayment,
  isResolving = false,
}: PaymentRecoveryCardProps) {
  if (!show || !recoverablePayment) return null;
  const amountText = formatCurrency(recoverablePayment.amountCents / 100, {
    currency: recoverablePayment.currency || DEFAULT_CURRENCY,
  });
  const createdAt = formatDate(new Date(recoverablePayment.createdAt));
  const statusLower = (recoverablePayment.status ?? "").toLowerCase();
  const isFailed = statusLower === "failed" || statusLower === "declined";
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold text-destructive">
            {isFailed ? "Last payment failed" : "Payment pending"}
          </p>
          <p className="text-sm text-muted-foreground">
            {recoverablePayment.description ?? "Subscription charge"} ·{" "}
            <span className="font-medium text-foreground">{amountText}</span> ·{" "}
            {createdAt}
          </p>
          <p className="text-xs text-muted-foreground">
            Complete payment to restore access. Checkout opens here when
            available, or a secure payment link in a new tab.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            size="sm"
            variant="default"
            onClick={() => void resolvePayment()}
            disabled={isResolving}
            className="gap-2"
          >
            {isResolving ? (
              <>
                <RotateCw className="h-4 w-4 animate-spin" aria-hidden />
                Opening…
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" aria-hidden />
                Pay now
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
