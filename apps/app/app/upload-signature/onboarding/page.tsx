"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { APIRequestError } from "@workspace/data-access";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { buildCsrfHeaders } from "@/lib/csrf";
import { apiFetch } from "@/lib/api-client";
import { appQueryKeys } from "@/lib/query-keys";
import { SignatureUploadWorkflow } from "@/features/_shared/components/signature/signature-upload-workflow";
import { getUserFacingErrorMessage } from "@workspace/types";

export default function OnboardingSlaUploadPage() {
  const searchParams = useSearchParams();
  const onboardingId = searchParams.get("onboardingId");
  const sessionId = searchParams.get("sessionId");

  const [uploadComplete, setUploadComplete] = useState(false);
  const [alreadyUploaded, setAlreadyUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setError(
          getUserFacingErrorMessage(err, {
            fallback: "We could not upload the signature. Please try again.",
            context: "upload",
          }),
        );
      } else if (err instanceof Error) {
        if (err.message.toLowerCase().includes("already been used")) {
          setAlreadyUploaded(true);
          setUploadComplete(true);
          return;
        }
        setError(
          getUserFacingErrorMessage(err, {
            fallback: "We could not upload the signature. Please try again.",
            context: "upload",
          }),
        );
      } else {
        setError("We could not upload the signature. Please try again.");
      }
    }
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
          <SignatureUploadWorkflow
            uploading={uploadMutation.isPending}
            error={error}
            onErrorChange={setError}
            onDrawUpload={handleUpload}
            onFileUpload={handleUpload}
            autoUploadOnDraw
            drawTabLabel="Draw"
            uploadTabLabel="Upload Image"
            drawAlertText="Draw your SLA signature using your finger or stylus."
            uploadAlertText="Upload the SLA signature image (PNG, JPG, or WebP). Maximum file size: 5MB."
            selectImageButtonLabel="Select Image"
            changeImageButtonLabel="Change Image"
            uploadButtonLabel="Upload Signature"
            uploadingButtonLabel="Uploading..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
