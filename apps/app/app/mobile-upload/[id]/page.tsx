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

      if (error instanceof TypeError && error.message.includes("fetch")) {
        alert("Connection failed. Please check your internet and try again.");
      } else {
        alert("Upload failed. Please check your connection.");
      }
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return <MobileSuccessScreen />;
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-card dark:from-background dark:to-card">
      <MobileHeader />

      {}
      <div className="max-w-sm mx-auto px-4 py-6 space-y-6">
        {}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold text-foreground">
            Scan Document
          </h1>
          <p className="text-sm text-muted-foreground">
            Take a photo or select an image to send
          </p>
        </div>

        {}
        <MobileFileUploader
          onFileSelect={handleFileSelect}
          previewUrl={previewUrl}
        />

        {}
        {}

        {}
        <Button
          className={`w-full h-14 text-base font-medium rounded-xl shadow-lg transition-all ${
            file && !uploading
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/25"
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

        {}
        <p className="text-center text-xs text-muted-foreground px-4">
          The document will appear on your desktop instantly
        </p>
      </div>
    </div>
  );
}
