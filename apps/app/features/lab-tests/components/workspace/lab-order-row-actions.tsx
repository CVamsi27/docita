"use client";

import { FC, useRef, useState } from "react";
import { FlaskConical, Send, Upload, Wallet } from "lucide-react";
import type { LabQueueItem } from "@workspace/data-access";
import type { VerifyLabOrderPaymentRequest } from "@workspace/types";
import { Button } from "@workspace/ui/components/form/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";

const PAYMENT_METHODS: {
  value: VerifyLabOrderPaymentRequest["paymentMethod"];
  label: string;
}[] = [
  { value: "CASH", label: "Cash" },
  { value: "CARD_POS", label: "Card (POS)" },
  { value: "UPI_QR", label: "UPI / QR" },
  { value: "PINELABS", label: "Pine Labs" },
  { value: "OTHER_TERMINAL", label: "Other terminal" },
  { value: "OTHER_ONLINE", label: "Other online" },
];

const TERMINAL_STATUSES = new Set(["COMPLETED", "CANCELLED"]);

interface LabOrderRowActionsProps {
  order: LabQueueItem;
  canVerifyPayment: boolean;
  disabled?: boolean;
  onRecordSample: (order: LabQueueItem) => void;
  onUploadResult: (order: LabQueueItem, file: File) => void;
  onVerifyPayment: (
    order: LabQueueItem,
    payload: VerifyLabOrderPaymentRequest,
  ) => void;
  onRelease: (order: LabQueueItem) => void;
}

export const LabOrderRowActions: FC<LabOrderRowActionsProps> = ({
  order,
  canVerifyPayment,
  disabled,
  onRecordSample,
  onUploadResult,
  onVerifyPayment,
  onRelease,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [method, setMethod] = useState<string>("CASH");
  const [reference, setReference] = useState("");

  const isTerminal = TERMINAL_STATUSES.has(order.status);
  const canRelease = Boolean(order.resultUrl) && Boolean(order.paidAt);

  const submitPayment = () => {
    const entry = PAYMENT_METHODS.find((pm) => pm.value === method);
    if (!entry) return;
    onVerifyPayment(order, {
      paymentMethod: entry.value,
      ...(reference.trim() && { reference: reference.trim() }),
    });
    setPaymentOpen(false);
    setReference("");
  };

  if (isTerminal) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {!order.collectedAt ? (
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          disabled={disabled}
          onClick={() => onRecordSample(order)}
        >
          <FlaskConical className="h-3.5 w-3.5" />
          Receive sample
        </Button>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUploadResult(order, file);
          event.target.value = "";
        }}
      />
      <Button
        size="sm"
        variant="outline"
        className="gap-1"
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-3.5 w-3.5" />
        {order.resultUrl ? "Replace result" : "Upload result"}
      </Button>

      {canVerifyPayment && !order.paidAt ? (
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          disabled={disabled}
          onClick={() => setPaymentOpen(true)}
        >
          <Wallet className="h-3.5 w-3.5" />
          Verify payment
        </Button>
      ) : null}

      <Button
        size="sm"
        className="gap-1"
        disabled={disabled || !canRelease}
        onClick={() => onRelease(order)}
      >
        <Send className="h-3.5 w-3.5" />
        Release
      </Button>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify payment</DialogTitle>
            <DialogDescription>
              Record the payment collected at the hospital for this lab order.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lab-payment-method">Payment method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger id="lab-payment-method">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lab-payment-reference">Reference (optional)</Label>
              <Input
                id="lab-payment-reference"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Receipt or transaction reference"
                maxLength={120}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentOpen(false)}
              disabled={disabled}
            >
              Cancel
            </Button>
            <Button onClick={submitPayment} disabled={disabled}>
              Confirm payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
