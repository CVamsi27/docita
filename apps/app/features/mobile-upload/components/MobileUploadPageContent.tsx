"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { APIRequestError } from "@workspace/data-access";
import { Button } from "@workspace/ui/components/form/button";
import { Upload } from "lucide-react";
import { MobileHeader } from "@/features/mobile-upload/components/MobileHeader";
import { MobileSuccessScreen } from "@/features/mobile-upload/components/MobileSuccessScreen";
import { MobileFileUploader } from "@/features/mobile-upload/components/MobileFileUploader";
import { apiFetch } from "@/lib/api/api-client";
import { buildCsrfHeaders } from "@/lib/auth/csrf";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

function MobileUploadPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params["id"] as string;
  const uploadSecretFromQuery = useMemo(
    () => searchParams.get("uploadSecret"),
    [searchParams],
  );
  const [file, setFile] = useState<File | null>(null);
  const [success, setSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (selectedFile: File) => {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const secret = uploadSecretFromQuery?.trim();
      if (!secret) {
        throw new Error("Missing upload credentials in this link.");
      }

      return await apiFetch<{ status?: string; fileUrl?: string }>(
        `/uploads/session/${sessionId}`,
        {
          method: "POST",
          headers: buildCsrfHeaders({
            "X-Upload-Secret": secret,
          }),
          body: formData,
          suppressGlobalErrorToast: true,
        },
      );
    },
  });

  const handleFileSelect = useCallback(
    (selectedFile: File | null, url: string | null) => {
      setFile(selectedFile);
      setPreviewUrl(url);
      setErrorMessage(null);
    },
    [],
  );

  const handleUpload = async () => {
    if (!file || !sessionId) return;

    setErrorMessage(null);
    try {
      const data = await uploadMutation.mutateAsync(file);
      if (data.status === "uploaded" && data.fileUrl) {
        setSuccess(true);
      } else {
        const message =
          "Your upload finished, but we could not confirm it. Please try again.";
        setErrorMessage(message);
        showUserFacingErrorToast(null, message, "upload");
      }
    } catch (error) {
      if (error instanceof APIRequestError) {
        if (error.status === 413) {
          const message = "File is too large. Please use a smaller image.";
          setErrorMessage(message);
          showUserFacingErrorToast(null, message, "upload");
          return;
        }
        if (error.status === 404) {
          const message = "Session expired. Please scan the QR code again.";
          setErrorMessage(message);
          showUserFacingErrorToast(null, message, "upload");
          return;
        }
        if (error.status === 401) {
          const message =
            "This upload link is invalid or incomplete. Please scan the QR code again.";
          setErrorMessage(message);
          showUserFacingErrorToast(null, message, "upload");
          return;
        }
        if (error.status === 400) {
          const message = "Please upload an image file";
          setErrorMessage(message);
          showUserFacingErrorToast(null, message, "upload");
          return;
        }

        const message = "We could not upload this image. Please try again.";
        setErrorMessage(message);
        showUserFacingErrorToast(error, message, "upload");
      } else {
        const message = "We could not upload this image. Please try again.";
        setErrorMessage(message);
        showUserFacingErrorToast(error, message, "upload");
      }
    }
  };

  if (success) {
    return <MobileSuccessScreen />;
  }

  if (!uploadSecretFromQuery?.trim()) {
    return (
      <div className="min-h-screen bg-linear-to-b from-background to-card dark:from-background dark:to-card">
        <MobileHeader />
        <div className="max-w-sm mx-auto px-4 py-6 space-y-6">
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            This upload link is incomplete. Please scan the QR code again from
            your desktop.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-card dark:from-background dark:to-card">
      <MobileHeader />

      <div className="max-w-sm mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold text-foreground">
            Scan Document
          </h1>
          <p className="text-sm text-muted-foreground">
            Take a photo or select an image to send
          </p>
        </div>

        <MobileFileUploader
          onFileSelect={handleFileSelect}
          previewUrl={previewUrl}
        />

        {errorMessage && (
          <p
            role="alert"
            aria-live="assertive"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {errorMessage}
          </p>
        )}

        <Button
          className={`w-full h-14 text-base font-medium rounded-lg shadow-lg transition-colors duration-200 ${
            file && !uploadMutation.isPending
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/25"
              : ""
          }`}
          onClick={handleUpload}
          disabled={!file || uploadMutation.isPending}
          size="lg"
        >
          {uploadMutation.isPending ? (
            <span className="flex items-center gap-2">
              <DocitaLoadingIndicator variant="inline" decorative iconClassName="h-5 w-5" />
              Uploading…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Send to Desktop
            </span>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground px-4">
          The document will appear on your desktop instantly
        </p>
      </div>
    </div>
  );
}

export default function MobileUploadPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen flex-col items-center justify-center gap-3 bg-muted/30 p-4"
          role="status"
          aria-live="polite"
          aria-label="Loading upload"
        >
          <DocitaLoadingIndicator
            variant="section"
            withStatusRole={false}
            iconClassName="h-10 w-10 text-muted-foreground"
          />
          <p className="text-sm text-muted-foreground">Loading upload…</p>
        </div>
      }
    >
      <MobileUploadPageInner />
    </Suspense>
  );
}
