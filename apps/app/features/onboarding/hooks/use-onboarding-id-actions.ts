"use client";

import { useCallback, type RefObject } from "react";
import { apiFetch } from "@/lib/api/api-client";
import { buildCsrfHeaders, buildJsonHeaders } from "@/lib/auth/csrf";
import { handleOnboardingValidateError } from "./clinic-registration-helpers";

async function validateOnboardingProgress(onboardingId: string): Promise<void> {
  await apiFetch(`/onboarding/${onboardingId}/progress`, {
    method: "GET",
    headers: buildJsonHeaders(),
    cache: "no-store",
  });
}

export function useOnboardingIdActions({
  onboardingId,
  setOnboardingId,
  validatedOnboardingIdRef,
}: {
  onboardingId: string | null;
  setOnboardingId: (id: string | null) => void;
  validatedOnboardingIdRef: RefObject<string | null>;
}) {
  const initializeOnboardingId = useCallback(async (): Promise<string> => {
    const data = await apiFetch<{ onboardingId: string }>(
      "/onboarding/initialize",
      { method: "POST", headers: buildJsonHeaders(), body: JSON.stringify({}) },
    );
    setOnboardingId(data.onboardingId);
    validatedOnboardingIdRef.current = data.onboardingId;
    return data.onboardingId;
  }, [setOnboardingId, validatedOnboardingIdRef]);

  const ensureOnboardingId = useCallback(
    async (options?: { forceRefresh?: boolean }): Promise<string> => {
      if (options?.forceRefresh === true) return initializeOnboardingId();
      if (!onboardingId) return initializeOnboardingId();
      if (validatedOnboardingIdRef.current === onboardingId) return onboardingId;
      try {
        await validateOnboardingProgress(onboardingId);
        validatedOnboardingIdRef.current = onboardingId;
        return onboardingId;
      } catch (error) {
        handleOnboardingValidateError(error);
      }
      setOnboardingId(null);
      return initializeOnboardingId();
    },
    [
      initializeOnboardingId,
      onboardingId,
      setOnboardingId,
      validatedOnboardingIdRef,
    ],
  );

  const uploadSlaSignature = useCallback(
    async (file: File): Promise<string> => {
      return uploadSlaSignatureSession(file, ensureOnboardingId);
    },
    [ensureOnboardingId],
  );

  return { ensureOnboardingId, uploadSlaSignature };
}

async function uploadSlaSignatureSession(
  file: File,
  ensureOnboardingId: () => Promise<string>,
): Promise<string> {
  const oid = await ensureOnboardingId();
  const sessionData = await apiFetch<{ id: string; uploadSecret: string }>(
    `/onboarding/${oid}/sla-signature-session`,
    {
      method: "POST",
      headers: buildJsonHeaders(),
      body: JSON.stringify({}),
    },
  );
  const body = new FormData();
  body.append("file", file);
  await apiFetch(`/onboarding/${oid}/sla-signature-session/${sessionData.id}`, {
    method: "POST",
    headers: buildCsrfHeaders({
      "X-Upload-Secret": sessionData.uploadSecret,
    }),
    body,
  });
  return sessionData.id;
}
