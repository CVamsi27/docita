"use client";

import { useMemo } from "react";
import { AlertTriangle, CreditCard, RotateCw } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { Card, CardContent } from "@workspace/ui/components/indicators/card";
import { toast } from "sonner";
import { DEFAULT_CURRENCY, formatCurrency } from "@workspace/utils";
import { useBillingHistory } from "@workspace/data-access";
import { useResumeSubscriptionPayment } from "@workspace/data-access";
import { formatDate } from "@/lib/formatters";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

type RecoverableStatus =
  | "failed"
  | "declined"
  | "pending"
  | "processing"
  | "created"
  | "requires_action"
  | "attempted"
  | "due";

function isRecoverableStatus(value: string): value is RecoverableStatus {
  switch (value) {
    case "failed":
    case "declined":
    case "pending":
    case "processing":
    case "created":
    case "requires_action":
    case "attempted":
    case "due":
      return true;
    default:
      return false;
  }
}

interface PaymentRecoveryCardProps {
  /** Set when the parent already knows billing is in trouble (PAST_DUE/GRACE/TRIAL_GRACE). */
  show?: boolean;
}

export function PaymentRecoveryCard({ show = true }: PaymentRecoveryCardProps) {
  const { data: invoices } = useBillingHistory(show);
  const resume = useResumeSubscriptionPayment();

  const failedPayment = useMemo(() => {
    if (!invoices?.length) return null;
    return (
      invoices.find((p) => {
        const status = (p.status ?? "").toLowerCase();
        return isRecoverableStatus(status);
      }) ?? null
    );
  }, [invoices]);

  if (!show || !failedPayment) {
    return null;
  }

  const amountText = formatCurrency(failedPayment.amountCents / 100, {
    currency: failedPayment.currency || DEFAULT_CURRENCY,
  });
  const createdAt = formatDate(new Date(failedPayment.createdAt));
  const statusLower = (failedPayment.status ?? "").toLowerCase();
  const isFailed = statusLower === "failed" || statusLower === "declined";
  const failedPaymentId = failedPayment.id;

  async function handleRetry() {
    try {
      const result = await resume.mutateAsync(failedPaymentId);
      if (result.payUrl) {
        window.open(result.payUrl, "_blank", "noopener,noreferrer");
      } else {
        toast.success("Payment retry started — check your inbox for the link.");
      }
    } catch (err) {
      showUserFacingErrorToast(
        err,
        "Could not resume payment. Please try again or contact support.",
        "payment",
      );
    }
  }

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
            {failedPayment.description ?? "Subscription charge"} ·{" "}
            <span className="font-medium text-foreground">{amountText}</span> ·{" "}
            {createdAt}
          </p>
          <p className="text-xs text-muted-foreground">
            Resume the charge to keep your subscription active. Razorpay will
            re-attempt against your saved card.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            size="sm"
            variant="default"
            onClick={handleRetry}
            disabled={resume.isPending}
            className="gap-2"
          >
            {resume.isPending ? (
              <>
                <RotateCw className="h-4 w-4 animate-spin" aria-hidden />
                Retrying…
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" aria-hidden />
                Retry payment
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
