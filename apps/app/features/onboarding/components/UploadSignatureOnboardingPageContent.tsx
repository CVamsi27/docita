"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { APIRequestError } from "@workspace/data-access";
import {
  Card,
  CardContent,
} from "@workspace/ui/components/indicators/card";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { buildCsrfHeaders } from "@/lib/auth/csrf";
import { apiFetch } from "@/lib/api/api-client";
import { appQueryKeys } from "@/lib/api/query-keys";
import { getUserFacingErrorMessage } from "@workspace/utils";
import {
  SignatureUploadedCard,
  SignatureLinkLoadingCard,
  SignatureLinkErrorCard,
  SignatureUploadFormCard,
} from "./UploadSignatureOnboardingSections";

function OnboardingSlaUploadInner() {
  const searchParams = useSearchParams();
  const onboardingId = useMemo(
    () => searchParams.get("onboardingId"),
    [searchParams],
  );
  const sessionId = useMemo(
    () => searchParams.get("sessionId"),
    [searchParams],
  );
  const uploadSecret = useMemo(
    () => searchParams.get("uploadSecret"),
    [searchParams],
  );

  const [uploadComplete, setUploadComplete] = useState(false);
  const [alreadyUploaded, setAlreadyUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusQuery = useQuery({
    queryKey:
      onboardingId && sessionId
        ? appQueryKeys.onboarding.signatureSession(onboardingId, sessionId)
        : appQueryKeys.onboarding.signatureSession("missing", "missing"),
    enabled: Boolean(onboardingId && sessionId && uploadSecret?.trim()),
    queryFn: async () => {
      if (!onboardingId || !sessionId || !uploadSecret?.trim()) {
        throw new Error(
          "This signature link is incomplete. Please open the full link again.",
        );
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

  const getCompletedSignatureState = (
    data:
      | {
          status?: string;
          uploaded?: boolean;
          fileUrl?: string | null;
        }
      | undefined,
  ) => {
    const status = data?.status?.toLowerCase();

    return Boolean(
      data?.uploaded ||
      data?.fileUrl ||
      status === "uploaded" ||
      status === "completed",
    );
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!onboardingId || !sessionId || !uploadSecret?.trim()) {
        throw new Error(
          "This signature link is incomplete. Please open the full link again.",
        );
      }

      const formData = new FormData();
      formData.append("file", file);
      return await apiFetch<{ success?: boolean }>(
        `/onboarding/${onboardingId}/sla-signature-session/${sessionId}`,
        {
          method: "POST",
          headers: buildCsrfHeaders({
            "X-Upload-Secret": uploadSecret.trim(),
          }),
          body: formData,
        },
      );
    },
  });

  useEffect(() => {
    if (!onboardingId || !sessionId || !uploadSecret?.trim()) {
      setError(
        "This signature link is incomplete. Please open the full link again.",
      );
      return;
    }

    const data = statusQuery.data;
    if (!data) return;
    const isUploaded = getCompletedSignatureState(data);

    if (isUploaded) {
      setAlreadyUploaded(true);
      setUploadComplete(true);
    }
  }, [onboardingId, sessionId, uploadSecret, statusQuery.data]);

  const handleUpload = async (file: File) => {
    if (!onboardingId || !sessionId || !uploadSecret?.trim()) return;
    setError(null);

    try {
      await uploadMutation.mutateAsync(file);
      setUploadComplete(true);
    } catch (err) {
      const latestStatus = await statusQuery.refetch();
      if (getCompletedSignatureState(latestStatus.data)) {
        setAlreadyUploaded(true);
        setUploadComplete(true);
        return;
      }

      if (err instanceof APIRequestError) {
        setError(
          getUserFacingErrorMessage(err, {
            fallback: "We could not upload this signature. Please try again.",
            context: "upload",
          }),
        );
      } else if (err instanceof Error) {
        setError(
          getUserFacingErrorMessage(err, {
            fallback: "We could not upload this signature. Please try again.",
            context: "upload",
          }),
        );
      } else {
        setError("We could not upload this signature. Please try again.");
      }
    }
  };

  if (uploadComplete) {
    return (
      <div className="app-shell-bg flex min-h-screen items-center justify-center p-4">
        <SignatureUploadedCard alreadyUploaded={alreadyUploaded} />
      </div>
    );
  }

  if (statusQuery.isLoading) return (
      <div className="app-shell-bg flex min-h-screen items-center justify-center p-4">
        <SignatureLinkLoadingCard />
      </div>
    );

  if (statusQuery.isError) {
    const errorMessage = getUserFacingErrorMessage(statusQuery.error, {
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

  if (!onboardingId || !sessionId || !uploadSecret?.trim()) {
    return (
      <div className="app-shell-bg flex min-h-screen items-center justify-center p-4">
        <SignatureLinkErrorCard error={error} />
      </div>
    );
  }

  return (
    <div className="app-shell-bg flex min-h-screen items-center justify-center p-4">
      <SignatureUploadFormCard
        uploading={uploadMutation.isPending}
        error={error}
        onErrorChange={setError}
        onDrawUpload={handleUpload}
        onFileUpload={handleUpload}
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
