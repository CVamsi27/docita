"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { APIRequestError } from "@workspace/data-access";
import { getUserFacingErrorMessage } from "@workspace/utils";
import { buildCsrfHeaders } from "@/lib/auth/csrf";
import { apiFetch } from "@/lib/api/api-client";
import { appQueryKeys } from "@/lib/api/query-keys";

interface SignatureSessionStatus {
  status?: string;
  uploaded?: boolean;
  fileUrl?: string | null;
}

export function useSignatureUpload() {
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
      return await apiFetch<SignatureSessionStatus>(
        `/onboarding/${onboardingId}/sla-signature-session/${sessionId}/status?ts=${Date.now()}`,
        { method: "GET", cache: "no-store" },
      );
    },
    retry: false,
  });

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

  const getCompletedSignatureState = (data: SignatureSessionStatus | undefined) => {
    const status = data?.status?.toLowerCase();
    return Boolean(
      data?.uploaded || data?.fileUrl || status === "uploaded" || status === "completed",
    );
  };

  useEffect(() => {
    if (!onboardingId || !sessionId || !uploadSecret?.trim()) {
      setError("This signature link is incomplete. Please open the full link again.");
      return;
    }
    const data = statusQuery.data;
    if (!data) return;
    if (getCompletedSignatureState(data)) {
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

  const isMissingLinkParams = !onboardingId || !sessionId || !uploadSecret?.trim();

  return {
    uploadComplete,
    alreadyUploaded,
    error,
    setError,
    statusQuery,
    uploadMutation,
    isMissingLinkParams,
    getCompletedSignatureState,
    handleUpload,
  };
}
