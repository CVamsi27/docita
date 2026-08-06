import { useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/navigation/tabs";
import { Pencil, Upload } from "lucide-react";
import { DrawSignatureTab, UploadSignatureTab, SignatureErrorAlert } from "./signature-upload-workflow-sections";
import { dataUrlToFile, validateSignatureImageFile } from "../lib/signature-upload";

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
      if (typeof reader.result === "string") {
        setPreviewUrl(reader.result);
      }
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
        onValueChange={(value) =>
          setUploadMethod(value === "draw" ? "draw" : "upload")
        }
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
          <DrawSignatureTab
            signatureDataUrl={signatureDataUrl}
            onClearSignature={() => setSignatureDataUrl(null)}
            onDrawSave={handleDrawSave}
            onUploadDrawnSignature={handleUploadDrawnSignature}
            uploading={uploading}
            autoUploadOnDraw={autoUploadOnDraw}
            drawAlertText={drawAlertText}
            uploadButtonLabel={uploadButtonLabel}
            uploadingButtonLabel={uploadingButtonLabel}
          />
        </TabsContent>

        <TabsContent value="upload" className="space-y-4 pt-2">
          <UploadSignatureTab
            previewUrl={previewUrl}
            fileInputRef={fileInputRef}
            onFileSelect={handleFileSelect}
            onUploadSelectedFile={handleUploadSelectedFile}
            uploading={uploading}
            selectedFile={selectedFile}
            uploadAlertText={uploadAlertText}
            selectImageButtonLabel={selectImageButtonLabel}
            changeImageButtonLabel={changeImageButtonLabel}
            uploadButtonLabel={uploadButtonLabel}
            uploadingButtonLabel={uploadingButtonLabel}
          />
        </TabsContent>
      </Tabs>

      <SignatureErrorAlert error={error} />
    </div>
  );
}
