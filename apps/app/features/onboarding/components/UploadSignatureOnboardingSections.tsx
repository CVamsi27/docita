"use client";

// jscpd:ignore-start
import { Alert, AlertDescription, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { SignatureUploadWorkflow } from "@/components/signature/signature-upload-workflow";

export function SignatureUploadedCard({
// jscpd:ignore-end
  alreadyUploaded,
}: {
  alreadyUploaded: boolean;
}) {
  return (
    <Card className="w-full max-w-md rounded-[var(--radius-xl)] text-center">
      <CardHeader>
        <div className="relative mx-auto mb-2 w-fit">
          <div
            aria-hidden
            className="absolute inset-0 scale-110 rounded-full bg-success/20 blur-md"
          />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-success/25 bg-success/[0.1] text-success shadow-sm">
            <CheckCircle2 className="h-7 w-7" strokeWidth={1.5} />
          </div>
        </div>
        <CardTitle>Signature uploaded</CardTitle>
        <CardDescription>
          {alreadyUploaded
            ? "This signature link is already completed. You can close this page and return to your desktop."
            : "Your signature has been saved. You can close this page and return to your desktop to complete registration."}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export function SignatureLinkLoadingCard() {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <DocitaLoadingIndicator variant="inline" decorative />
        Checking signature link…
      </CardContent>
    </Card>
  );
}

export function SignatureLinkErrorCard({
  error,
}: {
  error: string | null;
}) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <CardTitle>Link not available</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive">
          <AlertDescription>
            {error ??
              "This signature link is no longer available. Please request a new one."}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

export function SignatureUploadFormCard({
  uploading,
  error,
  onErrorChange,
  onDrawUpload,
  onFileUpload,
}: {
  uploading: boolean;
  error: string | null;
  onErrorChange: (error: string | null) => void;
  onDrawUpload: (file: File) => void;
  onFileUpload: (file: File) => void;
}) {
  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Upload SLA Signature</CardTitle>
        <CardDescription>
          Draw or upload your signature to authorise the Docita Service Level
          Agreement.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SignatureUploadWorkflow
          uploading={uploading}
          error={error}
          onErrorChange={onErrorChange}
          onDrawUpload={onDrawUpload}
          onFileUpload={onFileUpload}
          autoUploadOnDraw
          drawTabLabel="Draw"
          uploadTabLabel="Upload Image"
          drawAlertText="Draw your SLA signature using your finger or stylus"
          uploadAlertText="Upload the SLA signature image (PNG, JPG, or WebP). Maximum file size: 5MB."
          selectImageButtonLabel="Select Image"
          changeImageButtonLabel="Change Image"
          uploadButtonLabel="Upload Signature"
          uploadingButtonLabel="Uploading…"
        />
      </CardContent>
    </Card>
  );
}
