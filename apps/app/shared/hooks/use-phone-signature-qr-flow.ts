"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getUserFacingErrorMessage } from "@workspace/utils";
import {
  readPersistedSession,
  persistSession,
  type PhoneSignatureQrSession,
  type UsePhoneSignatureQrFlowOptions,
} from "./phone-signature-qr-flow-helpers";
import { usePhoneSignaturePolling } from "./use-phone-signature-polling";

export type { PhoneSignatureQrSession, UsePhoneSignatureQrFlowOptions };

export function usePhoneSignatureQrFlow({
  createSession,
  checkUploaded,
  onUploaded,
  autoStart = true,
  initialUploaded = false,
  pollIntervalMs = 3000,
  persistenceKey,
}: UsePhoneSignatureQrFlowOptions) {
  const createInFlightRef = useRef(false);
  const isMountedRef = useRef(true);
  const [session, setSession] = useState<PhoneSignatureQrSession | null>(() =>
    readPersistedSession(persistenceKey),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isUploaded, setIsUploaded] = useState(initialUploaded);
  const [error, setError] = useState<string | null>(null);

  const markUploaded = useCallback(
    (activeSession: PhoneSignatureQrSession) => {
      setIsUploaded(true);
      setError(null);
      onUploaded?.(activeSession);
    },
    [onUploaded],
  );

  const { isPolling, stopPolling, checkUploadOnce, startPolling } = usePhoneSignaturePolling(checkUploaded, markUploaded, pollIntervalMs);

  const startSession = useCallback(
    async (options?: { force?: boolean }) => {
      const force = options?.force === true;
      if ((!force && session) || createInFlightRef.current) return;
      if (!force && isUploaded) return;

      createInFlightRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        const nextSession = await createSession();
        if (!isMountedRef.current) return;
        setSession(nextSession);
        setIsUploaded(false);
        const uploaded = await checkUploadOnce(nextSession).catch(() => false);
        if (!uploaded) {
          startPolling(nextSession);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(
            getUserFacingErrorMessage(err, {
              fallback:
                "We could not create this signature link. Please try again.",
              context: "upload",
            }),
          );
        }
      } finally {
        createInFlightRef.current = false;
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [checkUploadOnce, startPolling, createSession, isUploaded, session],
  );

  const retrySession = useCallback(async () => {
    stopPolling();
    setSession(null);
    setIsUploaded(false);
    setError(null);
    await startSession({ force: true });
  }, [stopPolling, startSession]);

  const refreshStatus = useCallback(async () => {
    if (!session) return false;
    return checkUploadOnce(session);
  }, [checkUploadOnce, session]);

  const copyLink = useCallback(async () => {
    if (!session?.qrUrl) return false;
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(session.qrUrl);
    return true;
  }, [session?.qrUrl]);

  useEffect(() => {
    if (autoStart && !session && !isUploaded) {
      void startSession();
    }
  }, [autoStart, isUploaded, session, startSession]);

  useEffect(() => {
    if (!autoStart || !session || isUploaded || isPolling) return;
    let cancelled = false;
    const resumePolling = async () => {
      try {
        const uploaded = await checkUploadOnce(session);
        if (!uploaded && !cancelled) {
          startPolling(session);
        }
      } catch {
        if (!cancelled) {
          startPolling(session);
        }
      }
    };
    void resumePolling();
    return () => {
      cancelled = true;
    };
  }, [
    autoStart,
    checkUploadOnce,
    isPolling,
    startPolling,
    isUploaded,
    session,
  ]);

  useEffect(() => {
    if (initialUploaded) {
      setIsUploaded(true);
      stopPolling();
    }
  }, [initialUploaded, stopPolling]);

  useEffect(() => {
    if (!persistenceKey || session || isUploaded) return;
    const restoredSession = readPersistedSession(persistenceKey);
    if (restoredSession) {
      setSession(restoredSession);
    }
  }, [isUploaded, persistenceKey, session]);

  useEffect(() => {
    if (isUploaded) {
      persistSession(persistenceKey, null);
      return;
    }
    persistSession(persistenceKey, session);
  }, [isUploaded, persistenceKey, session]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, [stopPolling]);

  return {
    session,
    isLoading,
    isPolling,
    isUploaded,
    error,
    setError,
    startSession,
    retrySession,
    refreshStatus,
    copyLink,
  };
}
