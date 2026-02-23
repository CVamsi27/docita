/**
 * Enhanced Toast Notification System
 *
 * UI/UX IMPROVEMENTS:
 * - Typed toast helpers (success/error/warning/info)
 * - Action buttons for quick recovery
 * - Persistent notifications for critical errors
 * - Consistent API across the app
 *
 * Built on top of `sonner` (already used project-wide)
 */

"use client";

import React, { createContext, useCallback, useContext } from "react";
import { toast as sonnerToast } from "sonner";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  id?: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number; // 0 = persistent (Infinity)
  action?: ToastAction;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string, action?: ToastAction) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  dismiss: (id: string | number) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within EnhancedToastProvider");
  }
  return context;
}

export function EnhancedToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const showToast = useCallback((options: ToastOptions) => {
    const sonnerOptions = {
      id: options.id,
      description: options.description,
      duration: options.duration === 0 ? Infinity : (options.duration ?? 5000),
      action: options.action
        ? { label: options.action.label, onClick: options.action.onClick }
        : undefined,
    };

    switch (options.type) {
      case "success":
        sonnerToast.success(options.title, sonnerOptions);
        break;
      case "error":
        sonnerToast.error(options.title, {
          ...sonnerOptions,
          duration:
            sonnerOptions.duration === 5000 ? 7000 : sonnerOptions.duration,
        });
        break;
      case "warning":
        sonnerToast.warning(options.title, sonnerOptions);
        break;
      case "info":
        sonnerToast.info(options.title, sonnerOptions);
        break;
    }
  }, []);

  const success = useCallback(
    (title: string, description?: string) => {
      showToast({ type: "success", title, description });
    },
    [showToast],
  );

  const error = useCallback(
    (title: string, description?: string, action?: ToastAction) => {
      showToast({ type: "error", title, description, action, duration: 7000 });
    },
    [showToast],
  );

  const warning = useCallback(
    (title: string, description?: string) => {
      showToast({ type: "warning", title, description });
    },
    [showToast],
  );

  const info = useCallback(
    (title: string, description?: string) => {
      showToast({ type: "info", title, description });
    },
    [showToast],
  );

  const dismiss = useCallback((id: string | number) => {
    sonnerToast.dismiss(id);
  }, []);

  const dismissAll = useCallback(() => {
    sonnerToast.dismiss();
  }, []);

  const value: ToastContextValue = {
    showToast,
    success,
    error,
    warning,
    info,
    dismiss,
    dismissAll,
  };

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

/**
 * Usage Examples:
 *
 * const toast = useToast();
 *
 * // Success notification
 * toast.success('Appointment created', 'The appointment has been successfully scheduled.');
 *
 * // Error with retry action
 * toast.error(
 *   'Failed to save',
 *   'Could not save your changes. Please try again.',
 *   { label: 'Retry', onClick: () => saveChanges() }
 * );
 *
 * // Warning
 * toast.warning('Unsaved changes', 'You have unsaved changes that will be lost.');
 *
 * // Persistent notification (duration: 0)
 * toast.showToast({
 *   type: 'error',
 *   title: 'Subscription expired',
 *   description: 'Please renew your subscription to continue.',
 *   duration: 0,
 *   action: { label: 'Upgrade Plan', onClick: () => router.push('/upgrade') }
 * });
 */
