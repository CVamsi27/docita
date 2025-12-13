"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@/lib/design-system";

// =============================================================================
// Types
// =============================================================================

type ConfirmVariant = "default" | "destructive" | "warning" | "success";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: ReactNode;
  requireConfirmation?: string;
}

interface PromptOptions extends Omit<ConfirmOptions, "requireConfirmation"> {
  placeholder?: string;
  defaultValue?: string;
  inputType?: "text" | "email" | "password" | "number";
  validation?: (value: string) => string | null;
}

interface AlertOptions {
  title: string;
  description?: string;
  confirmText?: string;
  variant?: ConfirmVariant;
  icon?: ReactNode;
}

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
    options?: Partial<ConfirmOptions>,
  ) => Promise<boolean>;
  confirmDiscard: (options?: Partial<ConfirmOptions>) => Promise<boolean>;
  confirmAction: (
    action: string,
    options?: Partial<ConfirmOptions>,
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

  const getVariantStyles = (variant: ConfirmVariant = "default") => {
    switch (variant) {
      case "destructive":
        return "bg-red-600 hover:bg-red-700 text-white";
      case "warning":
        return "bg-yellow-600 hover:bg-yellow-700 text-white";
      case "success":
        return "bg-green-600 hover:bg-green-700 text-white";
      default:
        return "";
    }
  };

  const requiresTypedConfirmation = confirmState.options?.requireConfirmation;
  const confirmationMatches =
    !requiresTypedConfirmation ||
    typedConfirmation === requiresTypedConfirmation;

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

      {/* Confirm Dialog */}
      <Dialog
        open={confirmState.isOpen}
        onOpenChange={(open) => !open && handleConfirmClose(false)}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmState.options?.icon}
              {confirmState.options?.title}
            </DialogTitle>
            <DialogDescription>
              {confirmState.options?.description || ""}
            </DialogDescription>
          </DialogHeader>

          {requiresTypedConfirmation && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-2">
                Type <strong>{requiresTypedConfirmation}</strong> to confirm:
              </p>
              <Input
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                placeholder={requiresTypedConfirmation}
                autoFocus
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => handleConfirmClose(false)}>
              {confirmState.options?.cancelText || "Cancel"}
            </Button>
            <Button
              onClick={() => handleConfirmClose(true)}
              className={cn(getVariantStyles(confirmState.options?.variant))}
              disabled={!confirmationMatches}
            >
              {confirmState.options?.confirmText || "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prompt Dialog */}
      <Dialog
        open={promptState.isOpen}
        onOpenChange={(open) => !open && handlePromptCancel()}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {promptState.options?.icon}
              {promptState.options?.title}
            </DialogTitle>
            <DialogDescription>
              {promptState.options?.description || ""}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Input
              type={promptState.options?.inputType || "text"}
              value={promptValue}
              onChange={(e) => {
                setPromptValue(e.target.value);
                setPromptError(null);
              }}
              placeholder={promptState.options?.placeholder}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handlePromptSubmit();
                }
              }}
            />
            {promptError && (
              <p className="text-sm text-red-500 mt-1">{promptError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handlePromptCancel}>
              {promptState.options?.cancelText || "Cancel"}
            </Button>
            <Button
              onClick={handlePromptSubmit}
              className={cn(getVariantStyles(promptState.options?.variant))}
            >
              {promptState.options?.confirmText || "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog */}
      <Dialog
        open={alertState.isOpen}
        onOpenChange={(open) => !open && handleAlertClose()}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {alertState.options?.icon}
              {alertState.options?.title}
            </DialogTitle>
            <DialogDescription>
              {alertState.options?.description || ""}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              onClick={handleAlertClose}
              className={cn(getVariantStyles(alertState.options?.variant))}
            >
              {alertState.options?.confirmText || "OK"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

// =============================================================================
// Preset Confirm Dialogs Components
// =============================================================================

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemName: string;
  isLoading?: boolean;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  itemName,
  isLoading,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Delete {itemName}?</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this {itemName.toLowerCase()}? This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
            disabled={isLoading}
          >
            {isLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DiscardChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DiscardChangesDialog({
  open,
  onOpenChange,
  onConfirm,
}: DiscardChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Discard changes?</DialogTitle>
          <DialogDescription>
            You have unsaved changes. Are you sure you want to discard them?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep editing
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            Discard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
