import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import { QRCodeSVG } from "qrcode.react";

interface OCRMobileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrUrl: string | null;
}

export const OCRMobileDialog = ({
  open,
  onOpenChange,
  qrUrl,
}: OCRMobileDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan with Phone</DialogTitle>
          <DialogDescription>
            Scan this QR code with your mobile camera to upload a document
            directly.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6 space-y-4">
          <div className="rounded-lg border bg-background p-4 shadow-sm">
            {qrUrl && <QRCodeSVG value={qrUrl} size={200} />}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Waiting for upload…
            <DocitaLoadingIndicator variant="inline" decorative className="inline" iconClassName="h-3 w-3" />
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
