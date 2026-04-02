"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Clock, QrCode, Smartphone, X } from "lucide-react";
import {
  type SignatureUploadToken,
  type ActiveToken,
} from "@/hooks/api/use-signature-upload";
import { format } from "date-fns";
import { QrCodeCard } from "@/features/_shared/components/signature/qr-code-card";
import { CopyableLinkField } from "@/features/_shared/components/signature/copyable-link-field";
import { toAbsoluteAppUrl } from "@/lib/url";

interface QrSignatureUploadProps {
  onGenerate: () => Promise<SignatureUploadToken>;
  isGenerating: boolean;
  activeTokens: ActiveToken[];
  onRevoke: (tokenId: string) => Promise<void>;
  isRevoking: boolean;
  title?: string;
  description?: string;
  alertText: string;
  buttonLabel: string;
  dialogTitle: string;
  dialogDescription: string;
}

export function QrSignatureUpload({
  onGenerate,
  isGenerating,
  activeTokens,
  onRevoke,
  isRevoking,
  title,
  description,
  alertText,
  buttonLabel,
  dialogTitle,
  dialogDescription,
}: QrSignatureUploadProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentToken, setCurrentToken] = useState<SignatureUploadToken | null>(null);

  const handleGenerateToken = async () => {
    const token = await onGenerate();
    setCurrentToken(token);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentToken(null);
  };

  const fullUploadUrl = currentToken
    ? toAbsoluteAppUrl(currentToken.uploadUrl)
    : "";

  return (
    <div className="space-y-4">
      {(title || description) && (
        <div>
          {title && <h3 className="text-lg font-medium">{title}</h3>}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      <Alert>
        <Smartphone className="h-4 w-4" />
        <AlertDescription>{alertText}</AlertDescription>
      </Alert>

      <div className="flex gap-3">
        <Button
          onClick={handleGenerateToken}
          disabled={isGenerating}
          variant="default"
        >
          <QrCode className="mr-2 h-4 w-4" />
          {buttonLabel}
        </Button>
      </div>

      {activeTokens.length > 0 && (
        <div className="rounded-lg border p-4">
          <h4 className="mb-3 text-sm font-medium">Active Upload Links</h4>
          <div className="space-y-2">
            {activeTokens.map((token: ActiveToken) => (
              <div
                key={token.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      Expires {format(new Date(token.expiresAt), "PPp")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created {format(new Date(token.createdAt), "PPp")}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRevoke(token.id)}
                  disabled={isRevoking}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md overflow-hidden">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center space-y-4 py-4">
            {fullUploadUrl ? <QrCodeCard value={fullUploadUrl} size={200} /> : null}

            {fullUploadUrl ? (
              <CopyableLinkField
                value={fullUploadUrl}
                helperText="Or copy the link above and open it on your phone"
              />
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                Or copy the link above and open it on your phone
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
