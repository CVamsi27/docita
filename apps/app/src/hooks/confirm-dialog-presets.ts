import type { ConfirmOptions } from "@/components/dialogs/types";

/**
 * Pure option-builders for `ConfirmProvider`'s `confirmDelete`/`confirmDiscard`/
 * `confirmAction` convenience wrappers — each composes the shared `confirm()`
 * dialog's copy/variant defaults, with caller-supplied overrides applied last.
 */

export function buildDeleteConfirmOptions(
  itemName: string,
  options?: Partial<ConfirmOptions>,
): ConfirmOptions {
  return {
    title: `Delete ${itemName}?`,
    description: `Are you sure you want to delete this ${itemName.toLowerCase()}? This action cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Cancel",
    variant: "destructive",
    ...options,
  };
}

export function buildDiscardConfirmOptions(
  options?: Partial<ConfirmOptions>,
): ConfirmOptions {
  return {
    title: "Discard changes?",
    description:
      "You have unsaved changes. Are you sure you want to discard them?",
    confirmText: "Discard",
    cancelText: "Keep editing",
    variant: "warning",
    ...options,
  };
}

export function buildActionConfirmOptions(
  action: string,
  options?: Partial<ConfirmOptions>,
): ConfirmOptions {
  return {
    title: `${action}?`,
    description: `Are you sure you want to ${action.toLowerCase()}?`,
    confirmText: action,
    cancelText: "Cancel",
    variant: "default",
    ...options,
  };
}
