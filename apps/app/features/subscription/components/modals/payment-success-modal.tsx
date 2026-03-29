"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { CheckCircle2, ExternalLink } from "lucide-react";
import confetti from "canvas-confetti";
import { useRouter } from "next/navigation";
import { DEFAULT_CURRENCY } from "@workspace/utils";

interface PaymentSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName?: string;
  amount?: number;
  transactionId?: string;
}

export function PaymentSuccessModal({
  open,
  onOpenChange,
  planName = "Pro Plan",
  amount,
  transactionId,
}: PaymentSuccessModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (open) {

      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval: NodeJS.Timeout = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          zIndex: 9999,
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          zIndex: 9999,
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-linear-to-br from-background via-background to-success/10 border-success/20">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/15 ring-8 ring-success/10">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold bg-linear-to-r from-success to-success/80 bg-clip-text text-transparent">
            Payment Successful!
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Your payment was processed successfully. You now have access to{" "}
            <span className="font-semibold text-foreground">{planName}</span>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/30 rounded-lg p-4 space-y-3 border border-border/50">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Amount Paid</span>
            <span className="font-semibold text-lg">
              {amount
                ? new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: DEFAULT_CURRENCY,
                    maximumFractionDigits: 0,
                  }).format(amount)
                : "Paid"}
            </span>
          </div>
          {transactionId && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Transaction ID</span>
              <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                {transactionId.slice(-8).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Date</span>
            <span>
              {new Date().toLocaleDateString("en-IN", { dateStyle: "medium" })}
            </span>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col mt-4">
          <Button
            className="w-full bg-success text-success-foreground hover:bg-success/90 shadow-lg shadow-success/20"
            onClick={() => {
              onOpenChange(false);
              router.push("/dashboard");
            }}
          >
            Continue to Dashboard
          </Button>

          <div className="grid grid-cols-1 gap-3 w-full">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.push("/settings?tab=subscription")}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Manage Subscription
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
