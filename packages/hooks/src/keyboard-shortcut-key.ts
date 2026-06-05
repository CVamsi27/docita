import type { KeyboardShortcut } from "./keyboard-shortcut-types.js";

export function matchesShortcutKey(
  event: KeyboardEvent,
  shortcut: KeyboardShortcut,
): boolean {
  return event.key?.toLowerCase() === shortcut.key?.toLowerCase();
}
