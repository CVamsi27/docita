"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { CheckCircle2, AlertCircle, Upload, Loader2, Pencil } from "lucide-react";
import { SignaturePad, SignaturePreview } from "@/components/signature-canvas";
import { API_URL } from "@/lib/api-config";

function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const token = document.cookie
    .split("; ")
    .find((row) => row.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];
  return token ? decodeURIComponent(token) : null;
}

export default function OnboardingSlaUploadPage() {
  const searchParams = useSearchParams();
  const onboardingId = searchParams.get("onboardingId");
  const sessionId = searchParams.get("sessionId");

  const [uploadMethod, setUploadMethod] = useState<"draw" | "upload">("draw");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!onboardingId || !sessionId) {
      setError("Invalid upload link. Missing required parameters.");
    }
  }, [onboardingId, sessionId]);

  const dataURLtoFile = (dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  };

  const handleUpload = async (file: File) => {
    if (!onboardingId || !sessionId) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const csrfToken = getCsrfToken();
      const res = await fetch(
        `${API_URL}/onboarding/${onboardingId}/sla-signature-session/${sessionId}`,
        {
          method: "POST",
          credentials: "include",
          headers: csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {},
          body: formData,
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message || "Upload failed");
      }
      setUploadComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSignatureSave = async (dataUrl: string) => {
    setSignatureDataUrl(dataUrl);
    const file = dataURLtoFile(dataUrl, "signature.png");
    await handleUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must not exceed 5MB");
      return;
    }
    setSelectedFile(file);
    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  if (uploadComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-success" />
              <CardTitle>Signature Uploaded</CardTitle>
            </div>
            <CardDescription>
              Your signature has been saved. You can close this page and return to your desktop to complete registration.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!onboardingId || !sessionId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Invalid Link</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error ?? "This link is invalid or expired."}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Upload SLA Signature</CardTitle>
          <CardDescription>
            Draw or upload your signature to authorise the Docita Service Level Agreement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={uploadMethod} onValueChange={(v) => setUploadMethod(v as "draw" | "upload")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="draw">
                <Pencil className="mr-2 h-4 w-4" />
                Draw
              </TabsTrigger>
              <TabsTrigger value="upload">
                <Upload className="mr-2 h-4 w-4" />
                Upload Image
              </TabsTrigger>
            </TabsList>

            <TabsContent value="draw" className="space-y-3 pt-2">
              {!signatureDataUrl ? (
                <SignaturePad onSave={handleSignatureSave} />
              ) : (
                <div className="space-y-3">
                  <SignaturePreview
                    dataUrl={signatureDataUrl}
                    onEdit={() => setSignatureDataUrl(null)}
                  />
                  {uploading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="upload" className="space-y-3 pt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                {selectedFile ? "Change Image" : "Select Image"}
              </Button>
              {previewUrl && (
                <div className="space-y-3">
                  <div className="rounded-lg border bg-white p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Signature preview"
                      className="mx-auto max-h-32 object-contain"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => selectedFile && handleUpload(selectedFile)}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Signature
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
        </CardContent>
      </Card>
    </div>
  );
}
