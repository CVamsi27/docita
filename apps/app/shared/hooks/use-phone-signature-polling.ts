"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type PhoneSignatureQrSession } from "./phone-signature-qr-flow-helpers";

export function usePhoneSignaturePolling(
  checkUploaded: (session: PhoneSignatureQrSession) => Promise<boolean>,
  onUploaded: (session: PhoneSignatureQrSession) => void,
  pollIntervalMs: number,
) {
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const checkUploadOnce = useCallback(
    async (activeSession: PhoneSignatureQrSession) => {
      const uploaded = await checkUploaded(activeSession);
      if (uploaded) {
        stopPolling();
        onUploaded(activeSession);
      }
      return uploaded;
    },
    [checkUploaded, onUploaded, stopPolling],
  );

  const startPolling = useCallback(
    (activeSession: PhoneSignatureQrSession) => {
      stopPolling();
      setIsPolling(true);
      pollRef.current = setInterval(() => {
        void checkUploadOnce(activeSession).catch(() => {});
      }, pollIntervalMs);
    },
    [checkUploadOnce, pollIntervalMs, stopPolling],
  );

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  return { isPolling, stopPolling, checkUploadOnce, startPolling, pollRef };
}
