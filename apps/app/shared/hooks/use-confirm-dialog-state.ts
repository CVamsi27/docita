"use client";

import { useCallback, useState } from "react";
import type { ConfirmOptions } from "@/features/dialogs/types";
import { type ConfirmState } from "./use-confirm-sections";
import {
  buildActionConfirmOptions,
  buildDeleteConfirmOptions,
  buildDiscardConfirmOptions,
} from "./confirm-dialog-presets";

/**
 * Owns the confirm-dialog state machine: open/options/resolve state, the
 * "type to confirm" input, and the promise-based `confirm` API plus its
 * `confirmDelete`/`confirmDiscard`/`confirmAction` convenience wrappers.
 */
export function useConfirmDialogState() {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    options: null,
    resolve: null,
  });
  const [typedConfirmation, setTypedConfirmation] = useState("");

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ isOpen: true, options, resolve });
      setTypedConfirmation("");
    });
  }, []);

  const handleConfirmClose = useCallback((confirmed: boolean) => {
    setConfirmState((prev) => {
      prev.resolve?.(confirmed);
      return { isOpen: false, options: null, resolve: null };
    });
    setTypedConfirmation("");
  }, []);

  const confirmDelete = useCallback(
    (itemName: string, options?: Partial<ConfirmOptions>) =>
      confirm(buildDeleteConfirmOptions(itemName, options)),
    [confirm],
  );

  const confirmDiscard = useCallback(
    (options?: Partial<ConfirmOptions>) =>
      confirm(buildDiscardConfirmOptions(options)),
    [confirm],
  );

  const confirmAction = useCallback(
    (action: string, options?: Partial<ConfirmOptions>) =>
      confirm(buildActionConfirmOptions(action, options)),
    [confirm],
  );

  return {
    confirmState,
    typedConfirmation,
    setTypedConfirmation,
    confirm,
    handleConfirmClose,
    confirmDelete,
    confirmDiscard,
    confirmAction,
  };
}
