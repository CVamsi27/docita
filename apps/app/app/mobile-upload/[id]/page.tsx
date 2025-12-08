"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Upload,
  CheckCircle2,
  Camera,
  Loader2,
  X,
  ImageIcon,
  FileText,
  RotateCcw,
  Smartphone,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export default function MobileUploadPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
      }
    },
    [],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      setPreviewUrl(URL.createObjectURL(droppedFile));
    }
  }, []);

  const clearFile = useCallback(() => {
    setFile(null);
    setPreviewUrl(null);
  }, []);

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
        // Verify the response actually contains the updated session
        try {
          const data = await response.json();
          if (data.status === "uploaded" && data.fileUrl) {
            setSuccess(true);
          } else {
            // Response ok but session not updated properly
            console.error("Unexpected response:", data);
            alert(
              "Upload completed but session update may have failed. Please try again.",
            );
          }
        } catch {
          // If we can't parse response, assume success since response.ok was true
          setSuccess(true);
        }
      } else {
        // Try to get error message from response
        let errorMessage = "Upload failed. Please try again.";
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = Array.isArray(errorData.message)
              ? errorData.message.join(", ")
              : errorData.message;
          }
        } catch {
          // If we can't parse JSON, use status text
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
      // Network error or CORS issue
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
    return (
      <div className="min-h-screen bg-linear-to-b from-green-50 to-white dark:from-green-950/20 dark:to-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center space-y-6">
            {/* Success Icon */}
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 bg-green-100 dark:bg-green-900/30 rounded-full animate-ping opacity-20" />
              <div className="relative bg-linear-to-br from-green-400 to-green-600 w-24 h-24 rounded-full flex items-center justify-center shadow-lg shadow-green-500/25">
                <CheckCircle2 className="h-12 w-12 text-white" />
              </div>
            </div>

            {/* Success Message */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-green-800 dark:text-green-300">
                Upload Complete!
              </h1>
              <p className="text-green-700/80 dark:text-green-400/80 text-sm leading-relaxed">
                Your document has been sent to the desktop successfully. You can
                safely close this page.
              </p>
            </div>

            {/* Visual indicator */}
            <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 text-sm">
              <Smartphone className="h-4 w-4" />
              <span className="text-xs">→</span>
              <FileText className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white dark:from-slate-950 dark:to-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-background/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-sm mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Camera className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-lg">Docita Scan</span>
          </div>
        </div>
      </div>

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
        <Card className="overflow-hidden shadow-sm border-slate-200 dark:border-slate-800">
          <CardContent className="p-0">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative transition-all duration-200 ${
                dragActive
                  ? "bg-blue-50 dark:bg-blue-950/30 ring-2 ring-blue-500 ring-inset"
                  : "bg-slate-50 dark:bg-slate-900/50"
              }`}
            >
              {previewUrl ? (
                /* Preview Mode */
                <div className="relative aspect-4/3">
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    fill
                    className="object-contain bg-black/5 dark:bg-white/5"
                  />
                  {/* Clear Button */}
                  <button
                    onClick={clearFile}
                    className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-colors shadow-lg"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {/* Retake hint */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-lg flex items-center justify-center gap-2">
                      <RotateCcw className="h-3 w-3" />
                      <span>Tap ✕ to select a different image</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Upload Mode */
                <label className="block cursor-pointer">
                  <div className="aspect-4/3 flex flex-col items-center justify-center p-6 space-y-4">
                    <div
                      className={`p-4 rounded-2xl transition-colors ${
                        dragActive
                          ? "bg-blue-100 dark:bg-blue-900/50"
                          : "bg-slate-100 dark:bg-slate-800"
                      }`}
                    >
                      <Camera
                        className={`h-10 w-10 transition-colors ${
                          dragActive
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-slate-400 dark:text-slate-500"
                        }`}
                      />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-medium text-foreground">
                        {dragActive ? "Drop your image here" : "Tap to capture"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        or select from gallery
                      </p>
                    </div>
                    {/* File format hint */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ImageIcon className="h-3 w-3" />
                      <span>JPG, PNG supported</span>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>
          </CardContent>
        </Card>

        {/* File Info */}
        {file && (
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
        )}

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
