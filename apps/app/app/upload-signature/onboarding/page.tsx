"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { APIRequestError } from "@workspace/data-access";
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
import { buildCsrfHeaders } from "@/lib/csrf";
import {
  dataUrlToFile,
  validateSignatureImageFile,
} from "@/features/_shared/utils/signature-upload";
import { apiFetch } from "@/lib/api-client";
import { appQueryKeys } from "@/lib/query-keys";

export default function OnboardingSlaUploadPage() {
  const searchParams = useSearchParams();
  const onboardingId = searchParams.get("onboardingId");
  const sessionId = searchParams.get("sessionId");

  const [uploadMethod, setUploadMethod] = useState<"draw" | "upload">("draw");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [alreadyUploaded, setAlreadyUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const statusQuery = useQuery({
    queryKey: onboardingId && sessionId
      ? appQueryKeys.onboarding.signatureSession(onboardingId, sessionId)
      : appQueryKeys.onboarding.signatureSession("missing", "missing"),
    enabled: Boolean(onboardingId && sessionId),
    queryFn: async () => {
      if (!onboardingId || !sessionId) {
        throw new Error("Invalid upload link");
      }

      return await apiFetch<{
        status?: string;
        uploaded?: boolean;
        fileUrl?: string | null;
      }>(
        `/onboarding/${onboardingId}/sla-signature-session/${sessionId}/status?ts=${Date.now()}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );
    },
    retry: false,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!onboardingId || !sessionId) {
        throw new Error("Invalid upload link. Missing required parameters.");
      }

      const formData = new FormData();
      formData.append("file", file);
      return await apiFetch<{ success?: boolean }>(
        `/onboarding/${onboardingId}/sla-signature-session/${sessionId}`,
        {
          method: "POST",
          headers: buildCsrfHeaders(),
          body: formData,
        },
      );
    },
  });

  useEffect(() => {
    if (!onboardingId || !sessionId) {
      setError("Invalid upload link. Missing required parameters.");
      return;
    }

    const data = statusQuery.data;
    if (!data) return;

    const status = data.status?.toLowerCase();
    const isUploaded = Boolean(
      data.uploaded ||
        data.fileUrl ||
        status === "uploaded" ||
        status === "completed",
    );
    if (isUploaded) {
      setAlreadyUploaded(true);
      setUploadComplete(true);
    }
  }, [onboardingId, sessionId, statusQuery.data]);

  const handleUpload = async (file: File) => {
    if (!onboardingId || !sessionId) return;
    setError(null);
    try {
      await uploadMutation.mutateAsync(file);
      setUploadComplete(true);
    } catch (err) {
      if (
        err instanceof APIRequestError &&
        err.message.toLowerCase().includes("already been used")
      ) {
        setAlreadyUploaded(true);
        setUploadComplete(true);
        return;
      }

      if (err instanceof APIRequestError) {
        const message = err.message || "Upload failed";
        setError(message);
      } else if (err instanceof Error) {
        if (err.message.toLowerCase().includes("already been used")) {
          setAlreadyUploaded(true);
          setUploadComplete(true);
          return;
        }
        setError(err.message);
      } else {
        setError("Upload failed");
      }
    }
  };

  const handleSignatureSave = async (dataUrl: string) => {
    setSignatureDataUrl(dataUrl);
    const file = dataUrlToFile(dataUrl, "signature.png");
    await handleUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validateSignatureImageFile(file);
    if (validationError) {
      setError(validationError);
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
              {alreadyUploaded
                ? "This signature link is already completed. You can close this page and return to your desktop."
                : "Your signature has been saved. You can close this page and return to your desktop to complete registration."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (statusQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking signature link...
          </CardContent>
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
                  {uploadMutation.isPending && (
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
                disabled={uploadMutation.isPending}
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
                    disabled={uploadMutation.isPending}
                  >
                    {uploadMutation.isPending ? (
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
