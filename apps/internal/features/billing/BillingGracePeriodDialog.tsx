"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
// jscpd:ignore-start
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
// jscpd:ignore-end

interface BillingGracePeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionName: string;
  extendDays: number;
  onExtendDaysChange: (days: number) => void;
  sending: boolean;
  onConfirm: () => void;
}

export function BillingGracePeriodDialog({
  open,
  onOpenChange,
  subscriptionName,
  extendDays,
  onExtendDaysChange,
  sending,
  onConfirm,
}: BillingGracePeriodDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Extend Grace Period</DialogTitle>
          <DialogDescription>
            Extend the grace period for
            <span className="ml-1">{subscriptionName}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="days" className="text-right">
              Days
            </Label>
            <Input
              id="days"
              type="number"
              min={1}
              max={30}
              value={extendDays}
              onChange={(e) =>
                onExtendDaysChange(parseInt(e.target.value) || 3)
              }
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={sending}>
            {sending && (
              <DocitaLoadingIndicator
                variant="inline"
                decorative
                className="mr-2"
              />
            )}
            Extend
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
