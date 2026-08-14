import { useCallback, type RefObject } from "react";
import {
  createSlaSignatureSession,
  initializeOnboarding,
  validateOnboardingProgress,
} from "@/features/setup/api/onboarding.api";
import { uploadSlaSignatureSession as uploadSlaSignatureSessionApi } from "@/lib/api/sla-signature-session";
import { handleOnboardingValidateError } from "./clinic-registration-helpers";

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
    const initializedOnboardingId = await initializeOnboarding();
    setOnboardingId(initializedOnboardingId);
    validatedOnboardingIdRef.current = initializedOnboardingId;
    return initializedOnboardingId;
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
  const sessionData = await createSlaSignatureSession(oid);
  await uploadSlaSignatureSessionApi({
    onboardingId: oid,
    sessionId: sessionData.id,
    uploadSecret: sessionData.uploadSecret,
    file,
  });
  return sessionData.id;
}
