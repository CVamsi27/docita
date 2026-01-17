"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import { ConfirmDialog } from "../features/dialogs/components/ConfirmDialog";
import { PromptDialog } from "../features/dialogs/components/PromptDialog";
import { AlertDialog } from "../features/dialogs/components/AlertDialog";
import {
  AlertOptions,
  ConfirmOptions,
  PromptOptions,
} from "../features/dialogs/types";

// =============================================================================
// Types
// =============================================================================

export type {
  ConfirmOptions,
  PromptOptions,
  AlertOptions,
} from "../features/dialogs/types";

interface ConfirmState {
  isOpen: boolean;
  options: ConfirmOptions | null;
  resolve: ((value: boolean) => void) | null;
}

interface PromptState {
  isOpen: boolean;
  options: PromptOptions | null;
  resolve: ((value: string | null) => void) | null;
}

interface AlertState {
  isOpen: boolean;
  options: AlertOptions | null;
  resolve: (() => void) | null;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
  alert: (options: AlertOptions) => Promise<void>;
  confirmDelete: (
    itemName: string,
    options?: Partial<ConfirmOptions>
  ) => Promise<boolean>;
  confirmDiscard: (options?: Partial<ConfirmOptions>) => Promise<boolean>;
  confirmAction: (
    action: string,
    options?: Partial<ConfirmOptions>
  ) => Promise<boolean>;
}

// =============================================================================
// Context
// =============================================================================

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

// =============================================================================
// Provider Component
// =============================================================================

interface ConfirmProviderProps {
  children: ReactNode;
}

export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    options: null,
    resolve: null,
  });

  const [promptState, setPromptState] = useState<PromptState>({
    isOpen: false,
    options: null,
    resolve: null,
  });

  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    options: null,
    resolve: null,
  });

  const [promptValue, setPromptValue] = useState("");
  const [promptError, setPromptError] = useState<string | null>(null);
  const [typedConfirmation, setTypedConfirmation] = useState("");

  // Confirm dialog
  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve,
      });
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

  // Prompt dialog
  const prompt = useCallback(
    (options: PromptOptions): Promise<string | null> => {
      return new Promise((resolve) => {
        setPromptState({
          isOpen: true,
          options,
          resolve,
        });
        setPromptValue(options.defaultValue || "");
        setPromptError(null);
      });
    },
    []
  );

  const handlePromptSubmit = useCallback(() => {
    setPromptState((prev) => {
      if (prev.options?.validation) {
        const error = prev.options.validation(promptValue);
        if (error) {
          setPromptError(error);
          return prev;
        }
      }
      prev.resolve?.(promptValue);
      setPromptValue("");
      setPromptError(null);
      return { isOpen: false, options: null, resolve: null };
    });
  }, [promptValue]);

  const handlePromptCancel = useCallback(() => {
    setPromptState((prev) => {
      prev.resolve?.(null);
      setPromptValue("");
      setPromptError(null);
      return { isOpen: false, options: null, resolve: null };
    });
  }, []);

  // Alert dialog
  const alert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleAlertClose = useCallback(() => {
    setAlertState((prev) => {
      prev.resolve?.();
      return { isOpen: false, options: null, resolve: null };
    });
  }, []);

  // Preset helpers
  const confirmDelete = useCallback(
    (itemName: string, options?: Partial<ConfirmOptions>): Promise<boolean> => {
      return confirm({
        title: `Delete ${itemName}?`,
        description: `Are you sure you want to delete this ${itemName.toLowerCase()}? This action cannot be undone.`,
        confirmText: "Delete",
        cancelText: "Cancel",
        variant: "destructive",
        ...options,
      });
    },
    [confirm]
  );

  const confirmDiscard = useCallback(
    (options?: Partial<ConfirmOptions>): Promise<boolean> => {
      return confirm({
        title: "Discard changes?",
        description:
          "You have unsaved changes. Are you sure you want to discard them?",
        confirmText: "Discard",
        cancelText: "Keep editing",
        variant: "warning",
        ...options,
      });
    },
    [confirm]
  );

  const confirmAction = useCallback(
    (action: string, options?: Partial<ConfirmOptions>): Promise<boolean> => {
      return confirm({
        title: `${action}?`,
        description: `Are you sure you want to ${action.toLowerCase()}?`,
        confirmText: action,
        cancelText: "Cancel",
        variant: "default",
        ...options,
      });
    },
    [confirm]
  );

  return (
    <ConfirmContext.Provider
      value={{
        confirm,
        prompt,
        alert,
        confirmDelete,
        confirmDiscard,
        confirmAction,
      }}
    >
      {children}

      <ConfirmDialog
        open={confirmState.isOpen}
        onOpenChange={(open) => !open && handleConfirmClose(false)}
        options={confirmState.options}
        onConfirm={() => handleConfirmClose(true)}
        onCancel={() => handleConfirmClose(false)}
        typedConfirmation={typedConfirmation}
        setTypedConfirmation={setTypedConfirmation}
      />

      <PromptDialog
        open={promptState.isOpen}
        onOpenChange={(open) => !open && handlePromptCancel()}
        options={promptState.options}
        value={promptValue}
        setValue={setPromptValue}
        error={promptError}
        setError={setPromptError}
        onSubmit={handlePromptSubmit}
        onCancel={handlePromptCancel}
      />

      <AlertDialog
        open={alertState.isOpen}
        onOpenChange={(open) => !open && handleAlertClose()}
        options={alertState.options}
        onConfirm={handleAlertClose}
      />
    </ConfirmContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

export function useConfirm(): ConfirmContextValue {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}

// =============================================================================
// Standalone Hook (without provider)
// =============================================================================

interface UseConfirmDialogOptions {
  defaultOpen?: boolean;
}

interface UseConfirmDialogReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  DialogProps: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  };
}

export function useConfirmDialog(
  options: UseConfirmDialogOptions = {}
): UseConfirmDialogReturn {
  const [isOpen, setIsOpen] = useState(options.defaultOpen ?? false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return {
    isOpen,
    open,
    close,
    DialogProps: {
      open: isOpen,
      onOpenChange: setIsOpen,
    },
  };
}
