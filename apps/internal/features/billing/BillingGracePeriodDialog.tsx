"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { useTranslations } from "next-intl";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label } from "@workspace/ui/components";

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
  const t = useTranslations("BillingDashboard.graceDialog");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description")}
            <span className="ml-1">{subscriptionName}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="days" className="text-right">
              {t("daysLabel")}
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
            {t("cancelButton")}
          </Button>
          <Button onClick={onConfirm} disabled={sending}>
            {sending && (
              <DocitaLoadingIndicator
                variant="inline"
                decorative
                className="mr-2"
              />
            )}
            {t("confirmButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
