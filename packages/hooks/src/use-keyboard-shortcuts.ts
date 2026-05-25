"use client";

import { useCallback, useEffect, useState } from "react";

export interface KeyboardShortcut {
  key: string;
  modifiers?: ("meta" | "ctrl" | "alt" | "shift")[];
  description: string;
  action: () => void;
  scope?: string;
  enabled?: boolean;
}

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

      const target = event.target instanceof HTMLElement ? event.target : null;
      const isInput =
        target !== null &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) continue;

        const modifiers = shortcut.modifiers || [];
        const metaOrCtrl =
          modifiers.includes("meta") || modifiers.includes("ctrl");
        const needsMeta = metaOrCtrl && (event.metaKey || event.ctrlKey);
        const needsAlt = modifiers.includes("alt")
          ? event.altKey
          : !event.altKey;
        const needsShift = modifiers.includes("shift")
          ? event.shiftKey
          : !event.shiftKey;

        if (modifiers.length === 0 && isInput) continue;

        const eventKey = event.key?.toLowerCase();
        const shortcutKey = shortcut.key?.toLowerCase();

        if (!eventKey || !shortcutKey) continue;

        const keyMatch = eventKey === shortcutKey;
        const modifiersMatch =
          (modifiers.length === 0 || (metaOrCtrl ? needsMeta : true)) &&
          needsAlt &&
          needsShift;

        if (keyMatch && modifiersMatch) {
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

export function formatShortcut(shortcut: KeyboardShortcut): string {
  const isMac =
    typeof navigator !== "undefined" && navigator.platform.includes("Mac");
  const modifiers = shortcut.modifiers || [];

  const parts: string[] = [];

  if (modifiers.includes("meta") || modifiers.includes("ctrl")) {
    parts.push(isMac ? "⌘" : "Ctrl");
  }
  if (modifiers.includes("alt")) {
    parts.push(isMac ? "⌥" : "Alt");
  }
  if (modifiers.includes("shift")) {
    parts.push(isMac ? "⇧" : "Shift");
  }

  parts.push(shortcut.key.toUpperCase());

  return parts.join(isMac ? "" : "+");
}
