import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { ConfirmContextValue, ConfirmDialogSection, PromptDialogSection, AlertDialogSection } from "./use-confirm-sections";
import { useConfirmDialogState } from "./use-confirm-dialog-state";
import { usePromptDialogState } from "./use-prompt-dialog-state";
import { useAlertDialogState } from "./use-alert-dialog-state";

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

interface ConfirmProviderProps {
  children: ReactNode;
}

/**
 * Composes the three independent promise-based dialog state machines —
 * confirm (`useConfirmDialogState`), prompt (`usePromptDialogState`), and
 * alert (`useAlertDialogState`) — into the `ConfirmContextValue` the rest of
 * the app consumes via `useConfirm`, and renders their dialog sections.
 */
export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const confirmDialog = useConfirmDialogState();
  const promptDialog = usePromptDialogState();
  const alertDialog = useAlertDialogState();

  return (
    <ConfirmContext.Provider
      value={{
        confirm: confirmDialog.confirm,
        prompt: promptDialog.prompt,
        alert: alertDialog.alert,
        confirmDelete: confirmDialog.confirmDelete,
        confirmDiscard: confirmDialog.confirmDiscard,
        confirmAction: confirmDialog.confirmAction,
      }}
    >
      {children}

      <ConfirmDialogSection
        state={confirmDialog.confirmState}
        typedConfirmation={confirmDialog.typedConfirmation}
        onTypedConfirmationChange={confirmDialog.setTypedConfirmation}
        onClose={confirmDialog.handleConfirmClose}
      />

      <PromptDialogSection
        state={promptDialog.promptState}
        value={promptDialog.promptValue}
        setValue={promptDialog.setPromptValue}
        error={promptDialog.promptError}
        setError={promptDialog.setPromptError}
        onSubmit={promptDialog.handlePromptSubmit}
        onCancel={promptDialog.handlePromptCancel}
      />

      <AlertDialogSection
        state={alertDialog.alertState}
        onClose={alertDialog.handleAlertClose}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm must be used within a ConfirmProvider");
  return context;
}
