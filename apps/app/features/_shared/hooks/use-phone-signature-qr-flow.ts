"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface PhoneSignatureQrSession {
  sessionId: string;
  qrUrl: string;
  contextId?: string;
}

interface UsePhoneSignatureQrFlowOptions {
  createSession: () => Promise<PhoneSignatureQrSession>;
  checkUploaded: (session: PhoneSignatureQrSession) => Promise<boolean>;
  onUploaded?: (session: PhoneSignatureQrSession) => void;
  autoStart?: boolean;
  initialUploaded?: boolean;
  pollIntervalMs?: number;
  persistenceKey?: string;
}

function readPersistedSession(
  key?: string,
): PhoneSignatureQrSession | null {
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PhoneSignatureQrSession>;
    if (
      typeof parsed.sessionId !== "string" ||
      !parsed.sessionId.trim() ||
      typeof parsed.qrUrl !== "string" ||
      !parsed.qrUrl.trim()
    ) {
      sessionStorage.removeItem(key);
      return null;
    }
    return {
      sessionId: parsed.sessionId,
      qrUrl: parsed.qrUrl,
      contextId:
        typeof parsed.contextId === "string" && parsed.contextId.trim()
          ? parsed.contextId
          : undefined,
    };
  } catch {
    sessionStorage.removeItem(key);
    return null;
  }
}

function persistSession(
  key: string | undefined,
  session: PhoneSignatureQrSession | null,
): void {
  if (!key || typeof window === "undefined") return;
  try {
    if (!session) {
      sessionStorage.removeItem(key);
      return;
    }
    sessionStorage.setItem(key, JSON.stringify(session));
  } catch {
    // Ignore storage failures in private browsing/quota-limited environments.
  }
}

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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const [session, setSession] = useState<PhoneSignatureQrSession | null>(() =>
    readPersistedSession(persistenceKey),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [isUploaded, setIsUploaded] = useState(initialUploaded);
  const [error, setError] = useState<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const markUploaded = useCallback(
    (activeSession: PhoneSignatureQrSession) => {
      stopPolling();
      setIsUploaded(true);
      setError(null);
      onUploaded?.(activeSession);
    },
    [onUploaded, stopPolling],
  );

  const checkUploadOnce = useCallback(
    async (activeSession: PhoneSignatureQrSession) => {
      const uploaded = await checkUploaded(activeSession);
      if (uploaded) {
        markUploaded(activeSession);
      }
      return uploaded;
    },
    [checkUploaded, markUploaded],
  );

  const startPolling = useCallback(
    (activeSession: PhoneSignatureQrSession) => {
      stopPolling();
      setIsPolling(true);
      pollRef.current = setInterval(() => {
        void checkUploadOnce(activeSession).catch(() => {
          // Ignore polling errors and continue.
        });
      }, pollIntervalMs);
    },
    [checkUploadOnce, pollIntervalMs, stopPolling],
  );

  const startSession = useCallback(async (
    options?: { force?: boolean },
  ) => {
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
          err instanceof Error ? err.message : "Failed to generate QR code",
        );
      }
    } finally {
      createInFlightRef.current = false;
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [checkUploadOnce, createSession, isUploaded, session, startPolling]);

  const retrySession = useCallback(async () => {
    stopPolling();
    setSession(null);
    setIsUploaded(false);
    setError(null);
    await startSession({ force: true });
  }, [startSession, stopPolling]);

  const refreshStatus = useCallback(async () => {
    if (!session) return false;
    return checkUploadOnce(session);
  }, [checkUploadOnce, session]);

  const copyLink = useCallback(async () => {
    if (!session?.qrUrl) return false;
    if (!navigator.clipboard?.writeText) {
      return false;
    }
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
  }, [autoStart, checkUploadOnce, isPolling, isUploaded, session, startPolling]);

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
