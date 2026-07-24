"use client";

import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label } from "@workspace/ui/components";
import type { EnterpriseContractsPageState } from "./use-enterprise-contracts-page";

type EnterpriseContractsCustomBillDialogProps = Pick<
  EnterpriseContractsPageState,
  | "customBillOpen"
  | "setCustomBillOpen"
  | "customBillContract"
  | "customBillLabel"
  | "setCustomBillLabel"
  | "customBillAmountINR"
  | "setCustomBillAmountINR"
  | "submitCustomBill"
  | "busy"
>;

export function EnterpriseContractsCustomBillDialog({
  customBillOpen,
  setCustomBillOpen,
  customBillContract,
  customBillLabel,
  setCustomBillLabel,
  customBillAmountINR,
  setCustomBillAmountINR,
  submitCustomBill,
  busy,
}: EnterpriseContractsCustomBillDialogProps) {
  return (
    <Dialog open={customBillOpen} onOpenChange={setCustomBillOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Custom enterprise bill</DialogTitle>
          <DialogDescription>
            {customBillContract?.contractNumber ?? "Selected contract"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="enterprise-custom-bill-label">Bill label</Label>
            <Input
              id="enterprise-custom-bill-label"
              value={customBillLabel}
              placeholder="Enter bill label"
              onChange={(event) => setCustomBillLabel(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="enterprise-custom-bill-amount">Amount</Label>
            <Input
              id="enterprise-custom-bill-amount"
              value={customBillAmountINR}
              placeholder="Enter amount"
              inputMode="decimal"
              onChange={(event) => setCustomBillAmountINR(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setCustomBillOpen(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button onClick={() => void submitCustomBill()} disabled={busy}>
            Raise bill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
