"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import { type ReactNode, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Alert, AlertDescription } from "@workspace/ui/components/feedback/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import {
  type UploadResult,
  uploadSignature,
  validateToken,
} from "@/hooks/api/use-signature-upload";
import { SignatureUploadWorkflow } from "@/components/signature/signature-upload-workflow";
import { getUserFacingErrorMessage } from "@workspace/types";
import { SupportContact } from "@/components/support-contact/support-contact";

function UploadPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        {children}
      </div>
      <div className="w-full border-t border-border/60 bg-background/90 px-4 py-4">
        <SupportContact
          layout="stack"
          variant="footer"
          className="mx-auto max-w-2xl"
        />
      </div>
    </div>
  );
}

export default function UploadSignaturePage() {
  const params = useParams();
  const token = params.token as string;

  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [doctorName, setDoctorName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const validation = await validateToken(token);
        setTokenValid(true);
        setDoctorName(validation.doctor?.name ?? "");
      } catch (err) {
        setError(
          getUserFacingErrorMessage(err, {
            fallback: "This upload link is no longer available",
            context: "verification",
          }),
        );
        setTokenValid(false);
      } finally {
        setValidating(false);
      }
    };

    if (token) {
      void checkToken();
    }
  }, [token]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      const result = await uploadSignature(token, file);
      setUploadResult(result);
      setUploadComplete(true);
    } catch (err) {
      setError(
        getUserFacingErrorMessage(err, {
          fallback: "We could not upload this signature. Please try again.",
          context: "upload",
        }),
      );
    } finally {
      setUploading(false);
    }
  };

  if (validating) {
    return (
      <UploadPageShell>
        <Card className="w-full max-w-md">
          <CardContent
            className="flex flex-col items-center justify-center py-12"
            role="status"
            aria-live="polite"
            aria-label="Validating upload link"
          >
            <DocitaLoadingIndicator
              variant="section"
              withStatusRole={false}
              className="mb-4"
              iconClassName="h-8 w-8 text-primary"
            />
            <p className="text-sm text-muted-foreground">
              Validating upload link…
            </p>
          </CardContent>
        </Card>
      </UploadPageShell>
    );
  }

  if (!tokenValid) {
    return (
      <UploadPageShell>
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Upload Link Expired</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <p className="mt-4 text-sm text-muted-foreground">
              This link may have expired or been used. Please request a new
              upload link from the Docita app.
            </p>
          </CardContent>
        </Card>
      </UploadPageShell>
    );
  }

  if (uploadComplete && uploadResult) {
    return (
      <UploadPageShell>
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <CardTitle>Upload Successful!</CardTitle>
            </div>
            <CardDescription>
              Your signature has been uploaded successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-success/50 bg-success/10">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription>
                Signature uploaded for <strong>{uploadResult.doctor?.name}</strong>
              </AlertDescription>
            </Alert>

            <div className="rounded-lg border bg-background p-4">
              <img
                src={uploadResult.signatureUrl}
                alt="Uploaded signature"
                className="mx-auto max-h-32 object-contain"
              />
            </div>

            <p className="text-center text-sm text-muted-foreground">
              You can now close this page. Your signature will appear on all
              prescriptions and medical documents.
            </p>
          </CardContent>
        </Card>
      </UploadPageShell>
    );
  }

  return (
    <UploadPageShell>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Upload Your Signature</CardTitle>
          <CardDescription>
            Draw or upload a clear image of your signature for Dr. {doctorName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SignatureUploadWorkflow
            uploading={uploading}
            error={error}
            onErrorChange={setError}
            onDrawUpload={handleUpload}
            onFileUpload={handleUpload}
            drawTabLabel="Draw Signature"
            uploadTabLabel="Upload Image"
            drawAlertText="Draw your signature using your mouse or touch screen"
            uploadAlertText="Upload a clear image of your signature (PNG, JPG, or WebP). Maximum file size: 5MB."
            selectImageButtonLabel="Select Image"
            changeImageButtonLabel="Change Image"
            uploadButtonLabel="Upload Signature"
            uploadingButtonLabel="Uploading…"
          />
        </CardContent>
      </Card>
    </UploadPageShell>
  );
}
