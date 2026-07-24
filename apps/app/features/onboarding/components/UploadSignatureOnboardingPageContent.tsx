"use client";

import { Suspense } from "react";
import { getUserFacingErrorMessage } from "@workspace/utils";
import { Card, CardContent } from "@workspace/ui/components/indicators/card";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { SignatureUploadedCard, SignatureLinkLoadingCard, SignatureLinkErrorCard, SignatureUploadFormCard } from "./UploadSignatureOnboardingSections";
import { useSignatureUpload } from "./use-signature-upload";

function OnboardingSlaUploadInner() {
  const upload = useSignatureUpload();

  if (upload.uploadComplete) {
    return (
      <div className="app-shell-bg flex min-h-screen items-center justify-center p-4">
        <SignatureUploadedCard alreadyUploaded={upload.alreadyUploaded} />
      </div>
    );
  }

  if (upload.statusQuery.isLoading) {
    return (
      <div className="app-shell-bg flex min-h-screen items-center justify-center p-4">
        <SignatureLinkLoadingCard />
      </div>
    );
  }

  if (upload.statusQuery.isError) {
    const errorMessage = getUserFacingErrorMessage(upload.statusQuery.error, {
      fallback:
        "This signature link is no longer available. Please request a new one.",
      context: "load",
    });

    return (
      <div className="app-shell-bg flex min-h-screen items-center justify-center p-4">
        <SignatureLinkErrorCard error={errorMessage} />
      </div>
    );
  }

  if (upload.isMissingLinkParams) {
    return (
      <div className="app-shell-bg flex min-h-screen items-center justify-center p-4">
        <SignatureLinkErrorCard error={upload.error} />
      </div>
    );
  }

  return (
    <div className="app-shell-bg flex min-h-screen items-center justify-center p-4">
      <SignatureUploadFormCard
        uploading={upload.uploadMutation.isPending}
        error={upload.error}
        onErrorChange={upload.setError}
        onDrawUpload={upload.handleUpload}
        onFileUpload={upload.handleUpload}
      />
    </div>
  );
}

export default function OnboardingSlaUploadPage() {
  return (
    <Suspense
      fallback={
        <div className="app-shell-bg flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent
              className="flex flex-col items-center justify-center gap-3 py-10 text-center text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
              aria-label="Loading signature link"
            >
              <DocitaLoadingIndicator
                variant="section"
                withStatusRole={false}
                iconClassName="h-10 w-10 text-primary"
              />
              <p>Loading signature link…</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <OnboardingSlaUploadInner />
    </Suspense>
  );
}
