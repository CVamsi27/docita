"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import { useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@workspace/ui/components/form/button";
import { Alert, AlertDescription } from "@workspace/ui/components/feedback/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/navigation/tabs";
import { AlertCircle, Image as ImageIcon, Pencil, Upload } from "lucide-react";
import { SignaturePad, SignaturePreview } from "@/components/inputs/signature-canvas";
import {
  dataUrlToFile,
  validateSignatureImageFile,
} from "@/lib/utils/signature-upload";

interface SignatureUploadWorkflowProps {
  uploading: boolean;
  error?: string | null;
  onErrorChange?: (value: string | null) => void;
  onDrawUpload: (file: File) => Promise<void> | void;
  onFileUpload: (file: File) => Promise<void> | void;
  autoUploadOnDraw?: boolean;
  drawTabLabel?: string;
  uploadTabLabel?: string;
  drawAlertText?: string;
  uploadAlertText?: string;
  selectImageButtonLabel?: string;
  changeImageButtonLabel?: string;
  uploadButtonLabel?: string;
  uploadingButtonLabel?: string;
}

export function SignatureUploadWorkflow({
  uploading,
  error = null,
  onErrorChange,
  onDrawUpload,
  onFileUpload,
  autoUploadOnDraw = false,
  drawTabLabel = "Draw Signature",
  uploadTabLabel = "Upload Image",
  drawAlertText = "Draw your signature using your mouse or touch screen",
  uploadAlertText = "Upload a clear image of your signature (PNG, JPG, or WebP). Maximum file size: 5MB.",
  selectImageButtonLabel = "Select Image",
  changeImageButtonLabel = "Change Image",
  uploadButtonLabel = "Upload Signature",
  uploadingButtonLabel = "Uploading…",
}: SignatureUploadWorkflowProps) {
  const [uploadMethod, setUploadMethod] = useState<"draw" | "upload">("draw");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearError = () => {
    if (onErrorChange) {
      onErrorChange(null);
    }
  };

  const handleDrawSave = async (dataUrl: string) => {
    clearError();
    setSignatureDataUrl(dataUrl);

    if (autoUploadOnDraw) {
      const drawFile = dataUrlToFile(dataUrl, "signature.png");
      await onDrawUpload(drawFile);
    }
  };

  const handleUploadDrawnSignature = async () => {
    if (!signatureDataUrl) return;
    clearError();
    const drawFile = dataUrlToFile(signatureDataUrl, "signature.png");
    await onDrawUpload(drawFile);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateSignatureImageFile(file);
    if (validationError) {
      if (onErrorChange) {
        onErrorChange(validationError);
      }
      return;
    }

    clearError();
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSelectedFile = async () => {
    if (!selectedFile) return;
    clearError();
    await onFileUpload(selectedFile);
  };

  return (
    <div className="space-y-4">
      <Tabs
        value={uploadMethod}
        onValueChange={(value) => setUploadMethod(value as "draw" | "upload")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="draw">
            <Pencil className="mr-2 h-4 w-4" />
            {drawTabLabel}
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="mr-2 h-4 w-4" />
            {uploadTabLabel}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="draw" className="space-y-4 pt-2">
          <Alert>
            <Pencil className="h-4 w-4" />
            <AlertDescription>{drawAlertText}</AlertDescription>
          </Alert>

          {!signatureDataUrl ? (
            <SignaturePad onSave={(dataUrl) => void handleDrawSave(dataUrl)} />
          ) : (
            <div className="space-y-4">
              <SignaturePreview
                dataUrl={signatureDataUrl}
                onEdit={() => setSignatureDataUrl(null)}
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
                  onClick={() => void handleUploadDrawnSignature()}
                  disabled={uploading}
                  className="w-full"
                >
                  {uploading ? (
                    <>
                      <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
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
        </TabsContent>

        <TabsContent value="upload" className="space-y-4 pt-2">
          <Alert>
            <ImageIcon className="h-4 w-4" />
            <AlertDescription>{uploadAlertText}</AlertDescription>
          </Alert>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleFileSelect}
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
                onClick={() => void handleUploadSelectedFile()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
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
        </TabsContent>
      </Tabs>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
