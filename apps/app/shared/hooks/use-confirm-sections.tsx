"use client";

import { ConfirmDialog } from "@/features/dialogs/components/ConfirmDialog";
import { PromptDialog } from "@/features/dialogs/components/PromptDialog";
import { AlertDialog } from "@/features/dialogs/components/AlertDialog";
import type {
  AlertOptions,
  ConfirmOptions,
  PromptOptions,
} from "@/features/dialogs/types";

export type {
  ConfirmOptions,
  PromptOptions,
  AlertOptions,
} from "@/features/dialogs/types";

export interface ConfirmState {
  isOpen: boolean;
  options: ConfirmOptions | null;
  resolve: ((value: boolean) => void) | null;
}

export interface PromptState {
  isOpen: boolean;
  options: PromptOptions | null;
  resolve: ((value: string | null) => void) | null;
}

export interface AlertState {
  isOpen: boolean;
  options: AlertOptions | null;
  resolve: (() => void) | null;
}

export interface ConfirmContextValue {
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

interface ConfirmDialogSectionProps {
  state: ConfirmState;
  typedConfirmation: string;
  onTypedConfirmationChange: (value: string) => void;
  onClose: (confirmed: boolean) => void;
}

export function ConfirmDialogSection({
  state,
  typedConfirmation,
  onTypedConfirmationChange,
  onClose,
}: ConfirmDialogSectionProps) {
  return (
    <ConfirmDialog
      open={state.isOpen}
      onOpenChange={(open) => !open && onClose(false)}
      options={state.options}
      onConfirm={() => onClose(true)}
      onCancel={() => onClose(false)}
      typedConfirmation={typedConfirmation}
      setTypedConfirmation={onTypedConfirmationChange}
    />
  );
}

interface PromptDialogSectionProps {
  state: PromptState;
  value: string;
  setValue: (value: string) => void;
  error: string | null;
  setError: (error: string | null) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function PromptDialogSection({
  state,
  value,
  setValue,
  error,
  setError,
  onSubmit,
  onCancel,
}: PromptDialogSectionProps) {
  return (
    <PromptDialog
      open={state.isOpen}
      onOpenChange={(open) => !open && onCancel()}
      options={state.options}
      value={value}
      setValue={setValue}
      error={error}
      setError={setError}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}

interface AlertDialogSectionProps {
  state: AlertState;
  onClose: () => void;
}

export function AlertDialogSection({
  state,
  onClose,
}: AlertDialogSectionProps) {
  return (
    <AlertDialog
      open={state.isOpen}
      onOpenChange={(open) => !open && onClose()}
      options={state.options}
      onConfirm={onClose}
    />
  );
}
