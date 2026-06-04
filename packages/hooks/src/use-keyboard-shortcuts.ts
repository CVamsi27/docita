"use client";

import { useCallback, useEffect, useState } from "react";
import { formatShortcut } from "./keyboard-shortcut-format.js";
import { shouldRunShortcut } from "./keyboard-shortcut-match.js";
import type { KeyboardShortcut } from "./keyboard-shortcut-types.js";

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      for (const shortcut of shortcuts) {
        if (shouldRunShortcut(event, shortcut)) {
          event.preventDefault();
          event.stopPropagation();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts, enabled],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return {
    helpDialogOpen,
    setHelpDialogOpen,
    shortcuts: shortcuts.filter((s) => s.enabled !== false),
  };
}
export { formatShortcut };
export type { KeyboardShortcut };
