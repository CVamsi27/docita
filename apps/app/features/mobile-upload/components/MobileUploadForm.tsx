"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Button } from "@workspace/ui/components/form/button";
import { Upload } from "lucide-react";
import { MobileFileUploader } from "@/features/mobile-upload/components/MobileFileUploader";

export interface MobileUploadFormProps {
  file: File | null;
  previewUrl: string | null;
  errorMessage: string | null;
  isUploading: boolean;
  onFileSelect: (file: File | null, previewUrl: string | null) => void;
  onUpload: () => void;
}

interface MobileUploadSubmitButtonProps {
  canSubmit: boolean;
  isUploading: boolean;
  onUpload: () => void;
}

/** Submit button for the upload form: shows the send icon when idle and a spinner while the mutation is pending. */
function MobileUploadSubmitButton({
  canSubmit,
  isUploading,
  onUpload,
}: MobileUploadSubmitButtonProps) {
  return (
    <Button
      className={`w-full h-14 text-base font-medium rounded-lg shadow-lg transition-colors duration-200 ${
        canSubmit
          ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/25"
          : ""
      }`}
      onClick={onUpload}
      disabled={!canSubmit}
      size="lg"
    >
      {isUploading ? (
        <span className="flex items-center gap-2">
          <DocitaLoadingIndicator
            variant="inline"
            decorative
            iconClassName="h-5 w-5"
          />
          Uploading…
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Send to Desktop
        </span>
      )}
    </Button>
  );
}

/** Scan-and-send form body for the mobile-upload page: file picker, inline error, and submit button. */
export function MobileUploadForm({
  file,
  previewUrl,
  errorMessage,
  isUploading,
  onFileSelect,
  onUpload,
}: MobileUploadFormProps) {
  return (
    <div className="max-w-sm mx-auto px-4 py-6 space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-xl font-semibold text-foreground">Scan Document</h1>
        <p className="text-sm text-muted-foreground">
          Take a photo or select an image to send
        </p>
      </div>

      <MobileFileUploader onFileSelect={onFileSelect} previewUrl={previewUrl} />

      {errorMessage && (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {errorMessage}
        </p>
      )}

      <MobileUploadSubmitButton
        canSubmit={Boolean(file) && !isUploading}
        isUploading={isUploading}
        onUpload={onUpload}
      />

      <p className="text-center text-xs text-muted-foreground px-4">
        The document will appear on your desktop instantly
      </p>
    </div>
  );
}
