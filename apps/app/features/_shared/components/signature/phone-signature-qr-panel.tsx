"use client";

import { Button } from "@workspace/ui/components/button";
import { CheckCircle2, Loader2, QrCode, RefreshCw } from "lucide-react";
import { QrCodeCard } from "@/features/_shared/components/signature/qr-code-card";

interface PhoneSignatureQrPanelProps {
  loading: boolean;
  uploaded: boolean;
  polling: boolean;
  error: string | null;
  qrUrl: string | null;
  onRetry: () => void;
  onRefreshStatus: () => void | Promise<void>;
  onCopyLink: () => void | Promise<void>;
  missingContextMessage?: string;
  steps?: string[];
  waitingText?: string;
  successTitle?: string;
  successDescription?: string;
}

const DEFAULT_STEPS = [
  "Open your phone camera",
  "Scan the QR code below",
  "Draw or upload your signature on your phone",
  "This page updates automatically",
];

export function PhoneSignatureQrPanel({
  loading,
  uploaded,
  polling,
  error,
  qrUrl,
  onRetry,
  onRefreshStatus,
  onCopyLink,
  missingContextMessage,
  steps = DEFAULT_STEPS,
  waitingText = "Waiting for signature from your phone...",
  successTitle = "Signature received from your phone",
  successDescription = "Your signature has been saved successfully",
}: PhoneSignatureQrPanelProps) {
  if (missingContextMessage) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
        {missingContextMessage}
      </div>
    );
  }

  if (uploaded) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-primary">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <div>
          <p className="font-medium">{successTitle}</p>
          <p className="text-xs text-primary/70 mt-0.5">{successDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <QrCode className="h-3 w-3" />
        Sign via phone
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          How it works
        </p>
        <div className="space-y-2.5">
          {steps.map((step, index) => (
            <div key={step} className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/70 text-xs font-bold text-primary">
                {index + 1}
              </span>
              <p className="text-sm text-muted-foreground pt-0.5">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Generating QR code...
        </div>
      ) : null}

      {error ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Retry
          </Button>
        </div>
      ) : null}

      {qrUrl ? (
        <div className="flex flex-col items-center gap-3 py-2">
          <QrCodeCard value={qrUrl} />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {polling ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {waitingText}
              </>
            ) : (
              <span>Scan the QR code with your phone camera</span>
            )}
          </div>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto px-0 text-xs text-muted-foreground hover:text-foreground"
            onClick={onRefreshStatus}
          >
            Refresh status (optional)
          </Button>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto px-0 text-xs text-muted-foreground hover:text-foreground"
            onClick={onCopyLink}
          >
            Copy link instead
          </Button>
        </div>
      ) : null}
    </>
  );
}
