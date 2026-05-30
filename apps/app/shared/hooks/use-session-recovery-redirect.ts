"use client";

import { useEffect, useState } from "react";
import {
  isSessionRecoveryError,
  recoverSessionOrRedirectLogin,
} from "@/lib/auth/session-recovery";

interface UseSessionRecoveryRedirectOptions {
  error: unknown;
  onRecovered?: () => void | Promise<void>;
}

/**
 * When a protected query fails because the session cannot be used, recover
 * silently instead of leaving the page on a useless "Try again" state.
 */
export function useSessionRecoveryRedirect({
  error,
  onRecovered,
}: UseSessionRecoveryRedirectOptions): boolean {
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    if (!error || !isSessionRecoveryError(error)) {
      return;
    }

    let cancelled = false;
    setIsRecovering(true);

    void (async () => {
      const recovered = await recoverSessionOrRedirectLogin();
      if (cancelled) {
        return;
      }

      if (recovered) {
        await onRecovered?.();
      }

      if (!cancelled) {
        setIsRecovering(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [error, onRecovered]);

  return isRecovering;
}
