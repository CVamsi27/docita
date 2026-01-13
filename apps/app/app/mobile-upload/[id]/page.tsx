"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Loader2, Upload } from "lucide-react";
import { MobileHeader } from "@/features/mobile-upload/components/MobileHeader";
import { MobileSuccessScreen } from "@/features/mobile-upload/components/MobileSuccessScreen";
import { MobileFileUploader } from "@/features/mobile-upload/components/MobileFileUploader";

const API_URL =
  process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001/api";

export default function MobileUploadPage() {
  const params = useParams();
  const sessionId = params["id"] as string;
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = useCallback(
    (selectedFile: File | null, url: string | null) => {
      setFile(selectedFile);
      setPreviewUrl(url);
    },
    [],
  );

  const handleUpload = async () => {
    if (!file || !sessionId) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/uploads/session/${sessionId}`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        try {
          const data = await response.json();
          if (data.status === "uploaded" && data.fileUrl) {
            setSuccess(true);
          } else {
            console.error("Unexpected response:", data);
            alert(
              "Upload completed but session update may have failed. Please try again.",
            );
          }
        } catch {
          setSuccess(true);
        }
      } else {
        let errorMessage = "Upload failed. Please try again.";
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = Array.isArray(errorData.message)
              ? errorData.message.join(", ")
              : errorData.message;
          }
        } catch {
          if (response.status === 413) {
            errorMessage = "File is too large. Please use a smaller image.";
          } else if (response.status === 404) {
            errorMessage = "Session expired. Please scan the QR code again.";
          } else if (response.status === 400) {
            errorMessage = "Invalid file type. Please upload an image.";
          }
        }
        alert(errorMessage);
      }
    } catch (error) {
      console.error("Upload error:", error);
      if (error instanceof TypeError && error.message.includes("fetch")) {
        alert("Connection failed. Please check your internet and try again.");
      } else {
        alert("Upload failed. Please check your connection.");
      }
    } finally {
      setUploading(false);
    }
  };

  // Success State
  if (success) {
    return <MobileSuccessScreen />;
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white dark:from-slate-950 dark:to-background">
      <MobileHeader />

      {/* Main Content */}
      <div className="max-w-sm mx-auto px-4 py-6 space-y-6">
        {/* Instructions */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold text-foreground">
            Scan Document
          </h1>
          <p className="text-sm text-muted-foreground">
            Take a photo or select an image to send
          </p>
        </div>

        {/* Upload Area */}
        <MobileFileUploader
          onFileSelect={handleFileSelect}
          previewUrl={previewUrl}
        />

        {/* File Info */}
        {/* Note: File info is currently not part of MobileFileUploader but could be moving forward if desired. 
            For now, keeping it here or should I have moved it into MobileFileUploader?
            The original design had it separate. I'll keep it or move it? 
            It relates to 'file' state. MobileFileUploader handles preview, but maybe not the file info card below it. 
            Actually, MobileFileUploader only does the dropzone. 
            I'll keep the file info block here or move it to a small component `FileInfo`. 
            Given the instruction "Extract components", I'll keep it simple and just leave it here or inline it if it's small. 
            It's small.
        */}

        {/* Upload Button */}
        <Button
          className={`w-full h-14 text-base font-medium rounded-xl shadow-lg transition-all ${
            file && !uploading
              ? "bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-blue-500/25"
              : ""
          }`}
          onClick={handleUpload}
          disabled={!file || uploading}
          size="lg"
        >
          {uploading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Uploading...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Send to Desktop
            </span>
          )}
        </Button>

        {/* Help Text */}
        <p className="text-center text-xs text-muted-foreground px-4">
          The document will appear on your desktop instantly
        </p>
      </div>
    </div>
  );
}
