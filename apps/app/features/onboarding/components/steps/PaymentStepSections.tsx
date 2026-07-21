"use client";

import { CreditCard, Info, ShieldCheck } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  Checkbox,
  Label
} from "@workspace/ui/components";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { formatAmountLocale } from "@workspace/utils";

export interface PaymentSecurityAlertsProps {
  currencyCode?: string;
}

export function PaymentSecurityAlerts({
  currencyCode,
}: PaymentSecurityAlertsProps) {
  return (
    <>
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Payments are processed securely through Razorpay. Your card
          details are never stored on our servers.
        </AlertDescription>
      </Alert>

      {currencyCode === "INR" && (
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription>
            GST invoices are issued using the GSTIN saved in Clinic Details
            before any paid Indian plan is charged.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}

export interface PaymentAutoPayFieldProps {
  autoPay: boolean;
  onAutoPayChange: (checked: boolean) => void;
}

export function PaymentAutoPayField({
  autoPay,
  onAutoPayChange,
}: PaymentAutoPayFieldProps) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id="autopay"
        checked={autoPay}
        onCheckedChange={(c) => onAutoPayChange(!!c)}
      />
      <Label htmlFor="autopay" className="text-sm font-normal">
        Enable Auto-pay for uninterrupted service
      </Label>
    </div>
  );
}

export interface PaymentTotalSummaryProps {
  total: number;
  currencySymbol: string;
  isFree: boolean;
}

export function PaymentTotalSummary({
  total,
  currencySymbol,
  isFree,
}: PaymentTotalSummaryProps) {
  return (
    <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-between">
      <span className="font-semibold">Total Due Today:</span>
      <span className="ui-section-title text-[var(--fs-2xl)] leading-none tabular-nums">
        {isFree
          ? "Free"
          : `${currencySymbol}${formatAmountLocale(total, "en-IN", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}`}
      </span>
    </div>
  );
}

export interface PaymentActionGroupProps {
  isProcessing: boolean;
  isFree: boolean;
  onPay: () => void;
  onBack: () => void;
}

export function PaymentActionGroup({
  isProcessing,
  isFree,
  onPay,
  onBack,
}: PaymentActionGroupProps) {
  return (
    <div className="flex flex-col gap-2 pt-4">
      <Button onClick={onPay} disabled={isProcessing} className="w-full">
        {isProcessing ? (
          <>
            <DocitaLoadingIndicator
              variant="inline"
              decorative
              className="mr-2"
            />
            Processing…
          </>
        ) : isFree ? (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Continue (No Payment Required)
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Complete Payment & Continue
          </>
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={onBack}
        className="w-full"
        disabled={isProcessing}
      >
        Back
      </Button>
    </div>
  );
}

export function PaymentSecurityFooter() {
  return (
    <div className="flex justify-center gap-2 text-xs text-muted-foreground">
      <ShieldCheck className="h-3 w-3" />
      <span>Secure payment via Razorpay · 256-bit SSL Encrypted</span>
    </div>
  );
}
