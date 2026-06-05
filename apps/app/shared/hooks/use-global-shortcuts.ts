"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  handleModifiedGlobalShortcut,
  handlePlainGlobalShortcut,
} from "./global-shortcut-actions";
import { isKeyboardInputTarget } from "./global-shortcut-target";
import type { GlobalShortcutContext } from "./global-shortcut-types";

export type { GlobalShortcutContext };

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
      const hasModifier = event.metaKey || event.ctrlKey;
      if (event.key === "Escape") return;
      const isInput = isKeyboardInputTarget(event.target);
      if (isInput && !hasModifier) return;

      if (hasModifier) {
        handleModifiedGlobalShortcut({
          event,
          router,
          isInConsultation,
          context,
        });
        return;
      }
      handlePlainGlobalShortcut({ event, isOnQueue, isOnDashboard });
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
