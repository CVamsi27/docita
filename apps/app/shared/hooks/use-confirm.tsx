"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import type {
  ConfirmOptions,
  PromptOptions,
  AlertOptions,
} from "@/features/dialogs/types";
import {
  ConfirmState,
  PromptState,
  AlertState,
  ConfirmContextValue,
  ConfirmDialogSection,
  PromptDialogSection,
  AlertDialogSection,
} from "./use-confirm-sections";

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

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
    [],
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
    [confirm],
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
    [confirm],
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
    [confirm],
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

      <ConfirmDialogSection
        state={confirmState}
        typedConfirmation={typedConfirmation}
        onTypedConfirmationChange={setTypedConfirmation}
        onClose={handleConfirmClose}
      />

      <PromptDialogSection
        state={promptState}
        value={promptValue}
        setValue={setPromptValue}
        error={promptError}
        setError={setPromptError}
        onSubmit={handlePromptSubmit}
        onCancel={handlePromptCancel}
      />

      <AlertDialogSection
        state={alertState}
        onClose={handleAlertClose}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}

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
  options: UseConfirmDialogOptions = {},
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
