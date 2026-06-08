"use client";

import { useCallback, useState } from "react";
import type { AlertOptions } from "@/features/dialogs/types";
import { type AlertState } from "./use-confirm-sections";

/**
 * Owns the alert-dialog state machine: open/options/resolve state and the
 * promise-based `alert` API plus its close-resolution handler.
 */
export function useAlertDialogState() {
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    options: null,
    resolve: null,
  });

  const alert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setAlertState({ isOpen: true, options, resolve });
    });
  }, []);

  const handleAlertClose = useCallback(() => {
    setAlertState((prev) => {
      prev.resolve?.();
      return { isOpen: false, options: null, resolve: null };
    });
  }, []);

  return { alertState, alert, handleAlertClose };
}
