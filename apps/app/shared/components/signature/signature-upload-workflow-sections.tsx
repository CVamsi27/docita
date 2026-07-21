"use client";

import { type RefObject } from "react";
import Image from "next/image";
import {
  Alert,
  AlertDescription,
  Button
} from "@workspace/ui/components";
import { AlertCircle, Image as ImageIcon, Pencil, Upload } from "lucide-react";
import {
  SignaturePad,
  SignaturePreview,
} from "@/components/inputs/signature-canvas";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

interface DrawSignatureTabProps {
  signatureDataUrl: string | null;
  onClearSignature: () => void;
  onDrawSave: (dataUrl: string) => Promise<void>;
  onUploadDrawnSignature: () => Promise<void>;
  uploading: boolean;
  autoUploadOnDraw: boolean;
  drawAlertText: string;
  uploadButtonLabel: string;
  uploadingButtonLabel: string;
}
export function DrawSignatureTab({
  signatureDataUrl,
  onClearSignature,
  onDrawSave,
  onUploadDrawnSignature,
  uploading,
  autoUploadOnDraw,
  drawAlertText,
  uploadButtonLabel,
  uploadingButtonLabel,
}: DrawSignatureTabProps) {
  return (
    <div className="space-y-4">
      <Alert>
        <Pencil className="h-4 w-4" />
        <AlertDescription>{drawAlertText}</AlertDescription>
      </Alert>
      {!signatureDataUrl ? (
        <SignaturePad onSave={(dataUrl) => void onDrawSave(dataUrl)} />
      ) : (
        <div className="space-y-4">
          <SignaturePreview
            dataUrl={signatureDataUrl}
            onEdit={onClearSignature}
          />
          {autoUploadOnDraw ? (
            uploading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DocitaLoadingIndicator variant="inline" decorative />
                {uploadingButtonLabel}
              </div>
            ) : null
          ) : (
            <Button
              onClick={() => void onUploadDrawnSignature()}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <DocitaLoadingIndicator
                    variant="inline"
                    decorative
                    className="mr-2"
                  />
                  {uploadingButtonLabel}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {uploadButtonLabel}
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
interface UploadSignatureTabProps {
  previewUrl: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadSelectedFile: () => Promise<void>;
  uploading: boolean;
  selectedFile: File | null;
  uploadAlertText: string;
  selectImageButtonLabel: string;
  changeImageButtonLabel: string;
  uploadButtonLabel: string;
  uploadingButtonLabel: string;
}

export function UploadSignatureTab({
  previewUrl,
  fileInputRef,
  onFileSelect,
  onUploadSelectedFile,
  uploading,
  selectedFile,
  uploadAlertText,
  selectImageButtonLabel,
  changeImageButtonLabel,
  uploadButtonLabel,
  uploadingButtonLabel,
}: UploadSignatureTabProps) {
  return (
    <div className="space-y-4">
      <Alert>
        <ImageIcon className="h-4 w-4" />
        <AlertDescription>{uploadAlertText}</AlertDescription>
      </Alert>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={onFileSelect}
        className="hidden"
      />

      <Button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        variant="outline"
        className="w-full"
        disabled={uploading}
      >
        <Upload className="mr-2 h-4 w-4" />
        {selectedFile ? changeImageButtonLabel : selectImageButtonLabel}
      </Button>

      {previewUrl && (
        <div className="space-y-3">
          <div className="rounded-lg border bg-white p-4">
            <Image
              src={previewUrl}
              alt="Signature preview"
              width={400}
              height={192}
              className="mx-auto max-h-48 object-contain"
              unoptimized
            />
          </div>

          <Button
            className="w-full"
            onClick={() => void onUploadSelectedFile()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <DocitaLoadingIndicator
                  variant="inline"
                  decorative
                  className="mr-2"
                />
                {uploadingButtonLabel}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {uploadButtonLabel}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

interface SignatureErrorAlertProps {
  error?: string | null;
}

export function SignatureErrorAlert({ error }: SignatureErrorAlertProps) {
  if (!error) return null;

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}
