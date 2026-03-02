"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

export interface GlobalShortcutContext {

  isInConsultation: boolean;
  consultationId?: string;

  onSaveConsultation?: () => void;
  onCompleteConsultation?: () => void;
  onNextTab?: () => void;
  onPrevTab?: () => void;
}

interface UseGlobalShortcutsOptions {
  context?: GlobalShortcutContext;
  enabled?: boolean;
}

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

      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      const hasModifier = event.metaKey || event.ctrlKey;

      if (event.key === "Escape") {
        return;
      }

      if (isInput && !hasModifier) return;

      if (hasModifier) {
        switch (event.key.toLowerCase()) {
          case "q":
            event.preventDefault();
            router.push("/consultation");
            break;

          case "s":
            if (isInConsultation && context?.onSaveConsultation) {
              event.preventDefault();
              context.onSaveConsultation();
              toast.success("Consultation saved", { duration: 2000 });
            }
            break;

          case "enter":
            if (isInConsultation && context?.onCompleteConsultation) {
              event.preventDefault();
              context.onCompleteConsultation();
            }
            break;

          case "]":
            if (isInConsultation && context?.onNextTab) {
              event.preventDefault();
              context.onNextTab();
            }
            break;

          case "[":
            if (isInConsultation && context?.onPrevTab) {
              event.preventDefault();
              context.onPrevTab();
            }
            break;
        }
        return;
      }

      switch (event.key.toLowerCase()) {
        case "n":
          if ((isOnQueue || isOnDashboard) && !isInput) {
            event.preventDefault();
            window.dispatchEvent(new CustomEvent("docita:next-patient"));
          }
          break;

        case "r":
          if (isOnQueue && !isInput) {
            event.preventDefault();
            window.dispatchEvent(new CustomEvent("docita:refresh-queue"));
          }
          break;
      }
    },
    [enabled, router, isInConsultation, isOnQueue, isOnDashboard, context],
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
