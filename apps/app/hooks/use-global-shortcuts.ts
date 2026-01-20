"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

export interface GlobalShortcutContext {
  // Consultation context
  isInConsultation: boolean;
  consultationId?: string;
  // Callbacks for consultation actions
  onSaveConsultation?: () => void;
  onCompleteConsultation?: () => void;
  onNextTab?: () => void;
  onPrevTab?: () => void;
}

interface UseGlobalShortcutsOptions {
  context?: GlobalShortcutContext;
  enabled?: boolean;
}

/**
 * Global keyboard shortcuts for doctors
 *
 * Navigation shortcuts:
 * - Cmd+K: Open command palette (handled by command-palette.tsx)
 * - Cmd+H: Go to Dashboard
 * - Cmd+P: Go to Patients
 * - Cmd+A: Go to Appointments
 * - Cmd+Q: Go to Consultation/Queue
 *
 * Consultation shortcuts (when in consultation):
 * - Cmd+S: Save current consultation
 * - Cmd+Enter: Complete consultation
 * - Cmd+]: Next tab
 * - Cmd+[: Previous tab
 *
 * Quick action shortcuts:
 * - N: Call next patient (when on queue/dashboard)
 * - Escape: Close current modal/dialog
 */
export function useGlobalShortcuts({
  context,
  enabled = true,
}: UseGlobalShortcutsOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();

  const isInConsultation = pathname?.startsWith("/consultation/") || false;
  const isOnQueue = pathname === "/consultation" || pathname === "/";
  const isOnDashboard = pathname === "/";

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs (unless with modifier)
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      const hasModifier = event.metaKey || event.ctrlKey;

      // Allow Escape to work everywhere
      if (event.key === "Escape") {
        // Escape is handled by individual dialogs/modals
        return;
      }

      // Skip shortcuts in inputs unless with modifier
      if (isInput && !hasModifier) return;

      // Cmd/Ctrl shortcuts
      if (hasModifier) {
        switch (event.key.toLowerCase()) {
          case "q":
            // Cmd+Q: Go to Queue
            event.preventDefault();
            router.push("/consultation");
            break;

          case "s":
            // Cmd+S: Save (in consultation)
            if (isInConsultation && context?.onSaveConsultation) {
              event.preventDefault();
              context.onSaveConsultation();
              toast.success("Consultation saved", { duration: 2000 });
            }
            break;

          case "enter":
            // Cmd+Enter: Complete consultation
            if (isInConsultation && context?.onCompleteConsultation) {
              event.preventDefault();
              context.onCompleteConsultation();
            }
            break;

          case "]":
            // Cmd+]: Next tab
            if (isInConsultation && context?.onNextTab) {
              event.preventDefault();
              context.onNextTab();
            }
            break;

          case "[":
            // Cmd+[: Previous tab
            if (isInConsultation && context?.onPrevTab) {
              event.preventDefault();
              context.onPrevTab();
            }
            break;
        }
        return;
      }

      // Non-modifier shortcuts (only work outside inputs)
      switch (event.key.toLowerCase()) {
        case "n":
          // N: Next patient (on queue or dashboard)
          if ((isOnQueue || isOnDashboard) && !isInput) {
            event.preventDefault();
            // Dispatch custom event for queue to handle
            window.dispatchEvent(new CustomEvent("docita:next-patient"));
          }
          break;

        case "r":
          // R: Refresh queue
          if (isOnQueue && !isInput) {
            event.preventDefault();
            window.dispatchEvent(new CustomEvent("docita:refresh-queue"));
          }
          break;
      }
    },
    [
      enabled,
      router,
      isInConsultation,
      isOnQueue,
      isOnDashboard,
      context,
    ],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return {
    isInConsultation,
    isOnQueue,
    isOnDashboard,
  };
}

/**
 * Keyboard shortcut hints component data
 */
export const SHORTCUT_HINTS = {
  global: [
    { keys: ["⌘", "K"], description: "Command palette" },
    { keys: ["⌘", "H"], description: "Dashboard" },
    { keys: ["⌘", "P"], description: "Patients" },
    { keys: ["⌘", "A"], description: "Appointments" },
    { keys: ["⌘", "Q"], description: "Today's Queue" },
  ],
  queue: [
    { keys: ["N"], description: "Next patient" },
    { keys: ["R"], description: "Refresh queue" },
  ],
  consultation: [
    { keys: ["⌘", "S"], description: "Save" },
    { keys: ["⌘", "↵"], description: "Complete" },
    { keys: ["⌘", "]"], description: "Next tab" },
    { keys: ["⌘", "["], description: "Previous tab" },
  ],
};
